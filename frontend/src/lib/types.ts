// Shared types mirroring the Laravel API payloads.

export interface DesignTokens {
  colors?: { primary?: string; secondary?: string; accent?: string };
  typography?: { heading?: string; body?: string };
  radius?: string;
}

export interface MenuItem {
  label: string;
  url: string;
  target: string;
  icon?: string | null;
  mega_menu?: unknown;
  children: MenuItem[];
}

export interface SitePayload {
  website: {
    id: number;
    name: string;
    slug: string;
    domain: string | null;
    industry: string;
    default_locale: string;
    locales: string[] | null;
  };
  template: { slug: string; design_tokens: DesignTokens | null; version: string } | null;
  settings: Record<string, Record<string, unknown>>;
  menus: Record<string, MenuItem[]>;
}

export interface Section {
  id: number;
  block_type: string;
  content: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
}

export interface SeoMeta {
  meta_title?: string | null;
  meta_description?: string | null;
  keywords?: string | null;
  canonical_url?: string | null;
  open_graph?: Record<string, string> | null;
  twitter_card?: Record<string, string> | null;
  schema_markup?: Record<string, unknown> | null;
  robots?: string | null;
}

export interface PagePayload {
  page: {
    id: number;
    title: string;
    slug: string;
    page_type: string;
    custom_css: string | null;
    custom_js: string | null;
    published_at: string | null;
  };
  banner: { url: string; alt: string | null; width: number | null; height: number | null } | null;
  seo: SeoMeta | null;
  sections: Section[];
}
