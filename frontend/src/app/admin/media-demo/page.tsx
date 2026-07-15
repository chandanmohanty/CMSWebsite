"use client";

import { useMemo } from "react";
import { MediaLibrary } from "@/components/media/MediaLibrary";
import { createMockMediaApi } from "@/lib/media-mock";

/**
 * Media library playground with an in-memory mock API - works without the
 * Laravel backend. Uploads use object URLs so real local files preview
 * instantly; nothing is persisted.
 */
export default function MediaDemo() {
  const api = useMemo(createMockMediaApi, []);

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4">
        <a href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
          ← Dashboard
        </a>
        <span className="text-xs text-slate-400">Demo mode — nothing is persisted</span>
      </header>
      <MediaLibrary api={api} title="Media library (demo)" />
    </div>
  );
}
