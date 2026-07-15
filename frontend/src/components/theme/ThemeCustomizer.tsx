"use client";

import { useEffect, useMemo, useState } from "react";
import { BlockPreview } from "@/components/blocks";
import { FONT_OPTIONS, themeToCssVars, type ThemeSettings } from "@/lib/theme";
import type { DesignTokens } from "@/lib/types";

export interface ThemeApi {
  load(): Promise<{ theme: ThemeSettings; templateTokens: DesignTokens | null }>;
  save(theme: ThemeSettings): Promise<void>;
}

const WIDTH_OPTIONS = [
  { value: "", label: "Template default (1152px)" },
  { value: "960", label: "Narrow — 960px" },
  { value: "1152", label: "Standard — 1152px" },
  { value: "1280", label: "Wide — 1280px" },
  { value: "1400", label: "Extra wide — 1400px" },
];

const PREVIEW_SECTIONS = [
  {
    block_type: "hero",
    content: {
      heading: "Your headline, your style",
      subheading: "This live preview updates as you customize — colors, fonts, buttons and layout.",
      cta: { label: "Primary button", url: "#" },
    },
    settings: { variant: "compact" },
  },
  {
    block_type: "services_grid",
    content: {
      heading: "Cards & surfaces",
      items: [
        { title: "First service", text: "Body copy uses the muted text color." },
        { title: "Second service", text: "Card borders and surfaces follow the mode." },
        { title: "Third service", text: "Headings use your heading font." },
      ],
    },
    settings: null,
  },
  {
    block_type: "testimonials",
    content: { heading: "Alternate section background", items: [{ quote: "Quotes sit on surface cards.", name: "A happy customer" }] },
    settings: null,
  },
  {
    block_type: "cta",
    content: { heading: "Secondary color banner", cta: { label: "Accent button", url: "#" } },
    settings: null,
  },
];

/** Immutable deep-ish setter for the two-level theme object. */
function setTheme(theme: ThemeSettings, group: keyof ThemeSettings, key: string, value: unknown): ThemeSettings {
  if (group === "mode") return { ...theme, mode: value as ThemeSettings["mode"] };
  const groupValue = { ...(theme[group] as Record<string, unknown> | undefined), [key]: value };
  if (value === "" || value === undefined || value === null) delete groupValue[key];
  return { ...theme, [group]: groupValue };
}

function ColorRow({ label, value, fallback, onChange }: { label: string; value?: string; fallback: string; onChange: (v: string | null) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-sm">{label}</span>
      {value !== undefined && (
        <button onClick={() => onChange(null)} className="text-xs text-slate-400 hover:text-slate-700" title="Reset to default">
          reset
        </button>
      )}
      <input
        type="color"
        value={value ?? fallback}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
      />
      <input
        value={value ?? ""}
        placeholder={fallback}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-24 rounded-lg border border-slate-300 px-2 py-1 font-mono text-xs focus:border-cyan-500 focus:outline-none"
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-slate-200 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function ThemeCustomizer({ api, title = "Theme customizer" }: { api: ThemeApi; title?: string }) {
  const [theme, setThemeState] = useState<ThemeSettings | null>(null);
  const [templateTokens, setTemplateTokens] = useState<DesignTokens | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    api
      .load()
      .then(({ theme, templateTokens }) => {
        setThemeState(theme ?? {});
        setTemplateTokens(templateTokens);
      })
      .catch((e) => setStatusMsg({ kind: "err", text: e.message }));
  }, [api]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const update = (group: keyof ThemeSettings, key: string, value: unknown) => {
    setThemeState((prev) => setTheme(prev ?? {}, group, key, value));
    setDirty(true);
  };

  const save = async () => {
    if (!theme || saving) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      await api.save(theme);
      setDirty(false);
      setStatusMsg({ kind: "ok", text: "Saved — live site updated" });
      setTimeout(() => setStatusMsg((m) => (m?.kind === "ok" ? null : m)), 3000);
    } catch (e) {
      setStatusMsg({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    if (!window.confirm("Reset all theme customizations back to the template defaults?")) return;
    setThemeState({});
    setDirty(true);
  };

  const cssVars = useMemo(() => themeToCssVars(templateTokens, theme), [templateTokens, theme]);
  const fallback = (name: string) => cssVars[name];

  if (!theme) {
    return <div className="flex h-64 items-center justify-center text-slate-400">{statusMsg?.text ?? "Loading theme…"}</div>;
  }

  return (
    <div className="flex min-h-0 flex-1">
      {/* Settings panel */}
      <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <h1 className="font-bold">{title}</h1>
            {dirty && <p className="text-xs text-slate-400">Unsaved changes</p>}
          </div>
          <button
            onClick={() => void save()}
            disabled={saving || !dirty}
            className="rounded-lg bg-cyan-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        {statusMsg && (
          <p className={`px-4 pt-2 text-xs font-medium ${statusMsg.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>{statusMsg.text}</p>
        )}

        <Section title="Mode">
          <div className="flex rounded-lg bg-slate-100 p-1">
            {(["light", "dark"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => update("mode", "", mode)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                  (theme.mode ?? "light") === mode ? "bg-white shadow" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {mode === "light" ? "☀️" : "🌙"} {mode}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Colors">
          <ColorRow label="Primary" value={theme.colors?.primary} fallback={fallback("--color-primary")} onChange={(v) => update("colors", "primary", v)} />
          <ColorRow label="Secondary" value={theme.colors?.secondary} fallback={fallback("--color-secondary")} onChange={(v) => update("colors", "secondary", v)} />
          <ColorRow label="Accent" value={theme.colors?.accent} fallback={fallback("--color-accent")} onChange={(v) => update("colors", "accent", v)} />
          <ColorRow label="Page background" value={theme.colors?.background} fallback={fallback("--color-bg")} onChange={(v) => update("colors", "background", v)} />
          <ColorRow label="Text" value={theme.colors?.text} fallback={fallback("--color-text")} onChange={(v) => update("colors", "text", v)} />
        </Section>

        <Section title="Typography">
          <label className="block">
            <span className="mb-1 block text-sm">Heading font</span>
            <select
              value={theme.typography?.heading_font ?? ""}
              onChange={(e) => update("typography", "heading_font", e.target.value || null)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Body font</span>
            <select
              value={theme.typography?.body_font ?? ""}
              onChange={(e) => update("typography", "body_font", e.target.value || null)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 flex justify-between text-sm">
              <span>Base text size</span>
              <span className="text-slate-400">{theme.typography?.base_size ?? 16}px</span>
            </span>
            <input
              type="range"
              min={14}
              max={20}
              value={theme.typography?.base_size ?? 16}
              onChange={(e) => update("typography", "base_size", Number(e.target.value))}
              className="w-full accent-cyan-700"
            />
          </label>
        </Section>

        <Section title="Buttons">
          <label className="block">
            <span className="mb-1 flex justify-between text-sm">
              <span>Corner radius</span>
              <span className="text-slate-400">{theme.buttons?.radius ?? 8}px</span>
            </span>
            <input
              type="range"
              min={0}
              max={24}
              value={theme.buttons?.radius ?? 8}
              onChange={(e) => update("buttons", "radius", Number(e.target.value))}
              className="w-full accent-cyan-700"
            />
          </label>
        </Section>

        <Section title="Layout">
          <label className="block">
            <span className="mb-1 block text-sm">Content width</span>
            <select
              value={theme.layout?.max_width ? String(theme.layout.max_width) : ""}
              onChange={(e) => update("layout", "max_width", e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              {WIDTH_OPTIONS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>
        </Section>

        <div className="p-4">
          <button onClick={resetAll} className="w-full rounded-lg border border-red-200 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
            Reset everything to template defaults
          </button>
        </div>
      </aside>

      {/* Live preview */}
      <main className="min-w-0 flex-1 overflow-y-auto p-6">
        <p className="mb-3 text-center text-xs text-slate-400">Live preview — sample content rendered with your theme</p>
        <div className="mx-auto max-w-5xl overflow-hidden rounded-xl shadow-lg ring-1 ring-slate-200">
          <div className="themed" style={cssVars as React.CSSProperties} data-testid="theme-preview">
            {PREVIEW_SECTIONS.map((section, i) => (
              <BlockPreview key={i} blockType={section.block_type} content={section.content} settings={section.settings} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
