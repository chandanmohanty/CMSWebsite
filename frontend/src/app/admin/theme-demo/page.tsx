"use client";

import { useMemo } from "react";
import { ThemeCustomizer, type ThemeApi } from "@/components/theme/ThemeCustomizer";
import type { ThemeSettings } from "@/lib/theme";

/**
 * Theme customizer playground with an in-memory mock API - works without
 * the Laravel backend. Nothing is persisted.
 */
function createMockApi(): ThemeApi {
  let stored: ThemeSettings = {};

  return {
    async load() {
      await new Promise((r) => setTimeout(r, 250));
      return {
        theme: structuredClone(stored),
        templateTokens: {
          colors: { primary: "#0e7490", secondary: "#0f172a", accent: "#22d3ee" },
          typography: { heading: "Inter", body: "Inter" },
        },
      };
    },
    async save(theme) {
      await new Promise((r) => setTimeout(r, 400));
      stored = structuredClone(theme);
    },
  };
}

export default function ThemeDemo() {
  const api = useMemo(createMockApi, []);

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4">
        <a href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
          ← Dashboard
        </a>
        <span className="text-xs text-slate-400">Demo mode — nothing is persisted</span>
      </header>
      <ThemeCustomizer api={api} title="Theme (demo)" />
    </div>
  );
}
