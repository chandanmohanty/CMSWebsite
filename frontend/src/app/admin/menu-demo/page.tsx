"use client";

import { useMemo } from "react";
import { MenuEditor } from "@/components/menus/MenuEditor";
import type { MenuApi, MenuItemNode, MenuRecord, PageOption } from "@/lib/menu-api";

/**
 * Menu editor playground with an in-memory mock API - works without the
 * Laravel backend. Nothing is persisted.
 */

function createMockApi(): MenuApi {
  let nextMenuId = 10;

  const pages: PageOption[] = [
    { id: 1, title: "Home", slug: "" },
    { id: 2, title: "About us", slug: "about" },
    { id: 3, title: "Services", slug: "services" },
    { id: 4, title: "Contact", slug: "contact" },
    { id: 5, title: "Blog", slug: "blog" },
  ];

  const menus: MenuRecord[] = [
    {
      id: 1,
      name: "Main navigation",
      location: "header_primary",
      items: [
        { id: 11, label: "Home", page_id: 1, url: null, target: "_self", icon: null, children: [] },
        {
          id: 12,
          label: "Services",
          page_id: 3,
          url: null,
          target: "_self",
          icon: null,
          children: [
            { id: 14, label: "Cardiology", url: "/services/cardiology", page_id: null, target: "_self", icon: null, children: [] },
            { id: 15, label: "Pediatrics", url: "/services/pediatrics", page_id: null, target: "_self", icon: null, children: [] },
          ],
        },
        { id: 13, label: "Contact", page_id: 4, url: null, target: "_self", icon: null, children: [] },
      ],
    },
    {
      id: 2,
      name: "Footer quick links",
      location: "footer_quick_links",
      items: [
        { id: 21, label: "About us", page_id: 2, url: null, target: "_self", icon: null, children: [] },
        { id: 22, label: "Careers", url: "https://example.com/careers", page_id: null, target: "_blank", icon: null, children: [] },
      ],
    },
  ];

  const delay = <T,>(value: T): Promise<T> => new Promise((r) => setTimeout(() => r(value), 250));

  return {
    menus: () => delay(structuredClone(menus)),
    pages: () => delay([...pages]),

    async createMenu(name, location) {
      const menu: MenuRecord = { id: nextMenuId++, name, location, items: [] };
      menus.push(menu);
      return delay(structuredClone(menu));
    },

    async deleteMenu(id) {
      const i = menus.findIndex((m) => m.id === id);
      if (i !== -1) menus.splice(i, 1);
      await delay(undefined);
    },

    async saveItems(menuId, items: MenuItemNode[]) {
      const menu = menus.find((m) => m.id === menuId);
      if (!menu) throw new Error("Menu not found");
      menu.items = structuredClone(items);
      return delay(structuredClone(menu));
    },
  };
}

export default function MenuDemo() {
  const api = useMemo(createMockApi, []);

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4">
        <a href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
          ← Dashboard
        </a>
        <span className="text-xs text-slate-400">Demo mode — nothing is persisted</span>
      </header>
      <MenuEditor api={api} title="Menus (demo)" />
    </div>
  );
}
