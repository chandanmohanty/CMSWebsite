"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatSize, thumbnailUrl, type MediaApi, type MediaFolderNode, type MediaItem } from "@/lib/media-api";

const TYPE_ICONS: Record<string, string> = {
  image: "🖼️",
  svg: "🎨",
  video: "🎬",
  audio: "🎵",
  pdf: "📕",
  document: "📄",
};

const TYPE_FILTERS = ["image", "svg", "video", "audio", "pdf", "document"];

interface Props {
  api: MediaApi;
  /** When set, items get a "Select" action and the library acts as a picker. */
  onPick?: (item: MediaItem) => void;
  title?: string;
  /** Pre-selected type filter (the picker uses this to show only videos, etc.). */
  initialType?: string;
}

export function MediaLibrary({ api, onPick, title = "Media library", initialType = "" }: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<MediaFolderNode[]>([]);
  const [currentFolder, setCurrentFolder] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(0); // number of files in flight
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadFolders = useCallback(() => {
    api.folders().then(setFolders).catch((e) => setError(e.message));
  }, [api]);

  const loadItems = useCallback(
    (pageNum: number, append: boolean) => {
      setLoading(true);
      api
        .list({ folder_id: currentFolder, type: typeFilter || undefined, search: debouncedSearch || undefined, page: pageNum })
        .then((res) => {
          setItems((prev) => (append ? [...prev, ...res.data] : res.data));
          setHasMore(res.hasMore);
          setPage(pageNum);
          setError(null);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    },
    [api, currentFolder, typeFilter, debouncedSearch]
  );

  useEffect(() => loadFolders(), [loadFolders]);
  useEffect(() => loadItems(1, false), [loadItems]);

  // --- Upload ---

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploading(files.length);
      setError(null);
      try {
        const created = await api.upload(files, currentFolder);
        setItems((prev) => [...created, ...prev]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(0);
      }
    },
    [api, currentFolder]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    void uploadFiles(Array.from(e.dataTransfer.files));
  };

  // --- Folders ---

  const createFolder = async (parentId: number | null) => {
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    try {
      await api.createFolder(name.trim(), parentId);
      loadFolders();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create folder");
    }
  };

  const removeFolder = async (id: number, name: string) => {
    if (!window.confirm(`Delete folder “${name}”? Files inside are kept and moved to All files.`)) return;
    try {
      await api.removeFolder(id);
      if (currentFolder === id) setCurrentFolder(null);
      loadFolders();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete folder");
    }
  };

  // --- Item actions ---

  const saveItem = async (item: MediaItem, patch: { alt?: string; folder_id?: number | null }) => {
    try {
      const updated = await api.update(item.id, patch);
      setItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, ...updated } : m)));
      setSelected((s) => (s?.id === item.id ? { ...s, ...updated } : s));
      // Moving to another folder removes it from the current view.
      if (patch.folder_id !== undefined && patch.folder_id !== currentFolder && currentFolder !== null) {
        setItems((prev) => prev.filter((m) => m.id !== item.id));
        setSelected(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  };

  const removeItem = async (item: MediaItem) => {
    if (!window.confirm(`Delete “${item.file_name}” permanently?`)) return;
    try {
      await api.remove(item.id);
      setItems((prev) => prev.filter((m) => m.id !== item.id));
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const allFolders = useMemo(() => {
    const flat: { id: number | null; name: string; depth: number }[] = [{ id: null, name: "All files", depth: 0 }];
    const walk = (nodes: MediaFolderNode[], depth: number) => {
      for (const node of nodes) {
        flat.push({ id: node.id, name: node.name, depth });
        if (node.children?.length) walk(node.children, depth + 1);
      }
    };
    walk(folders, 1);
    return flat;
  }, [folders]);

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col"
      onDragEnter={(e) => {
        e.preventDefault();
        if (++dragDepth.current === 1) setDragOver(true);
      }}
      onDragLeave={() => {
        if (--dragDepth.current === 0) setDragOver(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="mr-2 font-bold">{title}</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files…"
          className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm capitalize">
          <option value="">All types</option>
          {TYPE_FILTERS.map((t) => (
            <option key={t} value={t}>
              {TYPE_ICONS[t]} {t}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-2">
          {uploading > 0 && <span className="text-sm text-cyan-700">Uploading {uploading} file{uploading > 1 ? "s" : ""}…</span>}
          {error && <span className="max-w-72 truncate text-sm text-red-600" title={error}>{error}</span>}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading > 0}
            className="rounded-lg bg-cyan-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-40"
          >
            ⬆ Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              void uploadFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Folder sidebar */}
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-2">
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Folders</span>
            <button onClick={() => createFolder(null)} className="rounded px-1.5 text-sm text-cyan-700 hover:bg-cyan-50" title="New folder">
              +
            </button>
          </div>
          {allFolders.map((folder) => (
            <div
              key={folder.id ?? "root"}
              className={`group flex items-center rounded-lg px-2 py-1.5 text-sm ${
                currentFolder === folder.id ? "bg-cyan-50 font-semibold text-cyan-800" : "hover:bg-slate-50"
              }`}
              style={{ paddingLeft: `${8 + folder.depth * 14}px` }}
            >
              <button onClick={() => setCurrentFolder(folder.id)} className="flex-1 truncate text-left">
                {folder.id === null ? "🗂️" : "📁"} {folder.name}
              </button>
              {folder.id !== null && (
                <>
                  <button
                    onClick={() => createFolder(folder.id)}
                    className="rounded px-1 text-xs text-slate-400 opacity-0 hover:bg-slate-100 group-hover:opacity-100"
                    title="New subfolder"
                  >
                    +
                  </button>
                  <button
                    onClick={() => void removeFolder(folder.id!, folder.name)}
                    className="rounded px-1 text-xs text-red-400 opacity-0 hover:bg-red-50 group-hover:opacity-100"
                    title="Delete folder"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}
        </aside>

        {/* Grid */}
        <main className="relative min-w-0 flex-1 overflow-y-auto p-4">
          {dragOver && (
            <div className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-cyan-500 bg-cyan-50/90">
              <p className="text-lg font-semibold text-cyan-700">Drop files to upload</p>
            </div>
          )}

          {loading && items.length === 0 ? (
            <p className="p-8 text-center text-slate-400">Loading…</p>
          ) : items.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-400">
              <span className="text-4xl">📂</span>
              <p className="font-medium">No files here</p>
              <p className="text-sm">Drag &amp; drop files anywhere, or use the Upload button.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className={`group overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:shadow-md ${
                    selected?.id === item.id ? "border-cyan-500 ring-2 ring-cyan-200" : "border-slate-200"
                  }`}
                >
                  <div className="flex h-28 items-center justify-center bg-slate-50">
                    {item.type === "image" || item.type === "svg" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbnailUrl(item)} alt={item.alt ?? item.file_name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-4xl">{TYPE_ICONS[item.type] ?? "📄"}</span>
                    )}
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="truncate text-xs font-medium" title={item.file_name}>
                      {item.source === "ai" && <span title="AI generated">✨ </span>}
                      {item.file_name}
                    </p>
                    <p className="text-[11px] text-slate-400">{formatSize(item.size)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="mt-4 text-center">
              <button onClick={() => loadItems(page + 1, true)} disabled={loading} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40">
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </main>

        {/* Details panel */}
        {selected && (
          <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="truncate text-sm font-bold" title={selected.file_name}>
                {selected.file_name}
              </h2>
              <button onClick={() => setSelected(null)} className="rounded px-2 text-slate-400 hover:bg-slate-100" title="Close">
                ✕
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div className="flex items-center justify-center rounded-xl bg-slate-50 p-2">
                {selected.type === "image" || selected.type === "svg" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.url} alt={selected.alt ?? ""} className="max-h-52 rounded-lg object-contain" />
                ) : (
                  <span className="py-10 text-6xl">{TYPE_ICONS[selected.type] ?? "📄"}</span>
                )}
              </div>

              <dl className="space-y-1 text-xs text-slate-500">
                <div className="flex justify-between"><dt>Type</dt><dd className="font-medium text-slate-700">{selected.mime_type}</dd></div>
                <div className="flex justify-between"><dt>Size</dt><dd className="font-medium text-slate-700">{formatSize(selected.size)}</dd></div>
                {selected.width && selected.height && (
                  <div className="flex justify-between"><dt>Dimensions</dt><dd className="font-medium text-slate-700">{selected.width} × {selected.height}px</dd></div>
                )}
                {selected.source === "ai" && (
                  <div className="flex justify-between"><dt>Source</dt><dd className="font-medium text-slate-700">✨ AI generated</dd></div>
                )}
              </dl>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Alt text</span>
                <input
                  key={selected.id}
                  defaultValue={selected.alt ?? ""}
                  onBlur={(e) => {
                    if (e.target.value !== (selected.alt ?? "")) void saveItem(selected, { alt: e.target.value });
                  }}
                  placeholder="Describe this image…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Folder</span>
                <select
                  value={selected.folder_id ?? ""}
                  onChange={(e) => void saveItem(selected, { folder_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                >
                  {allFolders.map((f) => (
                    <option key={f.id ?? "root"} value={f.id ?? ""}>
                      {" ".repeat(f.depth * 2)}{f.id === null ? "All files (no folder)" : f.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-2">
                {onPick && (
                  <button onClick={() => onPick(selected)} className="flex-1 rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800">
                    ✓ Select
                  </button>
                )}
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(selected.url);
                  }}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Copy URL
                </button>
                <button onClick={() => void removeItem(selected)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
