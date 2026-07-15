"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, adminFetch } from "@/lib/api";
import { realMediaApi } from "@/lib/media-api";
import { themeToCssVars, type ThemeSettings } from "@/lib/theme";
import type { SitePayload } from "@/lib/types";
import { Header } from "@/components/site/Header";
import { MediaPickerDialog } from "@/components/media/MediaPickerDialog";

interface CtaState {
  enabled: boolean;
  label: string;
  url: string;
}

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none";

function CtaFields({ title, value, onChange }: { title: string; value: CtaState; onChange: (v: CtaState) => void }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={value.enabled} onChange={(e) => onChange({ ...value, enabled: e.target.checked })} />
        {title}
      </label>
      {value.enabled && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Button text</span>
            <input className={inputClass} value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Link</span>
            <input className={inputClass} value={value.url} placeholder="/contact" onChange={(e) => onChange({ ...value, url: e.target.value })} />
          </label>
        </div>
      )}
    </div>
  );
}

export default function HeaderSettingsPage({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = use(params);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [siteBase, setSiteBase] = useState<SitePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickingLogo, setPickingLogo] = useState(false);

  // Form state
  const [style, setStyle] = useState<"light" | "dark">("light");
  const [sticky, setSticky] = useState(true);
  const [logoUrl, setLogoUrl] = useState("");
  const [cta, setCta] = useState<CtaState>({ enabled: false, label: "", url: "" });
  const [secondaryCta, setSecondaryCta] = useState<CtaState>({ enabled: false, label: "", url: "" });
  const [showLanguage, setShowLanguage] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cms_token")) {
      router.replace("/admin/login");
      return;
    }
    setReady(true);

    (async () => {
      try {
        const site = await adminFetch<{ slug: string }>(`websites/${websiteId}`);
        // The public payload has exactly the shape the Header renders from (menus resolved, settings whitelisted).
        const res = await fetch(`${API_URL}/api/public/site?site=${encodeURIComponent(site.slug)}&preview=1`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${localStorage.getItem("cms_token")}` },
        });
        if (!res.ok) throw new Error(`Could not load site preview (${res.status})`);
        const payload = (await res.json()) as SitePayload;
        setSiteBase(payload);

        const header = (payload.settings.header ?? {}) as Record<string, unknown>;
        const headerCta = (header.cta ?? {}) as { label?: string; url?: string; enabled?: boolean };
        const headerSecondary = (header.secondary_cta ?? {}) as { label?: string; url?: string; enabled?: boolean };

        setStyle(header.style === "dark" ? "dark" : "light");
        setSticky(header.sticky !== false);
        setLogoUrl((header.logo_url as string) ?? "");
        setCta({ enabled: Boolean(headerCta.label) && headerCta.enabled !== false, label: headerCta.label ?? "", url: headerCta.url ?? "" });
        setSecondaryCta({
          enabled: Boolean(headerSecondary.label) && headerSecondary.enabled !== false,
          label: headerSecondary.label ?? "",
          url: headerSecondary.url ?? "",
        });
        setShowLanguage(header.show_language === true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, [websiteId, router]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const mark = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  const headerValue = useMemo(
    () => ({
      style,
      sticky,
      show_language: showLanguage,
      ...(logoUrl.trim() ? { logo_url: logoUrl.trim() } : {}),
      cta: { label: cta.label, url: cta.url, enabled: cta.enabled },
      secondary_cta: { label: secondaryCta.label, url: secondaryCta.url, enabled: secondaryCta.enabled },
    }),
    [style, sticky, showLanguage, logoUrl, cta, secondaryCta]
  );

  const previewSite = useMemo<SitePayload | null>(() => {
    if (!siteBase) return null;
    return { ...siteBase, settings: { ...siteBase.settings, header: headerValue as Record<string, unknown> } };
  }, [siteBase, headerValue]);

  const previewVars = useMemo(
    () => (siteBase ? themeToCssVars(siteBase.template?.design_tokens, siteBase.settings.theme as ThemeSettings | undefined) : {}),
    [siteBase]
  );

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      await adminFetch(`websites/${websiteId}/settings/header`, {
        method: "PUT",
        body: JSON.stringify({ value: headerValue }),
      });
      setDirty(false);
      setStatusMsg({ kind: "ok", text: "Saved — live site updated" });
      setTimeout(() => setStatusMsg((m) => (m?.kind === "ok" ? null : m)), 3000);
    } catch (e) {
      setStatusMsg({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex h-12 items-center gap-4 border-b border-slate-200 bg-white px-4">
        <a href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
          ← Dashboard
        </a>
        <a href={`/admin/websites/${websiteId}/pages`} className="text-sm text-slate-500 hover:text-slate-900">
          Pages
        </a>
        <a href={`/admin/websites/${websiteId}/menus`} className="text-sm text-slate-500 hover:text-slate-900">
          Menus
        </a>
        <a href={`/admin/websites/${websiteId}/theme`} className="text-sm text-slate-500 hover:text-slate-900">
          Theme
        </a>
        <span className="text-sm font-semibold">Header</span>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-6">
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {/* Live preview */}
        <p className="mb-2 text-center text-xs text-slate-400">Live preview — updates as you edit</p>
        <div className="overflow-hidden rounded-xl shadow-lg ring-1 ring-slate-200">
          {previewSite ? (
            <div className="themed" style={previewVars as React.CSSProperties}>
              <Header site={previewSite} currentPath="" />
              <div className="h-10 bg-[var(--color-bg,#ffffff)]" />
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center bg-white text-sm text-slate-400">Loading preview…</div>
          )}
        </div>

        {/* Settings */}
        <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="mb-1 block text-xs font-semibold text-slate-600">Header style</span>
              <div className="flex rounded-lg bg-slate-100 p-1">
                {(["light", "dark"] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => mark(setStyle)(option)}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize ${style === option ? "bg-white shadow" : "text-slate-500"}`}
                  >
                    {option === "light" ? "☀️" : "🌙"} {option}
                  </button>
                ))}
              </div>
            </div>
            <label className="mt-5 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sticky} onChange={(e) => mark(setSticky)(e.target.checked)} />
              Sticky (stays visible when scrolling)
            </label>
            <label className="mt-5 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showLanguage} onChange={(e) => mark(setShowLanguage)(e.target.checked)} />
              Show language dropdown
            </label>
          </div>

          <div>
            <span className="mb-1 block text-xs font-semibold text-slate-600">Logo</span>
            <div className="flex gap-1.5">
              <input className={inputClass} value={logoUrl} placeholder="Site name is shown when empty" onChange={(e) => mark(setLogoUrl)(e.target.value)} />
              <button
                type="button"
                onClick={() => setPickingLogo(true)}
                className="shrink-0 rounded-lg border border-slate-300 px-3 text-sm hover:border-cyan-400 hover:bg-cyan-50"
                title="Choose from media library (upload supported)"
              >
                📁 Browse
              </button>
              {logoUrl && (
                <button type="button" onClick={() => mark(setLogoUrl)("")} className="shrink-0 rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50">
                  Remove
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">Tip: a transparent PNG or SVG around 40px tall looks best. Upload directly inside Browse.</p>
          </div>

          <CtaFields title="Primary button (e.g. “Talk to a Lawyer”)" value={cta} onChange={mark(setCta)} />
          <CtaFields title="Secondary button (e.g. “Register as a Lawyer”)" value={secondaryCta} onChange={mark(setSecondaryCta)} />

          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            <button
              onClick={() => void save()}
              disabled={saving || !dirty}
              className="rounded-lg bg-cyan-700 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save header"}
            </button>
            {dirty && <span className="text-xs text-slate-400">Unsaved changes</span>}
            {statusMsg && <span className={`text-xs font-medium ${statusMsg.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>{statusMsg.text}</span>}
          </div>
        </div>
      </div>

      {pickingLogo && (
        <MediaPickerDialog
          api={realMediaApi}
          onClose={() => setPickingLogo(false)}
          onPick={(item) => {
            mark(setLogoUrl)(item.url);
            setPickingLogo(false);
          }}
        />
      )}
    </div>
  );
}
