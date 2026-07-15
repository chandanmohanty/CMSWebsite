"use client";

import { useDraggable } from "@dnd-kit/core";
import { BLOCK_DEFS } from "@/lib/blocks-schema";

export const PALETTE_PREFIX = "palette:";

function PaletteItem({ type, icon, label, description, onAdd }: { type: string; icon: string; label: string; description: string; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `${PALETTE_PREFIX}${type}` });

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onAdd}
      title={description}
      className={`flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium transition hover:border-cyan-400 hover:bg-cyan-50 active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <span aria-hidden>{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="cursor-grab text-slate-300" aria-hidden>
        ⋮⋮
      </span>
    </button>
  );
}

export function Palette({ onAdd }: { onAdd: (type: string) => void }) {
  return (
    <div className="space-y-2">
      {BLOCK_DEFS.map((def) => (
        <PaletteItem key={def.type} type={def.type} icon={def.icon} label={def.label} description={def.description} onAdd={() => onAdd(def.type)} />
      ))}
    </div>
  );
}
