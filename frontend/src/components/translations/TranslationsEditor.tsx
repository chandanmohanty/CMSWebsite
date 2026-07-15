"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { blockDef, getAtPath, setAtPath } from "@/lib/blocks-schema";
import { LOCALE_NAMES, localeName } from "@/lib/locales";
import type { TranslationBase, TranslationsApi } from "@/lib/translations-api";

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none";

/** One translatable text with its location: a page field or a path inside a section's content. */
interface Row {
  key: string; // unique row key
  scope: "page" | number; // page field or section id
  path: string; // page field name, or content dot-path / repeater path like items.0.title
  label: string;
  base: string;
  multiline: boolean;
}

/** Flatten a page + sections into translatable rows using the block schema. */
function buildRows(base: TranslationBase): Row[] {
  const rows: Row[] = [
    { key: "page:title", scope: "page", path: "title", label: "Page title", base: base.title, multiline: false },
  ];
  if (base.meta_title) rows.push({ key: "page:meta_title", scope: "page", path: "meta_title", label: "SEO meta title", base: base.meta_title, multiline: false });
  if (base.meta_description) rows.push({ key: "page:meta_description", scope: "page", path: "meta_description", label: "SEO meta description", base: base.meta_description, multiline: true });

  for (const section of base.sections) {
    if (section.global_block_id) continue; // global blocks are translated once, centrally (future)
    const def = blockDef(section.block_type);
    if (!def || !section.content) continue;

    for (const field of def.fields) {
      if (field.type !== "text" && field.type !== "textarea") continue;
      if (field.path.startsWith("settings.")) continue;
      const value = getAtPath(section.content, field.path);
      if (typeof value === "string" && value.trim()) {
        rows.push({
          key: `s${section.id}:${field.path}`,
          scope: section.id,
          path: field.path,
          label: `${def.label} — ${field.label}`,
          base: value,
          multiline: field.type === "textarea",
        });
      }
    }

    if (def.repeater) {
      const items = (getAtPath(section.content, def.repeater.path) as Record<string, string>[]) ?? [];
      items.forEach((item, i) => {
        for (const f of def.repeater!.fields) {
          if (f.type !== "text" && f.type !== "textarea") continue;
          const value = item[f.key];
          if (typeof value === "string" && value.trim()) {
            rows.push({
              key: `s${section.id}:${def.repeater!.path}.${i}.${f.key}`,
              scope: section.id,
              path: `${def.repeater!.path}.${i}.${f.key}`,
              label: `${def.label} — ${def.repeater!.itemLabel} ${i + 1} ${f.label}`,
              base: value,
              multiline: f.type === "textarea",
            });
          }
        }
      });
    }
  }

  return rows;
}

export function TranslationsEditor({ api, title = "Translations" }: { api: TranslationsApi; title?: string }) {
  const [defaultLocale, setDefaultLocale] = useState("en");
  const [locales, setLocales] = useState<string[]>([]);
  const [pages, setPages] = useState<{ id: number; title: string; slug: string }[]>([]);
  const [pageId, setPageId] = useState<number | null>(null);
  const [locale, setLocale] = useState("");
  const [base, setBase] = useState<TranslationBase | null>(null);
  const [values, setValues] = useState<Record<string, string>>({}); // row key -> translated text
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // "load" | "save" | "translate-all" | row key
  const [statusMsg, setStatusMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [addLocale, setAddLocale] = useState("");

  useEffect(() => {
    Promise.all([api.website(), api.pages()])
      .then(([site, pageList]) => {
        setDefaultLocale(site.default_locale);
        setLocales(site.locales.filter((l) => l !== site.default_locale));
        setPages(pageList);
        if (pageList.length > 0) setPageId(pageList[0].id);
      })
      .catch((e) => setStatusMsg({ kind: "err", text: e.message }));
  }, [api]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const rows = useMemo(() => (base ? buildRows(base) : []), [base]);

  // Load base + existing translation whenever the page/locale pair changes.
  const load = useCallback(() => {
    if (pageId == null || !locale) {
      setBase(null);
      return;
    }
    setBusy("load");
    setStatusMsg(null);
    api
      .get(pageId, locale)
      .then((payload) => {
        setBase(payload.base);
        const initial: Record<string, string> = {};
        for (const row of buildRows(payload.base)) {
          const existing =
            row.scope === "page"
              ? payload.translation.page?.[row.path]
              : getAtPath(payload.translation.sections[row.scope] ?? {}, row.path);
          if (typeof existing === "string") initial[row.key] = existing;
        }
        setValues(initial);
        setDirty(false);
      })
      .catch((e) => setStatusMsg({ kind: "err", text: e.message }))
      .finally(() => setBusy(null));
  }, [api, pageId, locale]);

  useEffect(load, [load]);

  const setValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  // --- Locale management ---

  const saveLocales = async (next: string[]) => {
    try {
      await api.updateLocales(next);
      setLocales(next.filter((l) => l !== defaultLocale));
      if (!next.includes(locale)) setLocale("");
    } catch (e) {
      setStatusMsg({ kind: "err", text: e instanceof Error ? e.message : "Could not update languages" });
    }
  };

  // --- AI translate ---

  const translateRow = async (row: Row) => {
    setBusy(row.key);
    try {
      setValue(row.key, (await api.translate(row.base, localeName(locale))).trim());
    } catch (e) {
      setStatusMsg({ kind: "err", text: e instanceof Error ? e.message : "Translation failed" });
    } finally {
      setBusy(null);
    }
  };

  const translateAllEmpty = async () => {
    setBusy("translate-all");
    setStatusMsg(null);
    try {
      for (const row of rows) {
        if ((values[row.key] ?? "").trim()) continue;
        setValue(row.key, (await api.translate(row.base, localeName(locale))).trim());
      }
    } catch (e) {
      setStatusMsg({ kind: "err", text: e instanceof Error ? e.message : "Translation failed" });
    } finally {
      setBusy(null);
    }
  };

  // --- Save ---

  const save = async () => {
    if (pageId == null || !locale || !base) return;
    setBusy("save");
    setStatusMsg(null);
    try {
      const page: Record<string, string> = {};
      const sections: Record<number, Record<string, unknown>> = {};

      for (const row of rows) {
        const value = (values[row.key] ?? "").trim();
        if (!value) continue; // untranslated fields fall back to the base language

        if (row.scope === "page") {
          page[row.path] = value;
        } else {
          if (!sections[row.scope]) {
            const sectionBase = base.sections.find((s) => s.id === row.scope);
            sections[row.scope] = structuredClone(sectionBase?.content ?? {}) as Record<string, unknown>;
          }
          sections[row.scope] = setAtPath(sections[row.scope], row.path, value);
        }
      }

      await api.save(pageId, locale, { page, sections });
      setDirty(false);
      setStatusMsg({ kind: "ok", text: "Saved — live site updated" });
      setTimeout(() => setStatusMsg((m) => (m?.kind === "ok" ? null : m)), 3000);
    } catch (e) {
      setStatusMsg({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setBusy(null);
    }
  };

  const translatedCount = rows.filter((r) => (values[r.key] ?? "").trim()).length;
  const addableLocales = Object.keys(LOCALE_NAMES).filter((l) => l !== defaultLocale && !locales.includes(l));

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Language manager */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="font-bold">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">Default language: <strong>{localeName(defaultLocale)}</strong>. Add the languages this website should be available in.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {locales.map((loc) => (
            <span key={loc} className="flex items-center gap-1 rounded-full bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-800">
              {localeName(loc)}
              <button
                onClick={() => {
                  if (window.confirm(`Remove ${localeName(loc)}? Its saved translations are kept but no longer served.`)) {
                    void saveLocales(locales.filter((l) => l !== loc));
                  }
                }}
                className="text-cyan-400 hover:text-cyan-800"
                title="Remove language"
              >
                ✕
              </button>
            </span>
          ))}
          <select
            value={addLocale}
            onChange={(e) => {
              if (e.target.value) {
                void saveLocales([...locales, e.target.value]);
                setAddLocale("");
              }
            }}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="">+ Add language…</option>
            {addableLocales.map((loc) => (
              <option key={loc} value={loc}>
                {localeName(loc)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Page + locale picker */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={pageId ?? ""} onChange={(e) => setPageId(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <select value={locale} onChange={(e) => setLocale(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
          <option value="">Choose language…</option>
          {locales.map((loc) => (
            <option key={loc} value={loc}>
              {localeName(loc)}
            </option>
          ))}
        </select>
        {base && (
          <span className="text-xs text-slate-400">
            {translatedCount}/{rows.length} fields translated
          </span>
        )}
        {statusMsg && <span className={`text-xs font-medium ${statusMsg.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>{statusMsg.text}</span>}
        <div className="ml-auto flex gap-2">
          {base && rows.length > 0 && (
            <button
              onClick={() => void translateAllEmpty()}
              disabled={busy !== null}
              className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-700 hover:bg-cyan-100 disabled:opacity-40"
            >
              {busy === "translate-all" ? "Translating…" : "✨ Translate empty fields"}
            </button>
          )}
          <button
            onClick={() => void save()}
            disabled={busy !== null || !dirty}
            className="rounded-lg bg-cyan-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-40"
          >
            {busy === "save" ? "Saving…" : "Save translations"}
          </button>
        </div>
      </div>

      {/* Field rows */}
      {!locale ? (
        <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400">
          {locales.length === 0 ? "Add a language above to start translating." : "Choose a language to start translating this page."}
        </div>
      ) : busy === "load" ? (
        <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.key} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{row.label}</span>
                <button
                  onClick={() => void translateRow(row)}
                  disabled={busy !== null}
                  className="rounded px-1.5 py-0.5 text-xs font-medium text-cyan-700 hover:bg-cyan-50 disabled:opacity-40"
                  title={`AI translate to ${localeName(locale)}`}
                >
                  {busy === row.key ? "…" : "✨ Translate"}
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <p className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-600">{row.base}</p>
                {row.multiline ? (
                  <textarea rows={3} value={values[row.key] ?? ""} placeholder={`${localeName(locale)} translation…`} onChange={(e) => setValue(row.key, e.target.value)} className={inputClass} />
                ) : (
                  <input value={values[row.key] ?? ""} placeholder={`${localeName(locale)} translation…`} onChange={(e) => setValue(row.key, e.target.value)} className={inputClass} />
                )}
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="p-8 text-center text-sm text-slate-400">This page has no translatable text yet.</p>}
        </div>
      )}
    </div>
  );
}
