import type { JSX } from "react";
import type { MenuItem, SitePayload } from "@/lib/types";

/** Simple generic glyphs — no brand artwork, just recognisable shapes. */
const SOCIAL_GLYPHS: Record<string, JSX.Element> = {
  facebook: <path d="M13.2 21v-7.2h2.4l.4-2.8h-2.8V9.2c0-.8.2-1.4 1.4-1.4h1.5V5.3c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8V11H7.8v2.8h2.4V21h3z" />,
  twitter: <path d="M5 5l14 14M19 5L5 19" strokeWidth="2.2" strokeLinecap="round" fill="none" stroke="currentColor" />,
  x: <path d="M5 5l14 14M19 5L5 19" strokeWidth="2.2" strokeLinecap="round" fill="none" stroke="currentColor" />,
  instagram: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="16.6" cy="7.4" r="1.15" />
    </>
  ),
  linkedin: (
    <>
      <rect x="4.6" y="9.4" width="3" height="10" rx="0.5" />
      <circle cx="6.1" cy="6.1" r="1.7" />
      <path d="M10.2 9.4h2.9v1.4c.5-.9 1.6-1.6 3-1.6 2.4 0 3.5 1.5 3.5 4.1v6.1h-3v-5.5c0-1.4-.5-2.1-1.6-2.1-1.2 0-1.8.8-1.8 2.2v5.4h-3z" />
    </>
  ),
  youtube: (
    <>
      <rect x="3.2" y="6.2" width="17.6" height="11.6" rx="3.4" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M10.4 9.6l5.2 2.4-5.2 2.4z" />
    </>
  ),
  whatsapp: (
    <>
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M9.7 9.1c.3 0 .5.2.6.4l.5 1.2c.1.2 0 .5-.2.6l-.5.4c.5 1 1.2 1.7 2.2 2.2l.4-.5c.1-.2.4-.3.6-.2l1.2.5c.2.1.4.3.4.6 0 1-.9 1.6-1.8 1.4-2.6-.5-4.4-2.3-4.9-4.9-.2-.9.5-1.7 1.5-1.7z" />
    </>
  ),
};

function SocialIcon({ network }: { network: string }) {
  const glyph = SOCIAL_GLYPHS[network.toLowerCase()];
  if (!glyph) {
    // Unknown network: fall back to its initial so nothing looks broken.
    return <span className="text-sm font-bold uppercase">{network.charAt(0)}</span>;
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      {glyph}
    </svg>
  );
}

const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C11 21 3 13 3 3c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" />
  </svg>
);

const MailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="m3.8 7.5 8.2 5.4 8.2-5.4" />
  </svg>
);

const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
);

function ContactRow({ icon, children, href }: { icon: JSX.Element; children: React.ReactNode; href?: string }) {
  const body = <span className="whitespace-pre-line text-sm leading-6">{children}</span>;
  return (
    <li className="flex items-start gap-3">
      <span
        className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-accent,#22d3ee)] text-[var(--color-secondary,#0f172a)]"
        aria-hidden
      >
        {icon}
      </span>
      {href ? (
        <a href={href} className="transition hover:text-white">
          {body}
        </a>
      ) : (
        body
      )}
    </li>
  );
}

function LinkColumn({ title, items }: { title: string; items: MenuItem[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <ul className="mt-4 space-y-2">
        {items.map((item, i) => (
          <li key={i}>
            <a href={item.url} className="text-sm transition hover:text-white">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer({ site }: { site: SitePayload }) {
  const footer = site.settings.footer ?? {};
  const social = Object.entries((site.settings.social ?? {}) as Record<string, string>).filter(([, url]) => url);
  const logo = footer.logo_url as string | undefined;
  const tagline = footer.tagline as string | undefined;
  const company = footer.company_info as string | undefined;
  const contact = footer.contact as { phone?: string; email?: string; address?: string } | undefined;
  const copyright = (footer.copyright as string) ?? `© ${new Date().getFullYear()} ${site.website.name}. All rights reserved.`;
  const quickLinks = site.menus.footer_quick_links ?? [];
  const services = site.menus.footer_services ?? [];

  return (
    <footer className="border-t border-white/10 bg-[var(--color-secondary,#0f172a)] text-slate-300">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand + social */}
          <div>
            <div className="flex items-center gap-3">
              {logo && <img src={logo} alt="" className="h-12 w-12 shrink-0 rounded-lg object-contain" />}
              <div className="min-w-0">
                <p className="truncate text-2xl font-bold text-white">{site.website.name}</p>
                {tagline && <p className="mt-0.5 text-sm text-slate-400">{tagline}</p>}
              </div>
            </div>

            {social.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {social.map(([network, url]) => (
                  <a
                    key={network}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={network}
                    title={network}
                    className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-accent,#22d3ee)] text-[var(--color-secondary,#0f172a)] transition hover:-translate-y-0.5 hover:opacity-90"
                  >
                    <SocialIcon network={network} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          {company && <p className="text-sm leading-7 md:pt-2">{company}</p>}

          {/* Contact */}
          {(contact?.phone || contact?.email || contact?.address) && (
            <ul className="space-y-4">
              {contact.phone && (
                <ContactRow icon={<PhoneIcon />} href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}>
                  {contact.phone}
                </ContactRow>
              )}
              {contact.email && (
                <ContactRow icon={<MailIcon />} href={`mailto:${contact.email}`}>
                  {contact.email}
                </ContactRow>
              )}
              {contact.address && <ContactRow icon={<PinIcon />}>{contact.address}</ContactRow>}
            </ul>
          )}
        </div>

        {/* Optional link menus stay supported */}
        {(quickLinks.length > 0 || services.length > 0) && (
          <div className="mt-12 grid gap-10 border-t border-white/10 pt-10 sm:grid-cols-2">
            <LinkColumn title="Quick links" items={quickLinks} />
            <LinkColumn title="Services" items={services} />
          </div>
        )}
      </div>

      <div className="border-t border-white/10 py-6 text-center text-sm text-slate-400">{copyright}</div>
    </footer>
  );
}
