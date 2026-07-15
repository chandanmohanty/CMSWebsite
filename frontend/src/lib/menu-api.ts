import { adminFetch } from "./api";

export interface MenuItemNode {
  id?: number;
  label: string;
  url?: string | null;
  page_id?: number | null;
  target: string;
  icon?: string | null;
  mega_menu?: unknown;
  children: MenuItemNode[];
}

export interface MenuRecord {
  id: number;
  name: string;
  location: string;
  items: MenuItemNode[];
}

export interface PageOption {
  id: number;
  title: string;
  slug: string;
}

export const MENU_LOCATIONS: { value: string; label: string }[] = [
  { value: "header_primary", label: "Header — primary navigation" },
  { value: "header_secondary", label: "Header — secondary" },
  { value: "footer_quick_links", label: "Footer — quick links" },
  { value: "footer_services", label: "Footer — services" },
  { value: "mobile", label: "Mobile menu" },
];

/** Abstraction so the editor runs against the real API or the demo mock. */
export interface MenuApi {
  menus(): Promise<MenuRecord[]>;
  createMenu(name: string, location: string): Promise<MenuRecord>;
  deleteMenu(id: number): Promise<void>;
  saveItems(menuId: number, items: MenuItemNode[]): Promise<MenuRecord>;
  pages(): Promise<PageOption[]>;
}

export function realMenuApi(websiteId: string): MenuApi {
  return {
    menus: () => adminFetch<MenuRecord[]>(`websites/${websiteId}/menus`),

    createMenu: async (name, location) => {
      const menu = await adminFetch<MenuRecord>(`websites/${websiteId}/menus`, {
        method: "POST",
        body: JSON.stringify({ name, location }),
      });
      return { ...menu, items: menu.items ?? [] };
    },

    deleteMenu: async (id) => {
      await adminFetch(`websites/${websiteId}/menus/${id}`, { method: "DELETE" });
    },

    saveItems: (menuId, items) =>
      adminFetch<MenuRecord>(`websites/${websiteId}/menus/${menuId}/items`, {
        method: "PUT",
        body: JSON.stringify({ items }),
      }),

    pages: async () => {
      const res = await adminFetch<{ data: PageOption[] }>(`websites/${websiteId}/pages?per_page=100`);
      return res.data.map((p) => ({ id: p.id, title: p.title, slug: p.slug }));
    },
  };
}
