import type { MenuItem, SitePayload } from "@/lib/types";

function LinkColumn({ title, items }: { title: string; items: MenuItem[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <ul className="mt-4 space-y-2">
        {items.map((item, i) => (
          <li key={i}>
            <a href={item.url} className="text-sm text-slate-300 hover:text-white">
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
  const social = (site.settings.social ?? {}) as Record<string, string>;
  const company = footer.company_info as string | undefined;
  const contact = footer.contact as { phone?: string; email?: string; address?: string } | undefined;
  const copyright = (footer.copyright as string) ?? `© ${new Date().getFullYear()} ${site.website.name}. All rights reserved.`;

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-4">
        <div>
          <h2 className="text-lg font-bold text-white">{site.website.name}</h2>
          {company && <p className="mt-3 text-sm">{company}</p>}
          {contact && (
            <ul className="mt-4 space-y-1 text-sm">
              {contact.address && <li>{contact.address}</li>}
              {contact.phone && <li>{contact.phone}</li>}
              {contact.email && <li>{contact.email}</li>}
            </ul>
          )}
        </div>
        <LinkColumn title="Quick links" items={site.menus.footer_quick_links ?? []} />
        <LinkColumn title="Services" items={site.menus.footer_services ?? []} />
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Follow us</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {Object.entries(social).map(([network, url]) => (
              <li key={network}>
                <a href={url} className="capitalize hover:text-white" target="_blank" rel="noreferrer">
                  {network}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">{copyright}</div>
    </footer>
  );
}
