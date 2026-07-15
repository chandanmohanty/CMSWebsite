import type { JSX } from "react";
import type { Section } from "@/lib/types";

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
  const compact = settings?.variant === "compact";
  return (
    <section className={`bg-[var(--color-primary,#0e7490)] text-white ${compact ? "py-16" : "py-28"}`}>
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h1 className={`font-bold tracking-tight ${compact ? "text-3xl" : "text-5xl"}`}>{str(content?.heading)}</h1>
        {str(content?.subheading) && <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90">{str(content?.subheading)}</p>}
        {cta.label && (
          <a href={cta.url ?? "#"} className="mt-8 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-100">
            {cta.label}
          </a>
        )}
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

function ServicesGrid({ content }: BlockProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-3xl font-bold">{str(content?.heading)}</h2>
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items(content?.items).map((item, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 text-slate-600">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
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
            <p className="text-sm text-slate-500">{member.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials({ content }: BlockProps) {
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-bold">{str(content?.heading)}</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {items(content?.items).map((t, i) => (
            <figure key={i} className="rounded-xl bg-white p-6 shadow-sm">
              <blockquote className="text-slate-700">“{t.quote}”</blockquote>
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
    <section className="bg-slate-900 py-16 text-center text-white">
      <h2 className="text-3xl font-bold">{str(content?.heading)}</h2>
      {cta.label && (
        <a href={cta.url ?? "#"} className="mt-6 inline-block rounded-lg bg-[var(--color-accent,#22d3ee)] px-6 py-3 font-semibold text-slate-900">
          {cta.label}
        </a>
      )}
    </section>
  );
}

function Faq({ content }: BlockProps) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h2 className="text-center text-3xl font-bold">{str(content?.heading)}</h2>
      <div className="mt-10 space-y-3">
        {items(content?.items).map((faq, i) => (
          <details key={i} className="group rounded-lg border border-slate-200 p-4">
            <summary className="cursor-pointer list-none font-semibold marker:hidden">
              {(faq as { question?: string }).question}
            </summary>
            <p className="mt-2 text-slate-600">{(faq as { answer?: string }).answer}</p>
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
            {(img as { caption?: string }).caption && <figcaption className="mt-2 text-sm text-slate-500">{(img as { caption?: string }).caption}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  );
}

function FormEmbed({ content }: BlockProps) {
  // Placeholder render; the interactive form component posts to /api/public/forms/{slug}/submit.
  return (
    <section className="mx-auto max-w-xl px-6 py-16 text-center text-slate-500">
      <p>[Form: {str(content?.form_slug)}]</p>
    </section>
  );
}

function CustomHtml({ content }: BlockProps) {
  return <section dangerouslySetInnerHTML={{ __html: str(content?.html) }} />;
}

const BLOCKS: Record<string, (props: BlockProps) => JSX.Element> = {
  hero: Hero,
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
