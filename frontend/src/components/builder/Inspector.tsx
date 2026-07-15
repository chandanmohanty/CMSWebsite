"use client";

import { useState } from "react";
import { blockDef, getAtPath, setAtPath, type FieldDef } from "@/lib/blocks-schema";
import type { BuilderSection } from "./PageBuilder";

interface Props {
  section: BuilderSection;
  onChange: (patch: Partial<BuilderSection>) => void;
  onClose: () => void;
  /** When provided, image fields get a "Browse" button that opens the media picker. */
  onBrowseImage?: (assign: (url: string) => void) => void;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

/** URL input + thumbnail + optional media-library browse button. */
function ImageInput({
  value,
  placeholder,
  onChange,
  onBrowse,
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  onBrowse?: (assign: (url: string) => void) => void;
}) {
  return (
    <div>
      <div className="flex gap-1.5">
        <input className={inputClass} value={value} placeholder={placeholder ?? "https://… or pick from library"} onChange={(e) => onChange(e.target.value)} />
        {onBrowse && (
          <button
            type="button"
            onClick={() => onBrowse(onChange)}
            className="shrink-0 rounded-lg border border-slate-300 px-2.5 text-sm hover:border-cyan-400 hover:bg-cyan-50"
            title="Choose from media library"
          >
            📁
          </button>
        )}
      </div>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mt-2 h-20 w-full rounded-lg border border-slate-200 object-cover" />
      )}
    </div>
  );
}

export function Inspector({ section, onChange, onClose, onBrowseImage }: Props) {
  const def = blockDef(section.block_type);
  const [openItem, setOpenItem] = useState<number | null>(null);

  if (!def) {
    return <div className="p-6 text-sm text-slate-400">No editor available for “{section.block_type}”.</div>;
  }

  /** Field paths starting with "settings." write to section.settings, everything else to content. */
  const readField = (field: FieldDef): string => {
    const value = field.path.startsWith("settings.")
      ? getAtPath(section.settings, field.path.slice("settings.".length))
      : getAtPath(section.content, field.path);
    return typeof value === "string" ? value : "";
  };

  const writeField = (field: FieldDef, value: string) => {
    if (field.path.startsWith("settings.")) {
      onChange({ settings: setAtPath(section.settings, field.path.slice("settings.".length), value) });
    } else {
      onChange({ content: setAtPath(section.content, field.path, value) });
    }
  };

  // --- Repeater helpers ---
  const repeater = def.repeater;
  const items: Record<string, string>[] = repeater ? ((getAtPath(section.content, repeater.path) as Record<string, string>[]) ?? []) : [];

  const writeItems = (next: Record<string, string>[]) => {
    if (!repeater) return;
    onChange({ content: setAtPath(section.content, repeater.path, next) });
  };

  const updateItem = (index: number, key: string, value: string) => {
    writeItems(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const addItem = () => {
    if (!repeater) return;
    writeItems([...items, { ...repeater.newItem }]);
    setOpenItem(items.length);
  };

  const removeItem = (index: number) => {
    writeItems(items.filter((_, i) => i !== index));
    setOpenItem(null);
  };

  const moveItem = (index: number, delta: -1 | 1) => {
    const j = index + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[index], next[j]] = [next[j], next[index]];
    writeItems(next);
    setOpenItem(j);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-bold">
          {def.icon} {def.label}
        </h2>
        <button onClick={onClose} className="rounded px-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Close">
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {def.fields.map((field) => (
          <label key={field.path} className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">{field.label}</span>
            {field.type === "textarea" ? (
              <textarea rows={5} className={inputClass} value={readField(field)} placeholder={field.placeholder} onChange={(e) => writeField(field, e.target.value)} />
            ) : field.type === "select" ? (
              <select className={inputClass} value={readField(field)} onChange={(e) => writeField(field, e.target.value)}>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === "image" ? (
              <ImageInput value={readField(field)} placeholder={field.placeholder} onChange={(v) => writeField(field, v)} onBrowse={onBrowseImage} />
            ) : (
              <input
                type="text"
                className={inputClass}
                value={readField(field)}
                placeholder={field.placeholder}
                onChange={(e) => writeField(field, e.target.value)}
              />
            )}
          </label>
        ))}

        {repeater && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">{repeater.label}</span>
              <button onClick={addItem} className="rounded-lg bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-100">
                + Add {repeater.itemLabel}
              </button>
            </div>

            <div className="space-y-2">
              {items.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">No {repeater.label.toLowerCase()} yet.</p>}
              {items.map((item, i) => (
                <div key={i} className="rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <button onClick={() => setOpenItem(openItem === i ? null : i)} className="flex-1 truncate text-left text-sm font-medium hover:text-cyan-700">
                      {item[repeater.titleField] || `${repeater.itemLabel} ${i + 1}`}
                    </button>
                    <button onClick={() => moveItem(i, -1)} disabled={i === 0} className="rounded px-1 text-xs hover:bg-slate-100 disabled:opacity-25" title="Move up">
                      ↑
                    </button>
                    <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} className="rounded px-1 text-xs hover:bg-slate-100 disabled:opacity-25" title="Move down">
                      ↓
                    </button>
                    <button onClick={() => removeItem(i)} className="rounded px-1 text-xs text-red-500 hover:bg-red-50" title="Remove">
                      ✕
                    </button>
                  </div>
                  {openItem === i && (
                    <div className="space-y-3 border-t border-slate-100 p-3">
                      {repeater.fields.map((f) => (
                        <label key={f.key} className="block">
                          <span className="mb-1 block text-xs font-semibold text-slate-600">{f.label}</span>
                          {f.type === "textarea" ? (
                            <textarea rows={3} className={inputClass} value={item[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => updateItem(i, f.key, e.target.value)} />
                          ) : f.type === "image" ? (
                            <ImageInput value={item[f.key] ?? ""} placeholder={f.placeholder} onChange={(v) => updateItem(i, f.key, v)} onBrowse={onBrowseImage} />
                          ) : (
                            <input className={inputClass} value={item[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => updateItem(i, f.key, e.target.value)} />
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 p-3 text-xs text-slate-400">Changes apply to the preview instantly — remember to Save.</div>
    </div>
  );
}
