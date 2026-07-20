"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, adminFetch } from "@/lib/api";
import { realMediaApi } from "@/lib/media-api";
import { themeToCssVars, type ThemeSettings } from "@/lib/theme";
import type { SitePayload } from "@/lib/types";
import { Footer } from "@/components/site/Footer";
import { FloatingActions } from "@/components/site/FloatingActions";
import { MediaPickerDialog } from "@/components/media/MediaPickerDialog";

interface FooterState {
  logo_url: string;
  tagline: string;
  company_info: string;
  contact: { phone: string; email: string; address: string };
  copyright: string;
}

interface SocialRow {
  network: string;
  url: string;
}

interface ActionRow {
  label: string;
  icon: string;
  url: string;
  color: string;
}

const NETWORKS = ["facebook", "twitter", "instagram", "linkedin", "youtube", "whatsapp"];
const ACTION_ICONS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone" },
  { value: "mail", label: "Email" },
  { value: "chat", label: "Chat" },
];

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none";
const labelClass = "mb-1 block text-xs font-semibold text-slate-600";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export default function SiteSettingsPage({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = use(params);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [siteBase, setSiteBase] = useState<SitePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickingLogo, setPickingLogo] = useState(false);

  const [footer, setFooterState] = useState<FooterState>({
    logo_url: "",
    tagline: "",
    company_info: "",
    contact: { phone: "", email: "", address: "" },
    copyright: "",
  });
  const [social, setSocialState] = useState<SocialRow[]>([]);
  const [actions, setActionsState] = useState<{ position: string; items: ActionRow[] }>({ position: "right", items: [] });

  const touch = () => setDirty(true);
  const setFooter = (patch: Partial<FooterState>) => {
    setFooterState((prev) => ({ ...prev, ...patch }));
    touch();
  };
  const setContact = (patch: Partial<FooterState["contact"]>) => {
    setFooterState((prev) => ({ ...prev, contact: { ...prev.contact, ...patch } }));
    touch();
  };
  const setSocial = (rows: SocialRow[]) => {
    setSocialState(rows);
    touch();
  };
  const setActions = (next: { position: string; items: ActionRow[] }) => {
    setActionsState(next);
    touch();
  };

  useEffect(() => {
    if (!localStorage.getItem("cms_token")) {
      router.replace("/admin/login");
      return;
    }
    setReady(true);

    (async () => {
      try {
        const site = await adminFetch<{ slug: string }>(`websites/${websiteId}`);
        const res = await fetch(`${API_URL}/api/public/site?site=${encodeURIComponent(site.slug)}&preview=1`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${localStorage.getItem("cms_token")}` },
        });
        if (!res.ok) throw new Error(`Could not load site preview (${res.status})`);
        const payload = (await res.json()) as SitePayload;
        setSiteBase(payload);

        const f = (payload.settings.footer ?? {}) as Record<string, unknown>;
        const contact = (f.contact ?? {}) as Record<string, string>;
        setFooterState({
          logo_url: (f.logo_url as string) ?? "",
          tagline: (f.tagline as string) ?? "",
          company_info: (f.company_info as string) ?? "",
          contact: { phone: contact.phone ?? "", email: contact.email ?? "", address: contact.address ?? "" },
          copyright: (f.copyright as string) ?? "",
        });

        setSocialState(
          Object.entries((payload.settings.social ?? {}) as Record<string, string>).map(([network, url]) => ({ network, url }))
        );

        const a = (payload.settings.actions ?? {}) as { position?: string; items?: ActionRow[] };
        setActionsState({
          position: a.position === "left" ? "left" : "right",
          items: (a.items ?? []).map((item) => ({ label: item.label ?? "", icon: item.icon ?? "", url: item.url ?? "", color: item.color ?? "" })),
        });
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

  // Values in the shape the API and renderer expect.
  const footerValue = useMemo(
    () => ({
      ...(footer.logo_url.trim() ? { logo_url: footer.logo_url.trim() } : {}),
      ...(footer.tagline.trim() ? { tagline: footer.tagline.trim() } : {}),
      ...(footer.company_info.trim() ? { company_info: footer.company_info.trim() } : {}),
      contact: footer.contact,
      ...(footer.copyright.trim() ? { copyright: footer.copyright.trim() } : {}),
    }),
    [footer]
  );

  const socialValue = useMemo(
    () => Object.fromEntries(social.filter((row) => row.network.trim() && row.url.trim()).map((row) => [row.network.trim().toLowerCase(), row.url.trim()])),
    [social]
  );

  const actionsValue = useMemo(
    () => ({ position: actions.position, items: actions.items.filter((item) => item.label.trim() && item.url.trim()) }),
    [actions]
  );

  const previewSite = useMemo<SitePayload | null>(() => {
    if (!siteBase) return null;
    return {
      ...siteBase,
      settings: {
        ...siteBase.settings,
        footer: footerValue as Record<string, unknown>,
        social: socialValue as Record<string, unknown>,
        actions: actionsValue as unknown as Record<string, unknown>,
      },
    };
  }, [siteBase, footerValue, socialValue, actionsValue]);

  const previewVars = useMemo(
    () => (siteBase ? themeToCssVars(siteBase.template?.design_tokens, siteBase.settings.theme as ThemeSettings | undefined) : {}),
    [siteBase]
  );

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      await adminFetch(`websites/${websiteId}/settings/footer`, { method: "PUT", body: JSON.stringify({ value: footerValue }) });
      await adminFetch(`websites/${websiteId}/settings/social`, { method: "PUT", body: JSON.stringify({ value: socialValue }) });
      await adminFetch(`websites/${websiteId}/settings/actions`, { method: "PUT", body: JSON.stringify({ value: actionsValue }) });
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
        <a href={`/admin/websites/${websiteId}/header`} className="text-sm text-slate-500 hover:text-slate-900">
          Header
        </a>
        <a href={`/admin/websites/${websiteId}/theme`} className="text-sm text-slate-500 hover:text-slate-900">
          Theme
        </a>
        <span className="text-sm font-semibold">Site settings</span>
        <div className="ml-auto flex items-center gap-3">
          {dirty && <span className="text-xs text-slate-400">Unsaved changes</span>}
          {statusMsg && <span className={`text-xs font-medium ${statusMsg.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>{statusMsg.text}</span>}
          <button
            onClick={() => void save()}
            disabled={saving || !dirty}
            className="rounded-lg bg-cyan-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-6">
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {/* Live preview: the transform scopes the floating buttons' fixed positioning to this box */}
        <p className="mb-2 text-center text-xs text-slate-400">Live preview — footer and floating buttons</p>
        <div className="overflow-hidden rounded-xl shadow-lg ring-1 ring-slate-200">
          {previewSite ? (
            <div className="themed relative" style={{ ...previewVars, transform: "translateZ(0)" } as React.CSSProperties}>
              <Footer site={previewSite} />
              <FloatingActions site={previewSite} />
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center bg-white text-sm text-slate-400">Loading preview…</div>
          )}
        </div>

        <div className="mt-6 space-y-5">
          <Section title="Footer" hint="Brand block, description and contact details shown at the bottom of every page.">
            <div>
              <span className={labelClass}>Logo</span>
              <div className="flex gap-1.5">
                <input className={inputClass} value={footer.logo_url} placeholder="Site name is shown when empty" onChange={(e) => setFooter({ logo_url: e.target.value })} />
                <button type="button" onClick={() => setPickingLogo(true)} className="shrink-0 rounded-lg border border-slate-300 px-3 text-sm hover:border-cyan-400 hover:bg-cyan-50">
                  📁 Browse
                </button>
                {footer.logo_url && (
                  <button type="button" onClick={() => setFooter({ logo_url: "" })} className="shrink-0 rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50">
                    Remove
                  </button>
                )}
              </div>
            </div>
            <label className="block">
              <span className={labelClass}>Tagline (under the site name)</span>
              <input className={inputClass} value={footer.tagline} onChange={(e) => setFooter({ tagline: e.target.value })} />
            </label>
            <label className="block">
              <span className={labelClass}>Description</span>
              <textarea rows={4} className={inputClass} value={footer.company_info} onChange={(e) => setFooter({ company_info: e.target.value })} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Phone</span>
                <input className={inputClass} value={footer.contact.phone} onChange={(e) => setContact({ phone: e.target.value })} />
              </label>
              <label className="block">
                <span className={labelClass}>Email</span>
                <input className={inputClass} value={footer.contact.email} onChange={(e) => setContact({ email: e.target.value })} />
              </label>
            </div>
            <label className="block">
              <span className={labelClass}>Address (line breaks are kept)</span>
              <textarea rows={3} className={inputClass} value={footer.contact.address} onChange={(e) => setContact({ address: e.target.value })} />
            </label>
            <label className="block">
              <span className={labelClass}>Copyright line</span>
              <input className={inputClass} value={footer.copyright} placeholder={`© ${new Date().getFullYear()} …`} onChange={(e) => setFooter({ copyright: e.target.value })} />
            </label>
          </Section>

          <Section title="Social links" hint="Shown as circular icon buttons in the footer. Leave a URL blank to hide that network.">
            {social.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">No social links yet.</p>}
            {social.map((row, i) => (
              <div key={i} className="flex gap-2">
                <select
                  value={NETWORKS.includes(row.network) ? row.network : "custom"}
                  onChange={(e) => setSocial(social.map((r, j) => (j === i ? { ...r, network: e.target.value === "custom" ? "" : e.target.value } : r)))}
                  className={`${inputClass} w-40 capitalize`}
                >
                  {NETWORKS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                  <option value="custom">Other…</option>
                </select>
                {!NETWORKS.includes(row.network) && (
                  <input
                    className={`${inputClass} w-36`}
                    placeholder="network name"
                    value={row.network}
                    onChange={(e) => setSocial(social.map((r, j) => (j === i ? { ...r, network: e.target.value } : r)))}
                  />
                )}
                <input
                  className={inputClass}
                  placeholder="https://…"
                  value={row.url}
                  onChange={(e) => setSocial(social.map((r, j) => (j === i ? { ...r, url: e.target.value } : r)))}
                />
                <button type="button" onClick={() => setSocial(social.filter((_, j) => j !== i))} className="shrink-0 rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50">
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSocial([...social, { network: NETWORKS.find((n) => !social.some((r) => r.network === n)) ?? "facebook", url: "" }])}
              className="rounded-lg bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
            >
              + Add social link
            </button>
          </Section>

          <Section title="Floating buttons" hint="Sticky contact buttons shown on every page (WhatsApp, call, email…).">
            <div>
              <span className={labelClass}>Position</span>
              <div className="flex w-fit rounded-lg bg-slate-100 p-1">
                {(["right", "left"] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setActions({ ...actions, position: side })}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize ${actions.position === side ? "bg-white shadow" : "text-slate-500"}`}
                  >
                    Bottom {side}
                  </button>
                ))}
              </div>
            </div>

            {actions.items.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">No floating buttons yet.</p>}
            {actions.items.map((item, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_130px_auto]">
                  <input
                    className={inputClass}
                    placeholder="Button label"
                    value={item.label}
                    onChange={(e) => setActions({ ...actions, items: actions.items.map((it, j) => (j === i ? { ...it, label: e.target.value } : it)) })}
                  />
                  <select
                    className={inputClass}
                    value={item.icon}
                    onChange={(e) => setActions({ ...actions, items: actions.items.map((it, j) => (j === i ? { ...it, icon: e.target.value } : it)) })}
                  >
                    <option value="">No icon</option>
                    {ACTION_ICONS.map((icon) => (
                      <option key={icon.value} value={icon.value}>
                        {icon.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setActions({ ...actions, items: actions.items.filter((_, j) => j !== i) })}
                    className="rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_120px]">
                  <input
                    className={inputClass}
                    placeholder="https://wa.me/… or tel:+…"
                    value={item.url}
                    onChange={(e) => setActions({ ...actions, items: actions.items.map((it, j) => (j === i ? { ...it, url: e.target.value } : it)) })}
                  />
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(item.color) ? item.color : "#25d366"}
                    onChange={(e) => setActions({ ...actions, items: actions.items.map((it, j) => (j === i ? { ...it, color: e.target.value } : it)) })}
                    className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                    title="Button colour"
                  />
                  <input
                    className={inputClass}
                    placeholder="accent"
                    value={item.color}
                    onChange={(e) => setActions({ ...actions, items: actions.items.map((it, j) => (j === i ? { ...it, color: e.target.value } : it)) })}
                    title="Leave blank to use the template accent colour"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setActions({ ...actions, items: [...actions.items, { label: "", icon: "whatsapp", url: "", color: "" }] })}
              className="rounded-lg bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
            >
              + Add button
            </button>
          </Section>
        </div>
      </div>

      {pickingLogo && (
        <MediaPickerDialog
          api={realMediaApi}
          initialType="image"
          onClose={() => setPickingLogo(false)}
          onPick={(item) => {
            setFooter({ logo_url: item.url });
            setPickingLogo(false);
          }}
        />
      )}
    </div>
  );
}
