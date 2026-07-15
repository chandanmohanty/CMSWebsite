import type { MediaApi, MediaFolderNode, MediaItem } from "./media-api";

/**
 * In-memory MediaApi used by the demo routes (/admin/media-demo and the
 * builder demo's media picker). Uploads use object URLs so real local files
 * preview instantly; nothing is persisted.
 */

const svgThumb = (label: string, bg: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="${bg}"/><text x="200" y="158" font-family="sans-serif" font-size="28" fill="white" text-anchor="middle">${label}</text></svg>`
  )}`;

export function createMockMediaApi(): MediaApi {
  let nextId = 100;
  let nextFolderId = 10;

  const folders: MediaFolderNode[] = [
    { id: 1, name: "Hero banners", parent_id: null, children: [{ id: 3, name: "Homepage", parent_id: 1, children: [] }] },
    { id: 2, name: "Team photos", parent_id: null, children: [] },
  ];

  const items: MediaItem[] = [
    { id: 1, url: svgThumb("Hero 1", "#0e7490"), file_name: "hero-clinic.jpg", mime_type: "image/jpeg", type: "image", size: 482_000, width: 1920, height: 1080, alt: "Clinic exterior", folder_id: 1, source: "upload", conversions: null },
    { id: 2, url: svgThumb("Hero 2", "#0f766e"), file_name: "hero-doctors.jpg", mime_type: "image/jpeg", type: "image", size: 391_000, width: 1920, height: 1080, alt: null, folder_id: 1, source: "ai", conversions: null },
    { id: 3, url: svgThumb("Dr. Rao", "#7c3aed"), file_name: "dr-rao.jpg", mime_type: "image/jpeg", type: "image", size: 120_000, width: 800, height: 800, alt: "Dr. Rao portrait", folder_id: 2, source: "upload", conversions: null },
    { id: 4, url: "#", file_name: "brochure-2026.pdf", mime_type: "application/pdf", type: "pdf", size: 2_400_000, folder_id: null, source: "upload", conversions: null },
    { id: 5, url: "#", file_name: "welcome-tour.mp4", mime_type: "video/mp4", type: "video", size: 18_500_000, folder_id: null, source: "upload", conversions: null },
    { id: 6, url: svgThumb("Logo", "#334155"), file_name: "logo.svg", mime_type: "image/svg+xml", type: "svg", size: 4_200, folder_id: null, source: "upload", conversions: null },
  ];

  const delay = <T,>(value: T): Promise<T> => new Promise((r) => setTimeout(() => r(value), 250));

  return {
    async list({ folder_id, type, search }) {
      let data = [...items];
      if (folder_id != null) data = data.filter((m) => m.folder_id === folder_id);
      if (type) data = data.filter((m) => m.type === type);
      if (search) data = data.filter((m) => m.file_name.toLowerCase().includes(search.toLowerCase()));
      return delay({ data, hasMore: false });
    },

    async upload(files, folderId) {
      const created = files.map((file): MediaItem => {
        const isImage = file.type.startsWith("image/");
        return {
          id: nextId++,
          url: isImage ? URL.createObjectURL(file) : "#",
          file_name: file.name,
          mime_type: file.type || "application/octet-stream",
          type:
            file.type === "image/svg+xml" ? "svg"
            : isImage ? "image"
            : file.type.startsWith("video/") ? "video"
            : file.type.startsWith("audio/") ? "audio"
            : file.type === "application/pdf" ? "pdf"
            : "document",
          size: file.size,
          folder_id: folderId,
          source: "upload",
          conversions: null,
        };
      });
      items.unshift(...created);
      return delay(created);
    },

    async update(id, patch) {
      const item = items.find((m) => m.id === id);
      if (!item) throw new Error("Not found");
      Object.assign(item, patch);
      return delay({ ...item });
    },

    async remove(id) {
      const i = items.findIndex((m) => m.id === id);
      if (i !== -1) items.splice(i, 1);
      await delay(undefined);
    },

    async folders() {
      return delay(structuredClone(folders));
    },

    async createFolder(name, parentId) {
      const node: MediaFolderNode = { id: nextFolderId++, name, parent_id: parentId, children: [] };
      if (parentId == null) {
        folders.push(node);
      } else {
        const attach = (nodes: MediaFolderNode[]): boolean =>
          nodes.some((n) => (n.id === parentId ? ((n.children = [...(n.children ?? []), node]), true) : attach(n.children ?? [])));
        attach(folders);
      }
      return delay(node);
    },

    async removeFolder(id) {
      const prune = (nodes: MediaFolderNode[]): MediaFolderNode[] =>
        nodes.filter((n) => n.id !== id).map((n) => ({ ...n, children: prune(n.children ?? []) }));
      folders.splice(0, folders.length, ...prune(folders));
      items.forEach((m) => {
        if (m.folder_id === id) m.folder_id = null;
      });
      await delay(undefined);
    },
  };
}
