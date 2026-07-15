"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MENU_LOCATIONS, type MenuApi, type MenuItemNode, type MenuRecord, type PageOption } from "@/lib/menu-api";

const MAX_DEPTH = 2; // 3 levels: 0, 1, 2 (matches what the renderer eager-loads)

/** Editor-internal flat representation: nesting expressed as depth. */
interface FlatItem {
  uid: string;
  depth: number;
  id?: number;
  label: string;
  url: string | null;
  page_id: number | null;
  target: string;
  icon: string | null;
  mega_menu?: unknown;
}

let uidCounter = 0;
const newUid = () => `m${Date.now().toString(36)}_${uidCounter++}`;

function flatten(nodes: MenuItemNode[], depth = 0): FlatItem[] {
  return nodes.flatMap((n) => [
    {
      uid: newUid(),
      depth: Math.min(depth, MAX_DEPTH),
      id: n.id,
      label: n.label,
      url: n.url ?? null,
      page_id: n.page_id ?? null,
      target: n.target ?? "_self",
      icon: n.icon ?? null,
      mega_menu: n.mega_menu,
    },
    ...flatten(n.children ?? [], depth + 1),
  ]);
}

function unflatten(flat: FlatItem[]): MenuItemNode[] {
  const root: MenuItemNode[] = [];
  const stack: MenuItemNode[] = [];
  for (const item of flat) {
    const node: MenuItemNode = {
      label: item.label,
      url: item.page_id ? null : item.url,
      page_id: item.page_id,
      target: item.target,
      icon: item.icon || null,
      mega_menu: item.mega_menu,
      children: [],
    };
    const depth = Math.min(item.depth, stack.length); // no orphan depths
    if (depth === 0) root.push(node);
    else stack[depth - 1].children.push(node);
    stack[depth] = node;
    stack.length = depth + 1;
  }
  return root;
}

/** Depths may only grow one step at a time and never exceed MAX_DEPTH. */
function normalizeDepths(flat: FlatItem[]): FlatItem[] {
  let prevDepth = -1;
  return flat.map((item) => {
    const depth = Math.max(0, Math.min(item.depth, prevDepth + 1, MAX_DEPTH));
    prevDepth = depth;
    return depth === item.depth ? item : { ...item, depth };
  });
}

const subtreeSize = (flat: FlatItem[], index: number): number => {
  let size = 1;
  while (index + size < flat.length && flat[index + size].depth > flat[index].depth) size++;
  return size;
};

// ---------- Sortable row ----------

interface RowProps {
  item: FlatItem;
  pages: PageOption[];
  expanded: boolean;
  isFirst: boolean;
  canIndent: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<FlatItem>) => void;
  onIndent: (delta: -1 | 1) => void;
  onAddChild: () => void;
  onRemove: () => void;
}

function MenuItemRow({ item, pages, expanded, isFirst, canIndent, onToggle, onChange, onIndent, onAddChild, onRemove }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.uid });
  const linkedPage = item.page_id ? pages.find((p) => p.id === item.page_id) : null;
  const linkSummary = linkedPage ? `📄 ${linkedPage.title}` : item.url ? `🔗 ${item.url}` : "— no link";
  const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, marginLeft: `${item.depth * 28}px` }}
      className={`rounded-lg border bg-white shadow-sm ${isDragging ? "z-10 opacity-50" : ""} ${expanded ? "border-cyan-300" : "border-slate-200"}`}
    >
      <div className="flex items-center gap-1 px-2 py-1.5">
        <span {...attributes} {...listeners} className="cursor-grab rounded px-1.5 py-1 text-slate-400 hover:bg-slate-100 active:cursor-grabbing" title="Drag to reorder">
          ⋮⋮
        </span>
        <button onClick={() => onIndent(-1)} disabled={item.depth === 0} className="rounded px-1 text-sm text-slate-400 hover:bg-slate-100 disabled:opacity-20" title="Outdent (make top-level)">
          ←
        </button>
        <button onClick={() => onIndent(1)} disabled={isFirst || !canIndent} className="rounded px-1 text-sm text-slate-400 hover:bg-slate-100 disabled:opacity-20" title="Indent (make sub-item)">
          →
        </button>
        <button onClick={onToggle} className="min-w-0 flex-1 truncate px-1 text-left text-sm font-medium hover:text-cyan-700">
          {item.icon && <span className="mr-1">{item.icon}</span>}
          {item.label || <span className="italic text-slate-400">Untitled</span>}
          <span className="ml-2 text-xs font-normal text-slate-400">{linkSummary}</span>
        </button>
        {item.depth < MAX_DEPTH && (
          <button onClick={onAddChild} className="rounded px-1.5 text-sm text-slate-400 hover:bg-slate-100" title="Add sub-item">
            +
          </button>
        )}
        <button onClick={onToggle} className="rounded px-1.5 text-sm text-slate-400 hover:bg-slate-100" title={expanded ? "Collapse" : "Edit"}>
          {expanded ? "▴" : "✎"}
        </button>
        <button onClick={onRemove} className="rounded px-1.5 text-sm text-red-400 hover:bg-red-50" title="Remove item (sub-items move up)">
          ✕
        </button>
      </div>

      {expanded && (
        <div className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Label</span>
            <input className={inputClass} value={item.label} onChange={(e) => onChange({ label: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Icon (optional emoji)</span>
            <input className={inputClass} value={item.icon ?? ""} placeholder="e.g. 🏠" onChange={(e) => onChange({ icon: e.target.value || null })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Links to</span>
            <select
              className={inputClass}
              value={item.page_id ? `page:${item.page_id}` : "custom"}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "custom") onChange({ page_id: null });
                else onChange({ page_id: Number(v.slice(5)), url: null });
              }}
            >
              <option value="custom">Custom URL…</option>
              {pages.map((p) => (
                <option key={p.id} value={`page:${p.id}`}>
                  Page: {p.title}
                </option>
              ))}
            </select>
          </label>
          {!item.page_id && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">Custom URL</span>
              <input className={inputClass} value={item.url ?? ""} placeholder="https://… or /path" onChange={(e) => onChange({ url: e.target.value })} />
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={item.target === "_blank"} onChange={(e) => onChange({ target: e.target.checked ? "_blank" : "_self" })} />
            Open in new tab
          </label>
        </div>
      )}
    </div>
  );
}

// ---------- Editor ----------

export function MenuEditor({ api, title = "Menus" }: { api: MenuApi; title?: string }) {
  const [menus, setMenus] = useState<MenuRecord[] | null>(null);
  const [pages, setPages] = useState<PageOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [items, setItems] = useState<FlatItem[]>([]);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState(MENU_LOCATIONS[0].value);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  useEffect(() => {
    api.menus().then((m) => {
      setMenus(m);
      if (m.length > 0) selectMenu(m[0], true);
    }).catch((e) => setStatusMsg({ kind: "err", text: e.message }));
    api.pages().then(setPages).catch(() => setPages([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const selectMenu = (menu: MenuRecord, force = false) => {
    if (!force && dirtyRef.current && !window.confirm("Discard unsaved changes to the current menu?")) return;
    setSelectedId(menu.id);
    setItems(flatten(menu.items ?? []));
    setExpandedUid(null);
    setDirty(false);
    setStatusMsg(null);
  };

  const mutate = useCallback((updater: (prev: FlatItem[]) => FlatItem[]) => {
    setItems((prev) => normalizeDepths(updater(prev)));
    setDirty(true);
  }, []);

  // --- Item operations ---

  const addItem = (partial?: Partial<FlatItem>) => {
    const item: FlatItem = {
      uid: newUid(),
      depth: 0,
      label: partial?.label ?? "New item",
      url: partial?.url ?? null,
      page_id: partial?.page_id ?? null,
      target: "_self",
      icon: null,
      ...partial,
    };
    mutate((prev) => [...prev, item]);
    setExpandedUid(item.uid);
  };

  const addChild = (parentUid: string) => {
    mutate((prev) => {
      const i = prev.findIndex((x) => x.uid === parentUid);
      if (i === -1) return prev;
      const size = subtreeSize(prev, i);
      const child: FlatItem = { uid: newUid(), depth: Math.min(prev[i].depth + 1, MAX_DEPTH), label: "New item", url: null, page_id: null, target: "_self", icon: null };
      setExpandedUid(child.uid);
      const next = [...prev];
      next.splice(i + size, 0, child);
      return next;
    });
  };

  const updateItem = (uid: string, patch: Partial<FlatItem>) => {
    mutate((prev) => prev.map((x) => (x.uid === uid ? { ...x, ...patch } : x)));
  };

  const removeItem = (uid: string) => {
    // Children survive: they shift up one level rather than being deleted.
    mutate((prev) => {
      const i = prev.findIndex((x) => x.uid === uid);
      if (i === -1) return prev;
      const size = subtreeSize(prev, i);
      const descendants = prev.slice(i + 1, i + size).map((x) => ({ ...x, depth: x.depth - 1 }));
      return [...prev.slice(0, i), ...descendants, ...prev.slice(i + size)];
    });
  };

  const indentItem = (uid: string, delta: -1 | 1) => {
    // The whole subtree shifts with its root.
    mutate((prev) => {
      const i = prev.findIndex((x) => x.uid === uid);
      if (i === -1) return prev;
      const size = subtreeSize(prev, i);
      const rootDepth = prev[i].depth + delta;
      if (rootDepth < 0 || rootDepth > MAX_DEPTH) return prev;
      // Indenting requires a possible parent: the previous item must sit at least one level above the new depth.
      if (delta === 1 && (i === 0 || prev[i - 1].depth + 1 < rootDepth)) return prev;
      return prev.map((x, idx) => (idx >= i && idx < i + size ? { ...x, depth: Math.min(Math.max(x.depth + delta, 0), MAX_DEPTH) } : x));
    });
  };

  // --- Drag and drop (subtree-aware) ---

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    mutate((prev) => {
      const from = prev.findIndex((x) => x.uid === active.id);
      const overIndexOriginal = prev.findIndex((x) => x.uid === over.id);
      if (from === -1 || overIndexOriginal === -1) return prev;

      const size = subtreeSize(prev, from);
      // Dropping onto one of your own descendants is a no-op.
      if (overIndexOriginal > from && overIndexOriginal < from + size) return prev;

      const block = prev.slice(from, from + size);
      const rest = [...prev.slice(0, from), ...prev.slice(from + size)];
      let insertAt = rest.findIndex((x) => x.uid === over.id);
      if (from < overIndexOriginal) insertAt += 1; // moving down lands after the item it was dropped on

      const prevItem = rest[insertAt - 1];
      const newRootDepth = Math.min(block[0].depth, prevItem ? prevItem.depth + 1 : 0, MAX_DEPTH);
      const delta = newRootDepth - block[0].depth;
      const adjusted = block.map((x) => ({ ...x, depth: Math.min(Math.max(x.depth + delta, 0), MAX_DEPTH) }));

      return [...rest.slice(0, insertAt), ...adjusted, ...rest.slice(insertAt)];
    });
  };

  // --- Menu CRUD + save ---

  const createMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const menu = await api.createMenu(newName.trim(), newLocation);
      setMenus((prev) => [...(prev ?? []), menu]);
      setNewName("");
      selectMenu(menu);
    } catch (err) {
      setStatusMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not create menu" });
    }
  };

  const deleteMenu = async (menu: MenuRecord) => {
    if (!window.confirm(`Delete menu “${menu.name}” and all its items?`)) return;
    try {
      await api.deleteMenu(menu.id);
      setMenus((prev) => (prev ?? []).filter((m) => m.id !== menu.id));
      if (selectedId === menu.id) {
        setSelectedId(null);
        setItems([]);
        setDirty(false);
      }
    } catch (err) {
      setStatusMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not delete menu" });
    }
  };

  const save = async () => {
    if (selectedId == null || saving) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const updated = await api.saveItems(selectedId, unflatten(items));
      setMenus((prev) => (prev ?? []).map((m) => (m.id === selectedId ? { ...m, items: updated.items ?? unflatten(items) } : m)));
      setDirty(false);
      setStatusMsg({ kind: "ok", text: "Saved" });
      setTimeout(() => setStatusMsg((m) => (m?.text === "Saved" ? null : m)), 2500);
    } catch (err) {
      setStatusMsg({ kind: "err", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const selectedMenu = useMemo(() => menus?.find((m) => m.id === selectedId) ?? null, [menus, selectedId]);
  const locationLabel = (loc: string) => MENU_LOCATIONS.find((l) => l.value === loc)?.label ?? loc;

  return (
    <div className="flex min-h-0 flex-1">
      {/* Menu list */}
      <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h1 className="font-bold">{title}</h1>
        </div>
        <div className="flex-1 p-2">
          {menus === null && <p className="p-2 text-sm text-slate-400">Loading…</p>}
          {menus?.length === 0 && <p className="p-2 text-sm text-slate-400">No menus yet — create your first one below.</p>}
          {menus?.map((menu) => (
            <div key={menu.id} className={`group flex items-center rounded-lg px-3 py-2 ${selectedId === menu.id ? "bg-cyan-50" : "hover:bg-slate-50"}`}>
              <button onClick={() => selectMenu(menu)} className="min-w-0 flex-1 text-left">
                <p className={`truncate text-sm font-semibold ${selectedId === menu.id ? "text-cyan-800" : ""}`}>{menu.name}</p>
                <p className="truncate text-xs text-slate-400">{locationLabel(menu.location)}</p>
              </button>
              <button onClick={() => void deleteMenu(menu)} className="rounded px-1.5 text-sm text-red-400 opacity-0 hover:bg-red-50 group-hover:opacity-100" title="Delete menu">
                ✕
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={createMenu} className="space-y-2 border-t border-slate-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">New menu</p>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Menu name"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
          />
          <select value={newLocation} onChange={(e) => setNewLocation(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            {MENU_LOCATIONS.map((l) => (
              <option key={l.value} value={l.value} disabled={menus?.some((m) => m.location === l.value)}>
                {l.label}
                {menus?.some((m) => m.location === l.value) ? " (in use)" : ""}
              </option>
            ))}
          </select>
          <button disabled={!newName.trim()} className="w-full rounded-lg bg-cyan-700 py-1.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-40">
            + Create menu
          </button>
        </form>
      </aside>

      {/* Item editor */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        {!selectedMenu ? (
          <div className="flex h-64 items-center justify-center text-slate-400">Select or create a menu to edit its items.</div>
        ) : (
          <div className="mx-auto max-w-3xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-bold">{selectedMenu.name}</h2>
                <p className="text-xs text-slate-400">
                  {locationLabel(selectedMenu.location)}
                  {dirty ? " · unsaved changes" : ""}
                </p>
              </div>
              {statusMsg && <span className={`text-xs font-medium ${statusMsg.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>{statusMsg.text}</span>}
              <button
                onClick={() => void save()}
                disabled={saving || !dirty}
                className="rounded-lg bg-cyan-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save menu"}
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                <p className="font-medium">This menu is empty</p>
                <p className="text-sm">Add pages or custom links below.</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map((i) => i.uid)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {items.map((item, i) => (
                      <MenuItemRow
                        key={item.uid}
                        item={item}
                        pages={pages}
                        expanded={expandedUid === item.uid}
                        isFirst={i === 0}
                        canIndent={i > 0 && items[i - 1].depth + 1 > item.depth && item.depth < MAX_DEPTH}
                        onToggle={() => setExpandedUid(expandedUid === item.uid ? null : item.uid)}
                        onChange={(patch) => updateItem(item.uid, patch)}
                        onIndent={(d) => indentItem(item.uid, d)}
                        onAddChild={() => addChild(item.uid)}
                        onRemove={() => removeItem(item.uid)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={() => addItem()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
                + Custom link
              </button>
              <select
                value=""
                onChange={(e) => {
                  const page = pages.find((p) => p.id === Number(e.target.value));
                  if (page) addItem({ label: page.title, page_id: page.id });
                }}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="" disabled>
                  + Add page…
                </option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <p className="w-full text-xs text-slate-400">
                Drag ⋮⋮ to reorder (sub-items move with their parent). Use → to nest an item under the one above it, ← to un-nest. Up to 3 levels.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
