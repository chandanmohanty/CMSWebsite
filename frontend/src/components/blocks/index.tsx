import type { JSX } from "react";
import type { Section } from "@/lib/types";
import { SiteForm } from "@/components/site/SiteForm";

/**
 * Block registry: maps a `block_type` stored in the database to a React renderer.
 * Content is pure data authored in the admin builder; these components are the
 * design layer. Swapping a website's template never touches stored content -
 * it only changes design tokens and default layouts.
 *
 * To add a block: build the component, register it in BLOCKS, and it becomes
 * available to the drag-and-drop builder and every template.
 */

type BlockProps = {
  content: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
};

type Cta = { label?: string; url?: string };
type Item = { title?: string; text?: string; icon?: string; image?: string; name?: string; role?: string; quote?: string };

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const items = (v: unknown): Item[] => (Array.isArray(v) ? (v as Item[]) : []);

function Hero({ content, settings }: BlockProps) {
  const cta = (content?.cta ?? {}) as Cta;
  const cta2 = (content?.cta2 ?? {}) as Cta;
  const compact = settings?.variant === "compact";
  const image = str(content?.image);
  const video = str(content?.video);
  const badge = str(content?.badge);
  const hasMedia = Boolean(image || video);
  return (
    <section
      className={`relative overflow-hidden bg-gradient-to-br from-[var(--color-primary,#0e7490)] to-[var(--color-secondary,#0f172a)] bg-cover bg-center text-white ${compact ? "py-16" : "py-28"}`}
      // The image doubles as the video's poster and the reduced-motion fallback.
      style={image ? { backgroundImage: `url(${image})` } : undefined}
    >
      {video && (
        <video
          className="hero-video absolute inset-0 h-full w-full object-cover"
          src={video}
          poster={image || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
          tabIndex={-1}
        />
      )}
      {hasMedia ? (
        <div className="absolute inset-0 bg-slate-900/55" aria-hidden />
      ) : (
        <>
          {/* decorative blur orbs behind the glass elements */}
          <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-[var(--color-accent,#22d3ee)]/25 blur-3xl" aria-hidden />
        </>
      )}
      <div className="relative mx-auto max-w-5xl px-6 text-center">
        {badge && (
          <span className="mb-6 inline-block rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-medium shadow-lg backdrop-blur-md">
            {badge}
          </span>
        )}
        <h1 className={`font-bold tracking-tight ${compact ? "text-3xl" : "text-5xl leading-tight"}`}>{str(content?.heading)}</h1>
        {str(content?.subheading) && <p className="mx-auto mt-5 max-w-2xl text-lg text-white/85">{str(content?.subheading)}</p>}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {cta.label && (
            <a
              href={cta.url ?? "#"}
              className="btn inline-block rounded-lg bg-[var(--color-accent,#22d3ee)] px-7 py-3 font-semibold text-[var(--color-secondary,#0f172a)] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:opacity-95"
            >
              {cta.label}
            </a>
          )}
          {cta2.label && (
            <a
              href={cta2.url ?? "#"}
              className="btn inline-block rounded-lg border border-white/40 bg-white/10 px-7 py-3 font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              {cta2.label}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/** Trust stats band: glass number cards on the dark brand background. */
function Stats({ content }: BlockProps) {
  const stats = items(content?.items) as { value?: string; label?: string }[];
  return (
    <section className="bg-[var(--color-secondary,#0f172a)] py-14 text-white">
      <div className={`mx-auto grid max-w-6xl gap-4 px-6 ${stats.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
        {stats.map((stat, i) => (
          <div key={i} className="rounded-2xl border border-white/15 bg-white/10 p-6 text-center shadow-xl backdrop-blur-md">
            <p className="text-4xl font-bold text-[var(--color-accent,#22d3ee)]">{stat.value}</p>
            <p className="mt-1.5 text-sm font-medium text-white/80">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Two side-by-side panels (e.g. "Start online / Continue in person") with check-mark points. */
function TwoPanel({ content }: BlockProps) {
  const panels = items(content?.panels) as { title?: string; text?: string; points?: string }[];
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      {str(content?.heading) && <h2 className="text-center text-3xl font-bold">{str(content?.heading)}</h2>}
      {str(content?.subheading) && <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--color-muted,#475569)]">{str(content?.subheading)}</p>}
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {panels.map((panel, i) => (
          <div key={i} className="rounded-2xl border border-[var(--color-border,#e2e8f0)] bg-[var(--color-surface,#ffffff)]/80 p-8 shadow-lg backdrop-blur">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary,#0e7490)] font-bold text-white">{i + 1}</span>
            <h3 className="mt-4 text-xl font-bold text-[var(--color-primary,#0e7490)]">{panel.title}</h3>
            {panel.text && <p className="mt-2 text-[var(--color-muted,#475569)]">{panel.text}</p>}
            {panel.points && (
              <ul className="mt-4 space-y-2.5">
                {panel.points.split("\n").map((point) => point.trim()).filter(Boolean).map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 text-[var(--color-accent,#22d3ee)]" aria-hidden>✔</span>
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function RichText({ content }: BlockProps) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: str(content?.html) }} />
    </section>
  );
}

function ServicesGrid({ content, settings }: BlockProps) {
  const glass = settings?.variant === "glass";
  const cards = items(content?.items);

  const grid = (
    <div className="mx-auto max-w-6xl px-6">
      <h2 className={`text-center text-3xl font-bold ${glass ? "text-white" : ""}`}>{str(content?.heading)}</h2>
      {str(content?.subheading) && (
        <p className={`mx-auto mt-3 max-w-2xl text-center ${glass ? "text-white/75" : "text-[var(--color-muted,#475569)]"}`}>{str(content?.subheading)}</p>
      )}
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((item, i) => (
          <div
            key={i}
            className={
              glass
                ? "rounded-2xl border border-white/15 bg-white/10 p-7 shadow-xl backdrop-blur-md transition hover:-translate-y-1 hover:bg-white/15"
                : "rounded-2xl border border-[var(--color-border,#e2e8f0)] bg-[var(--color-surface,#ffffff)] p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            }
          >
            {item.icon && <span className="mb-3 block text-3xl" aria-hidden>{item.icon}</span>}
            <h3 className={`text-lg font-semibold ${glass ? "text-white" : ""}`}>{item.title}</h3>
            <p className={`mt-2 ${glass ? "text-white/75" : "text-[var(--color-muted,#475569)]"}`}>{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return glass ? (
    <section className="relative overflow-hidden bg-gradient-to-b from-[var(--color-secondary,#0f172a)] to-[var(--color-primary,#0e7490)] py-20">
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-[var(--color-accent,#22d3ee)]/15 blur-3xl" aria-hidden />
      <div className="relative">{grid}</div>
    </section>
  ) : (
    <section className="py-20">{grid}</section>
  );
}

function TeamGrid({ content }: BlockProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-3xl font-bold">{str(content?.heading)}</h2>
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {items(content?.items).map((member, i) => (
          <div key={i} className="text-center">
            {member.image && <img src={member.image} alt={member.name ?? ""} className="mx-auto h-32 w-32 rounded-full object-cover" />}
            <h3 className="mt-4 font-semibold">{member.name}</h3>
            <p className="text-sm text-[var(--color-muted,#64748b)]">{member.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials({ content }: BlockProps) {
  return (
    <section className="bg-[var(--color-surface-alt,#f8fafc)] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-bold">{str(content?.heading)}</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {items(content?.items).map((t, i) => (
            <figure key={i} className="rounded-xl bg-[var(--color-surface,#ffffff)] p-6 shadow-sm">
              <blockquote className="text-[var(--color-muted,#334155)]">“{t.quote}”</blockquote>
              <figcaption className="mt-4 font-semibold">{t.name}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBanner({ content }: BlockProps) {
  const cta = (content?.cta ?? {}) as Cta;
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[var(--color-secondary,#0f172a)] to-[var(--color-primary,#0e7490)] py-20 text-center text-white">
      <div className="pointer-events-none absolute -top-20 left-1/3 h-72 w-72 rounded-full bg-[var(--color-accent,#22d3ee)]/20 blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-3xl rounded-3xl border border-white/15 bg-white/10 px-8 py-12 shadow-2xl backdrop-blur-md">
        <h2 className="text-3xl font-bold">{str(content?.heading)}</h2>
        {str(content?.subheading) && <p className="mt-3 text-white/80">{str(content?.subheading)}</p>}
        {cta.label && (
          <a
            href={cta.url ?? "#"}
            className="btn mt-7 inline-block rounded-lg bg-[var(--color-accent,#22d3ee)] px-7 py-3 font-semibold text-[var(--color-secondary,#0f172a)] shadow-lg transition hover:-translate-y-0.5"
          >
            {cta.label}
          </a>
        )}
      </div>
    </section>
  );
}

function Faq({ content }: BlockProps) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h2 className="text-center text-3xl font-bold">{str(content?.heading)}</h2>
      <div className="mt-10 space-y-3">
        {items(content?.items).map((faq, i) => (
          <details key={i} className="group rounded-xl border border-[var(--color-border,#e2e8f0)] bg-[var(--color-surface,#ffffff)] px-5 py-4 shadow-sm transition open:shadow-md">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold marker:hidden">
              {(faq as { question?: string }).question}
              <span className="shrink-0 rounded-full border border-[var(--color-border,#e2e8f0)] p-1 text-[var(--color-primary,#0e7490)] transition group-open:rotate-180" aria-hidden>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
              </span>
            </summary>
            <p className="mt-3 text-[var(--color-muted,#475569)]">{(faq as { answer?: string }).answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Gallery({ content }: BlockProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      {str(content?.heading) && <h2 className="mb-10 text-center text-3xl font-bold">{str(content?.heading)}</h2>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items(content?.items).map((img, i) => (
          <figure key={i} className="overflow-hidden rounded-xl">
            {(img as { image?: string }).image && (
              <img src={(img as { image?: string }).image} alt={(img as { caption?: string }).caption ?? ""} className="h-56 w-full object-cover" />
            )}
            {(img as { caption?: string }).caption && <figcaption className="mt-2 text-sm text-[var(--color-muted,#64748b)]">{(img as { caption?: string }).caption}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  );
}

function FormEmbed({ content }: BlockProps) {
  const slug = str(content?.form_slug);
  return (
    <section className="mx-auto max-w-xl px-6 py-16">
      {str(content?.heading) && <h2 className="mb-8 text-center text-3xl font-bold">{str(content?.heading)}</h2>}
      {slug ? <SiteForm slug={slug} /> : <p className="text-center text-sm text-slate-400">Configure a form slug for this section.</p>}
    </section>
  );
}

function CustomHtml({ content }: BlockProps) {
  return <section dangerouslySetInnerHTML={{ __html: str(content?.html) }} />;
}

const BLOCKS: Record<string, (props: BlockProps) => JSX.Element> = {
  hero: Hero,
  stats: Stats,
  two_panel: TwoPanel,
  rich_text: RichText,
  services_grid: ServicesGrid,
  team_grid: TeamGrid,
  testimonials: Testimonials,
  faq: Faq,
  gallery: Gallery,
  cta: CtaBanner,
  form_embed: FormEmbed,
  custom_html: CustomHtml,
};

/** Render a single section (used by the builder canvas for live previews). */
export function BlockPreview({ blockType, content, settings }: { blockType: string; content: Record<string, unknown> | null; settings: Record<string, unknown> | null }) {
  const Block = BLOCKS[blockType];
  if (!Block) return <div className="p-8 text-center text-sm text-slate-400">Unknown block: {blockType}</div>;
  return <Block content={content} settings={settings} />;
}

export function BlockRenderer({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((section) => {
        const Block = BLOCKS[section.block_type];
        if (!Block) return null; // unknown block types are skipped, never crash the page
        return <Block key={section.id} content={section.content} settings={section.settings} />;
      })}
    </>
  );
}
