"use client";

import { useEffect } from "react";
import { MediaLibrary } from "./MediaLibrary";
import type { MediaApi, MediaItem } from "@/lib/media-api";

interface Props {
  api: MediaApi;
  onPick: (item: MediaItem) => void;
  onClose: () => void;
}

/** Full media library in a modal - used as the image picker across the admin. */
export function MediaPickerDialog({ api, onPick, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <h2 className="text-sm font-bold">Choose from media library</h2>
          <button onClick={onClose} className="rounded px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Close (Esc)">
            ✕
          </button>
        </div>
        <MediaLibrary api={api} onPick={onPick} title="" />
      </div>
    </div>
  );
}
