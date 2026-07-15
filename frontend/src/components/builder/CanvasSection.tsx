"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockPreview } from "@/components/blocks";
import { blockDef } from "@/lib/blocks-schema";
import type { BuilderSection } from "./PageBuilder";

interface Props {
  section: BuilderSection;
  index: number;
  count: number;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (delta: -1 | 1) => void;
  onToggleVisible: () => void;
}

export function CanvasSection({ section, index, count, selected, onSelect, onRemove, onDuplicate, onMove, onToggleVisible }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: section.uid });
  const def = blockDef(section.block_type);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`group relative ${isDragging ? "z-10 opacity-40" : ""} ${isOver && !isDragging ? "ring-2 ring-cyan-300" : ""}`}
    >
      {/* Selection / hover outline */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 rounded-sm transition ${
          selected ? "ring-2 ring-inset ring-cyan-500" : "ring-1 ring-inset ring-transparent group-hover:ring-cyan-300"
        }`}
      />

      {/* Floating control bar */}
      <div
        className={`absolute -top-3 right-3 z-20 flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-1 py-0.5 shadow-md transition ${
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          className="cursor-grab rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
        >
          ⋮⋮
        </span>
        <span className="px-1 text-xs font-semibold text-slate-500">
          {def?.icon} {def?.label ?? section.block_type}
        </span>
        <button onClick={() => onMove(-1)} disabled={index === 0} title="Move up" className="rounded px-1.5 py-0.5 text-sm hover:bg-slate-100 disabled:opacity-25">
          ↑
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          title="Move down"
          className="rounded px-1.5 py-0.5 text-sm hover:bg-slate-100 disabled:opacity-25"
        >
          ↓
        </button>
        <button onClick={onToggleVisible} title={section.is_visible ? "Hide section" : "Show section"} className="rounded px-1.5 py-0.5 text-sm hover:bg-slate-100">
          {section.is_visible ? "👁️" : "🚫"}
        </button>
        <button onClick={onDuplicate} title="Duplicate" className="rounded px-1.5 py-0.5 text-sm hover:bg-slate-100">
          ⧉
        </button>
        <button
          onClick={() => {
            if (window.confirm(`Delete this ${def?.label ?? section.block_type} section?`)) onRemove();
          }}
          title="Delete"
          className="rounded px-1.5 py-0.5 text-sm text-red-500 hover:bg-red-50"
        >
          🗑
        </button>
      </div>

      {/* Live preview of the real block component; inert so clicks select instead of navigating */}
      <div className={`pointer-events-none select-none ${section.is_visible ? "" : "opacity-30 grayscale"}`}>
        <BlockPreview blockType={section.block_type} content={section.content} settings={section.settings} />
      </div>

      {!section.is_visible && (
        <span className="absolute left-3 top-2 z-10 rounded bg-slate-800/80 px-2 py-0.5 text-xs text-white">Hidden</span>
      )}
    </div>
  );
}
