import { localeName, localizedHref } from "@/lib/locales";
import type { MenuItem, SitePayload } from "@/lib/types";

function NavItem({ item }: { item: MenuItem }) {
  return (
    <li className="group relative">
      <a href={item.url} target={item.target} className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900">
        {item.label}
      </a>
      {item.children.length > 0 && (
        <ul className="invisible absolute left-0 top-full z-20 min-w-48 rounded-lg border border-slate-200 bg-white py-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
          {item.children.map((child, i) => (
            <li key={i}>
              <a href={child.url} target={child.target} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
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
  const cta = header.cta as { label?: string; url?: string } | undefined;
  const sticky = header.sticky !== false;
  const defaultLocale = site.website.default_locale;
  // Language selector appears once the site has translation languages enabled.
  const allLocales = [defaultLocale, ...(site.website.locales ?? []).filter((l) => l !== defaultLocale)];
  const activeLocale = currentLocale || defaultLocale;

  return (
    <header className={`${sticky ? "sticky top-0" : ""} z-30 border-b border-slate-200 bg-white/90 backdrop-blur`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2">
          {logo ? <img src={logo} alt={site.website.name} className="h-8" /> : <span className="text-lg font-bold">{site.website.name}</span>}
        </a>
        <nav>
          <ul className="hidden items-center md:flex">
            {menu.map((item, i) => (
              <NavItem key={i} item={item} />
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-3">
          {allLocales.length > 1 && (
            <details className="group relative">
              <summary className="cursor-pointer list-none rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100" title="Language">
                🌐 {activeLocale.toUpperCase()}
              </summary>
              <ul className="absolute right-0 top-full z-20 mt-1 min-w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {allLocales.map((loc) => (
                  <li key={loc}>
                    <a
                      href={localizedHref(loc, currentPath, defaultLocale)}
                      className={`block px-3 py-1.5 text-sm hover:bg-slate-50 ${loc === activeLocale ? "font-semibold text-cyan-700" : "text-slate-700"}`}
                      hrefLang={loc}
                    >
                      {localeName(loc)}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {cta?.label && (
            <a href={cta.url ?? "#"} className="btn rounded-lg bg-[var(--color-primary,#0e7490)] px-4 py-2 text-sm font-semibold text-white">
              {cta.label}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
