"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { BLOCK_DEFS, blockDef } from "@/lib/blocks-schema";
import type { MediaApi } from "@/lib/media-api";
import { MediaPickerDialog } from "@/components/media/MediaPickerDialog";
import { Palette, PALETTE_PREFIX } from "./Palette";
import { CanvasSection } from "./CanvasSection";
import { Inspector } from "./Inspector";

export interface BuilderSection {
  /** Local key for React/dnd - server ids are not stable across saves. */
  uid: string;
  block_type: string;
  content: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  is_visible: boolean;
  global_block_id?: number | null;
}

export interface PageBuilderProps {
  pageTitle: string;
  pageStatus: string;
  initialSections: BuilderSection[];
  /** Persist the full ordered stack. Throw on failure. */
  onSave: (sections: BuilderSection[]) => Promise<void>;
  /** Optional: publish after save. */
  onPublish?: () => Promise<void>;
  backHref?: string;
  /** When provided, inspector image fields can browse the media library. */
  mediaApi?: MediaApi;
}

const DEVICE_WIDTHS = { desktop: "100%", tablet: "768px", mobile: "390px" } as const;
type Device = keyof typeof DEVICE_WIDTHS;

let uidCounter = 0;
export const newUid = () => `s${Date.now().toString(36)}_${uidCounter++}`;

export function PageBuilder({ pageTitle, pageStatus, initialSections, onSave, onPublish, backHref, mediaApi }: PageBuilderProps) {
  const [sections, setSectionsRaw] = useState<BuilderSection[]>(initialSections);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [activeDragUid, setActiveDragUid] = useState<string | null>(null);
  // Media picker: holds the setter of whichever image field opened it.
  const [pickerAssign, setPickerAssign] = useState<((url: string) => void) | null>(null);

  // --- Undo / redo (bounded history of section states) ---
  // IMPORTANT: history bookkeeping must stay OUTSIDE React state updaters -
  // StrictMode double-invokes updaters in dev, which would corrupt the stacks.
  // sectionsRef is the single source of truth for all mutations.
  const sectionsRef = useRef<BuilderSection[]>(initialSections);
  const past = useRef<BuilderSection[][]>([]);
  const future = useRef<BuilderSection[][]>([]);
  const [historyTick, setHistoryTick] = useState(0); // re-render enable/disable state of the buttons

  const setSections = useCallback((updater: (prev: BuilderSection[]) => BuilderSection[]) => {
    const prev = sectionsRef.current;
    const next = updater(prev);
    if (next === prev) return;
    past.current = [...past.current.slice(-49), prev];
    future.current = [];
    sectionsRef.current = next;
    setSectionsRaw(next);
    setHistoryTick((t) => t + 1);
    setDirty(true);
  }, []);

  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(sectionsRef.current);
    sectionsRef.current = prev;
    setSectionsRaw(prev);
    setHistoryTick((t) => t + 1);
    setDirty(true);
  };

  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(sectionsRef.current);
    sectionsRef.current = next;
    setSectionsRaw(next);
    setHistoryTick((t) => t + 1);
    setDirty(true);
  };

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Ctrl/Cmd+S saves, Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z undo/redo.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        void save();
      } else if (key === "z") {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return; // let fields handle their own undo
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  // --- Section operations ---

  const addBlock = useCallback(
    (type: string, index?: number) => {
      const def = blockDef(type);
      if (!def) return;
      const section: BuilderSection = {
        uid: newUid(),
        block_type: type,
        content: structuredClone(def.defaultContent),
        settings: def.defaultSettings ? structuredClone(def.defaultSettings) : null,
        is_visible: true,
      };
      setSections((prev) => {
        const next = [...prev];
        next.splice(index ?? prev.length, 0, section);
        return next;
      });
      setSelectedUid(section.uid);
    },
    [setSections]
  );

  const updateSection = useCallback(
    (uid: string, patch: Partial<BuilderSection>) => {
      setSections((prev) => prev.map((s) => (s.uid === uid ? { ...s, ...patch } : s)));
    },
    [setSections]
  );

  const removeSection = (uid: string) => {
    setSections((prev) => prev.filter((s) => s.uid !== uid));
    if (selectedUid === uid) setSelectedUid(null);
  };

  const duplicateSection = (uid: string) => {
    setSections((prev) => {
      const i = prev.findIndex((s) => s.uid === uid);
      if (i === -1) return prev;
      const copy = { ...structuredClone(prev[i]), uid: newUid() };
      const next = [...prev];
      next.splice(i + 1, 0, copy);
      return next;
    });
  };

  const moveSection = (uid: string, delta: -1 | 1) => {
    setSections((prev) => {
      const i = prev.findIndex((s) => s.uid === uid);
      const j = i + delta;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  // --- Drag and drop ---

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragUid(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragUid(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Dropping a palette block into the canvas inserts a new section at that position.
    if (activeId.startsWith(PALETTE_PREFIX)) {
      const type = activeId.slice(PALETTE_PREFIX.length);
      const overIndex = sections.findIndex((s) => s.uid === overId);
      addBlock(type, overIndex === -1 ? sections.length : overIndex);
      return;
    }

    if (activeId !== overId) {
      setSections((prev) => {
        const from = prev.findIndex((s) => s.uid === activeId);
        const to = prev.findIndex((s) => s.uid === overId);
        if (from === -1 || to === -1) return prev;
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    }
  };

  // --- Persistence ---

  const save = async (): Promise<boolean> => {
    if (saving) return false;
    setSaving(true);
    setStatusMsg(null);
    try {
      await onSave(sectionsRef.current);
      setDirty(false);
      setStatusMsg({ kind: "ok", text: "Saved" });
      setTimeout(() => setStatusMsg((m) => (m?.text === "Saved" ? null : m)), 2500);
      return true;
    } catch (e) {
      setStatusMsg({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!onPublish) return;
    if (!(await save())) return;
    setSaving(true);
    try {
      await onPublish();
      setStatusMsg({ kind: "ok", text: "Published 🎉" });
    } catch (e) {
      setStatusMsg({ kind: "err", text: e instanceof Error ? e.message : "Publish failed" });
    } finally {
      setSaving(false);
    }
  };

  const selected = sections.find((s) => s.uid === selectedUid) ?? null;
  const activeDragSection = useMemo(() => sections.find((s) => s.uid === activeDragUid), [sections, activeDragUid]);
  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;
  void historyTick;

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900">
      {/* ---- Toolbar ---- */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm">
        {backHref && (
          <a href={backHref} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" title="Back to pages">
            ← Back
          </a>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold">{pageTitle}</h1>
          <p className="text-xs text-slate-400 capitalize">{pageStatus}{dirty ? " · unsaved changes" : ""}</p>
        </div>

        <div className="mx-auto flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(Object.keys(DEVICE_WIDTHS) as Device[]).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize ${device === d ? "bg-white shadow" : "text-slate-500 hover:text-slate-900"}`}
            >
              {d === "desktop" ? "🖥️" : d === "tablet" ? "💻" : "📱"} {d}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="rounded-lg px-2 py-1 text-sm hover:bg-slate-100 disabled:opacity-30">
            ↩
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" className="rounded-lg px-2 py-1 text-sm hover:bg-slate-100 disabled:opacity-30">
            ↪
          </button>
          {statusMsg && (
            <span className={`text-xs font-medium ${statusMsg.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>{statusMsg.text}</span>
          )}
          <button
            onClick={() => void save()}
            disabled={saving || !dirty}
            className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {onPublish && (
            <button
              onClick={() => void publish()}
              disabled={saving}
              className="rounded-lg bg-cyan-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-40"
            >
              Publish
            </button>
          )}
        </div>
      </header>

      {/* ---- Workspace ---- */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex min-h-0 flex-1">
          {/* Palette */}
          <aside className="w-60 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3">
            <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Blocks</h2>
            <Palette onAdd={(type) => addBlock(type)} />
            <p className="mt-4 px-1 text-xs leading-relaxed text-slate-400">
              Click a block to add it, or drag it onto the page. Click a section on the page to edit its content.
            </p>
          </aside>

          {/* Canvas */}
          <main className="min-w-0 flex-1 overflow-y-auto p-6" onClick={() => setSelectedUid(null)}>
            <div
              className="mx-auto min-h-full rounded-xl bg-white shadow-lg ring-1 ring-slate-200 transition-[max-width]"
              style={{ maxWidth: DEVICE_WIDTHS[device] }}
              onClick={(e) => e.stopPropagation()}
            >
              {sections.length === 0 ? (
                <div className="flex h-96 flex-col items-center justify-center gap-3 text-slate-400">
                  <span className="text-4xl">🎨</span>
                  <p className="font-medium">Your page is empty</p>
                  <p className="text-sm">Click or drag a block from the left to start building.</p>
                </div>
              ) : (
                <SortableContext items={sections.map((s) => s.uid)} strategy={verticalListSortingStrategy}>
                  {sections.map((section, i) => (
                    <CanvasSection
                      key={section.uid}
                      section={section}
                      index={i}
                      count={sections.length}
                      selected={section.uid === selectedUid}
                      onSelect={() => setSelectedUid(section.uid)}
                      onRemove={() => removeSection(section.uid)}
                      onDuplicate={() => duplicateSection(section.uid)}
                      onMove={(d) => moveSection(section.uid, d)}
                      onToggleVisible={() => updateSection(section.uid, { is_visible: !section.is_visible })}
                    />
                  ))}
                </SortableContext>
              )}
            </div>
          </main>

          {/* Inspector */}
          <aside className="w-80 shrink-0 overflow-y-auto border-l border-slate-200 bg-white">
            {selected ? (
              <Inspector
                key={selected.uid}
                section={selected}
                onChange={(patch) => updateSection(selected.uid, patch)}
                onClose={() => setSelectedUid(null)}
                onBrowseImage={mediaApi ? (assign) => setPickerAssign(() => assign) : undefined}
              />
            ) : (
              <div className="p-6 text-sm text-slate-400">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Inspector</h2>
                Select a section on the page to edit its content and settings.
              </div>
            )}
          </aside>
        </div>

        <DragOverlay>
          {activeDragUid?.startsWith(PALETTE_PREFIX) ? (
            <div className="rounded-lg border border-cyan-300 bg-white px-3 py-2 text-sm font-medium shadow-lg">
              {blockDef(activeDragUid.slice(PALETTE_PREFIX.length))?.icon}{" "}
              {blockDef(activeDragUid.slice(PALETTE_PREFIX.length))?.label}
            </div>
          ) : activeDragSection ? (
            <div className="rounded-lg border border-cyan-300 bg-white px-3 py-2 text-sm font-medium shadow-lg opacity-90">
              {blockDef(activeDragSection.block_type)?.icon} {blockDef(activeDragSection.block_type)?.label ?? activeDragSection.block_type}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {mediaApi && pickerAssign && (
        <MediaPickerDialog
          api={mediaApi}
          onClose={() => setPickerAssign(null)}
          onPick={(item) => {
            pickerAssign(item.url);
            setPickerAssign(null);
          }}
        />
      )}
    </div>
  );
}

export { BLOCK_DEFS };
