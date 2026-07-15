"use client";

import { useMemo } from "react";
import { TranslationsEditor } from "@/components/translations/TranslationsEditor";
import type { TranslationSave, TranslationsApi } from "@/lib/translations-api";

/**
 * Translations playground with an in-memory mock API - works without the
 * Laravel backend. AI translate produces pseudo-translations. Nothing is
 * persisted.
 */
function createMockApi(): TranslationsApi {
  let locales = ["fr"];
  const saved: Record<string, TranslationSave> = {};

  const base = {
    title: "Home",
    meta_title: "Compassionate care | Demo Clinic",
    meta_description: "World-class healthcare for the whole family.",
    sections: [
      {
        id: 1,
        block_type: "hero",
        global_block_id: null,
        content: {
          heading: "Compassionate care, advanced medicine",
          subheading: "Serving our community with world-class healthcare.",
          cta: { label: "Book an appointment", url: "/contact" },
        },
      },
      {
        id: 2,
        block_type: "services_grid",
        global_block_id: null,
        content: {
          heading: "Our departments",
          items: [
            { title: "Cardiology", text: "Complete heart care from prevention to surgery." },
            { title: "Pediatrics", text: "Specialist care for children of every age." },
          ],
        },
      },
    ],
  };

  const delay = <T,>(value: T): Promise<T> => new Promise((r) => setTimeout(() => r(value), 300));

  return {
    website: () => delay({ default_locale: "en", locales: ["en", ...locales] }),

    async updateLocales(next) {
      locales = next.filter((l) => l !== "en");
      await delay(undefined);
    },

    pages: () => delay([{ id: 1, title: "Home", slug: "" }, { id: 2, title: "About us", slug: "about" }]),

    async get(pageId, locale) {
      const key = `${pageId}:${locale}`;
      return delay({
        base: structuredClone(base),
        translation: {
          page: saved[key]?.page ?? null,
          sections: saved[key]?.sections ?? {},
        },
      });
    },

    async save(pageId, locale, payload) {
      saved[`${pageId}:${locale}`] = structuredClone(payload);
      await delay(undefined);
    },

    async translate(text, language) {
      await delay(undefined);
      return `[${language}] ${text}`;
    },
  };
}

export default function TranslationsDemo() {
  const api = useMemo(createMockApi, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex h-12 items-center gap-4 border-b border-slate-200 bg-white px-4">
        <a href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
          ← Dashboard
        </a>
        <span className="text-xs text-slate-400">Demo mode — AI translate is simulated, nothing is persisted</span>
      </header>
      <TranslationsEditor api={api} title="Translations (demo)" />
    </div>
  );
}
