import { localeName, localizedHref } from "@/lib/locales";
import type { MenuItem, SitePayload } from "@/lib/types";

/** Minimal inline icons (original), so no icon font is needed. */
const PersonPlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
    <path d="M18 8v6M15 11h6" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.7 2.6 4 5.6 4 9s-1.3 6.4-4 9c-2.7-2.6-4-5.6-4-9s1.3-6.4 4-9z" />
  </svg>
);

const Chevron = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

interface StyleTokens {
  bar: string;
  link: string;
  linkActive: string;
  dropdown: string;
  dropdownLink: string;
  secondaryBtn: string;
  primaryBtn: string;
  langPill: string;
  logoText: string;
}

const STYLES: Record<"light" | "dark", StyleTokens> = {
  light: {
    bar: "border-b border-slate-200 bg-white/90 backdrop-blur",
    link: "px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900",
    linkActive: "rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-[var(--color-primary,#0e7490)]",
    dropdown: "border-slate-200 bg-white",
    dropdownLink: "text-slate-700 hover:bg-slate-50",
    secondaryBtn: "border border-slate-300 text-slate-700 hover:bg-slate-50",
    primaryBtn: "bg-[var(--color-primary,#0e7490)] text-white hover:opacity-90",
    langPill: "border border-slate-300 text-slate-600 hover:bg-slate-50",
    logoText: "text-slate-900",
  },
  dark: {
    bar: "bg-[var(--color-secondary,#12203c)] shadow-md",
    link: "px-3 py-2 text-sm font-medium text-slate-200 hover:text-white",
    linkActive: "rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-[var(--color-accent,#efb639)]",
    dropdown: "border-white/10 bg-[var(--color-secondary,#12203c)]",
    dropdownLink: "text-slate-200 hover:bg-white/10 hover:text-white",
    secondaryBtn: "border border-white/70 text-white hover:bg-white/10",
    primaryBtn: "bg-[var(--color-accent,#efb639)] text-[var(--color-secondary,#12203c)] hover:opacity-90",
    langPill: "border border-white/40 text-white hover:bg-white/10",
    logoText: "text-white",
  },
};

function NavItem({ item, isActive, s }: { item: MenuItem; isActive: (url: string) => boolean; s: StyleTokens }) {
  const active = isActive(item.url);
  return (
    <li className="group relative">
      <a href={item.url} target={item.target} className={`inline-flex items-center gap-1 ${active ? s.linkActive : s.link}`}>
        {item.label}
        {item.children.length > 0 && <Chevron />}
      </a>
      {item.children.length > 0 && (
        <ul className={`invisible absolute left-0 top-full z-20 min-w-52 rounded-lg border py-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 ${s.dropdown}`}>
          {item.children.map((child, i) => (
            <li key={i}>
              <a href={child.url} target={child.target} className={`block px-4 py-2 text-sm ${s.dropdownLink}`}>
                {child.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function Header({ site, currentLocale = "", currentPath = "" }: { site: SitePayload; currentLocale?: string; currentPath?: string }) {
  const header = site.settings.header ?? {};
  const menu = site.menus.header_primary ?? [];
  const logo = header.logo_url as string | undefined;
  // enabled: false hides a button while keeping its saved label/link.
  const rawCta = header.cta as { label?: string; url?: string; enabled?: boolean } | undefined;
  const rawSecondary = header.secondary_cta as { label?: string; url?: string; enabled?: boolean } | undefined;
  const cta = rawCta?.label && rawCta.enabled !== false ? rawCta : undefined;
  const secondaryCta = rawSecondary?.label && rawSecondary.enabled !== false ? rawSecondary : undefined;
  const sticky = header.sticky !== false;
  const s = STYLES[header.style === "dark" ? "dark" : "light"];

  const defaultLocale = site.website.default_locale;
  const allLocales = [defaultLocale, ...(site.website.locales ?? []).filter((l) => l !== defaultLocale)];
  const activeLocale = currentLocale || defaultLocale;
  const showLanguage = header.show_language === false ? false : allLocales.length > 1 || header.show_language === true;

  const currentHref = currentPath ? `/${currentPath}` : "/";
  const isActive = (url: string) => url === currentHref;

  return (
    <header className={`${sticky ? "sticky top-0" : ""} z-30 ${s.bar}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6">
        <a href="/" className="flex shrink-0 items-center gap-2">
          {logo ? (
            <img src={logo} alt={site.website.name} className="h-9" />
          ) : (
            <span className={`text-lg font-bold ${s.logoText}`}>{site.website.name}</span>
          )}
        </a>

        <nav className="min-w-0 flex-1">
          <ul className="hidden items-center justify-center gap-1 md:flex">
            {menu.map((item, i) => (
              <NavItem key={i} item={item} isActive={isActive} s={s} />
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          {secondaryCta?.label && (
            <a href={secondaryCta.url ?? "#"} className={`hidden items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold lg:inline-flex ${s.secondaryBtn}`}>
              <PersonPlusIcon />
              {secondaryCta.label}
            </a>
          )}
          {cta?.label && (
            <a href={cta.url ?? "#"} className={`btn inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold ${s.primaryBtn}`}>
              {cta.label}
            </a>
          )}
          {showLanguage && (
            <details className="group relative">
              <summary className={`inline-flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${s.langPill}`} title="Language">
                <GlobeIcon />
                {localeName(activeLocale)}
                <Chevron />
              </summary>
              <ul className={`absolute right-0 top-full z-20 mt-1 min-w-36 rounded-lg border py-1 shadow-xl ${s.dropdown}`}>
                {allLocales.map((loc) => (
                  <li key={loc}>
                    <a
                      href={localizedHref(loc, currentPath, defaultLocale)}
                      className={`block px-3 py-1.5 text-sm ${s.dropdownLink} ${loc === activeLocale ? "font-semibold" : ""}`}
                      hrefLang={loc}
                    >
                      {localeName(loc)}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </header>
  );
}
