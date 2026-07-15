import { adminFetch } from "./api";
import type { PageOption } from "./menu-api";

export interface TranslationBase {
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  sections: { id: number; block_type: string; content: Record<string, unknown> | null; global_block_id: number | null }[];
}

export interface TranslationPayload {
  base: TranslationBase;
  translation: {
    page: Record<string, string> | null;
    sections: Record<number, Record<string, unknown>>;
  };
}

export interface TranslationSave {
  page: Record<string, string>;
  sections: Record<number, Record<string, unknown>>;
}

export interface TranslationsApi {
  website(): Promise<{ default_locale: string; locales: string[] }>;
  updateLocales(locales: string[]): Promise<void>;
  pages(): Promise<PageOption[]>;
  get(pageId: number, locale: string): Promise<TranslationPayload>;
  save(pageId: number, locale: string, payload: TranslationSave): Promise<void>;
  /** AI-translate one text into the target language. */
  translate(text: string, language: string): Promise<string>;
}

export function realTranslationsApi(websiteId: string): TranslationsApi {
  return {
    async website() {
      const site = await adminFetch<{ default_locale: string; locales: string[] | null }>(`websites/${websiteId}`);
      return { default_locale: site.default_locale, locales: site.locales ?? [] };
    },

    async updateLocales(locales) {
      await adminFetch(`websites/${websiteId}`, { method: "PUT", body: JSON.stringify({ locales }) });
    },

    async pages() {
      const res = await adminFetch<{ data: PageOption[] }>(`websites/${websiteId}/pages?per_page=100`);
      return res.data.map((p) => ({ id: p.id, title: p.title, slug: p.slug }));
    },

    get: (pageId, locale) => adminFetch(`websites/${websiteId}/pages/${pageId}/translations/${encodeURIComponent(locale)}`),

    async save(pageId, locale, payload) {
      await adminFetch(`websites/${websiteId}/pages/${pageId}/translations/${encodeURIComponent(locale)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },

    async translate(text, language) {
      const res = await adminFetch<{ text: string }>("ai/generate-text", {
        method: "POST",
        body: JSON.stringify({
          task: "translate",
          input: text,
          website_id: Number(websiteId),
          context: { target_language: language },
        }),
      });
      return res.text;
    },
  };
}
