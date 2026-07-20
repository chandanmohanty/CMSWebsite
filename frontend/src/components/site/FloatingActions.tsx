import type { JSX } from "react";
import type { SitePayload } from "@/lib/types";

interface ActionItem {
  label?: string;
  url?: string;
  icon?: string;
  color?: string;
}

/** Simple generic glyphs, matched by the icon name saved in settings. */
const GLYPHS: Record<string, JSX.Element> = {
  whatsapp: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M9.6 8.8c.3 0 .6.2.7.5l.5 1.2c.1.3 0 .6-.2.8l-.5.4c.5 1.1 1.4 1.9 2.5 2.4l.4-.5c.2-.2.5-.3.8-.2l1.2.5c.3.1.5.4.5.7 0 1.1-1 1.8-2 1.6-2.8-.6-4.9-2.7-5.5-5.5-.2-1 .6-1.9 1.6-1.9z"
        fill="currentColor"
      />
    </>
  ),
  phone: (
    <path
      d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C11 21 3 13 3 3c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"
      fill="currentColor"
    />
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="m3.8 7.5 8.2 5.4 8.2-5.4" fill="none" stroke="currentColor" strokeWidth="1.9" />
    </>
  ),
  chat: (
    <path
      d="M4 5.5h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3.5V15.5H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
  ),
};

/** Dark text on light buttons, white on dark ones — so labels stay readable on any colour. */
function readableText(hex?: string): string {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) {
    return "var(--color-secondary, #0f172a)"; // accent-coloured button
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#0f172a" : "#ffffff";
}

/**
 * Sticky contact buttons shown on every page (WhatsApp, call, email…).
 * Configured per website in the `actions` settings group.
 */
export function FloatingActions({ site }: { site: SitePayload }) {
  const settings = (site.settings.actions ?? {}) as { items?: ActionItem[]; position?: string };
  const items = (settings.items ?? []).filter((item) => item.label && item.url);

  if (items.length === 0) return null;

  const left = settings.position === "left";

  return (
    <div className={`fixed bottom-5 z-40 flex flex-col gap-3 ${left ? "left-4 items-start" : "right-4 items-end"}`}>
      {items.map((item) => {
        const glyph = GLYPHS[(item.icon ?? "").toLowerCase()];
        const external = /^https?:/i.test(item.url ?? "");

        return (
          <a
            key={item.label}
            href={item.url}
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            aria-label={item.label}
            className="flex items-center gap-2.5 rounded-full py-3 pl-3.5 pr-3.5 font-semibold shadow-xl ring-1 ring-black/10 transition hover:-translate-y-0.5 hover:shadow-2xl sm:pr-5"
            style={{ backgroundColor: item.color || "var(--color-accent, #22d3ee)", color: readableText(item.color) }}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center" aria-hidden>
              {glyph ? (
                <svg width="22" height="22" viewBox="0 0 24 24">
                  {glyph}
                </svg>
              ) : (
                <span className="text-sm font-bold">{item.label?.charAt(0)}</span>
              )}
            </span>
            {/* Label is hidden on small screens so the buttons stay out of the way */}
            <span className="hidden text-sm sm:inline">{item.label}</span>
          </a>
        );
      })}
    </div>
  );
}
