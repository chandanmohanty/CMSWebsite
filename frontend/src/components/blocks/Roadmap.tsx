"use client";

import { useState } from "react";

type Step = { icon?: string; title?: string; text?: string; track?: string };
type Tab = { label?: string; icon?: string };

type Props = {
  content: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  editor?: boolean;
};

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const lines = (v: unknown): string[] =>
  str(v)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * Process roadmap: a sticky side panel (illustration, channel switcher,
 * highlights) beside a grid of numbered step cards. When both tabs are named,
 * steps can be assigned to a track and the switcher filters them.
 */
export function Roadmap({ content }: Props) {
  const steps = (Array.isArray(content?.steps) ? content?.steps : []) as Step[];
  const tab1 = (content?.tab1 ?? {}) as Tab;
  const tab2 = (content?.tab2 ?? {}) as Tab;
  const glance = (content?.glance ?? {}) as { title?: string; points?: string };

  const tabs = [tab1, tab2].filter((tab) => tab.label);
  const [active, setActive] = useState(0);

  // Tracks are optional: a step with no track shows on every tab.
  const visible =
    tabs.length > 1 ? steps.filter((step) => !step.track?.trim() || step.track.trim() === String(active + 1)) : steps;

  const image = str(content?.image);
  const points = lines(glance.points);

  return (
    <section className="relative overflow-hidden bg-[var(--color-secondary,#0f172a)] py-20 text-white">
      {/* dotted texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl gap-6 px-6 lg:grid-cols-[320px_1fr]">
        {/* Side panel */}
        <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
          {image && (
            <img
              src={image}
              alt=""
              className="mx-auto aspect-square w-full max-w-64 rounded-full object-cover ring-1 ring-white/20"
              loading="lazy"
            />
          )}

          {str(content?.caption) && <p className="mt-5 text-center text-sm text-white/80">{str(content?.caption)}</p>}

          {tabs.length > 0 && (
            <div className="mt-4 flex gap-1.5 rounded-full border border-white/10 bg-white/5 p-1.5">
              {tabs.map((tab, i) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-pressed={i === active}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm transition ${
                    i === active
                      ? "bg-[var(--color-accent,#22d3ee)] font-semibold text-[var(--color-secondary,#0f172a)] shadow"
                      : "font-medium text-white/70 hover:text-white"
                  }`}
                >
                  {tab.icon && <span aria-hidden>{tab.icon}</span>}
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {points.length > 0 && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              {glance.title && (
                <p className="text-center text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent,#22d3ee)]">
                  {glance.title}
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/85">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent,#22d3ee)]" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* Steps */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {str(content?.eyebrow) && (
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent,#22d3ee)]">
                  {str(content?.eyebrow)}
                </p>
              )}
              <h2 className="mt-1.5 text-3xl font-bold">{str(content?.heading)}</h2>
              {str(content?.subheading) && <p className="mt-1 text-white/70">{str(content?.subheading)}</p>}
            </div>
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-[var(--color-accent,#22d3ee)]"
              aria-hidden
            >
              ?
            </span>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {visible.map((step, i) => (
              <article
                key={`${step.title}-${i}`}
                className="rounded-2xl bg-[var(--color-accent,#22d3ee)] p-5 text-[var(--color-secondary,#0f172a)] shadow-xl transition hover:-translate-y-1"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-lg shadow-sm" aria-hidden>
                    {step.icon || "?"}
                  </span>
                  <span className="rounded-full bg-[var(--color-secondary,#0f172a)] px-2.5 py-1 text-xs font-bold text-white">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.15em] opacity-80">Step {i + 1}</span>
                </div>
                <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
                {step.text && <p className="mt-1.5 text-sm opacity-80">{step.text}</p>}
              </article>
            ))}
          </div>

          {visible.length === 0 && <p className="mt-8 text-center text-sm text-white/60">Add steps to this roadmap.</p>}
        </div>
      </div>
    </section>
  );
}
