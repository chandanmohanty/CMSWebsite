import { API_URL, adminApiUrl, adminFetch } from "./api";

export interface MediaItem {
  id: number;
  url: string;
  file_name: string;
  mime_type: string;
  type: string; // image | video | pdf | document | audio | svg
  size: number;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  folder_id?: number | null;
  conversions?: { thumbnail?: string } | null;
  source: string; // upload | ai
  created_at?: string;
}

export interface MediaFolderNode {
  id: number;
  name: string;
  parent_id: number | null;
  children?: MediaFolderNode[];
}

export interface MediaListParams {
  folder_id?: number | null;
  type?: string;
  search?: string;
  page?: number;
}

/**
 * Abstraction over the media endpoints so the library UI can run against the
 * real Laravel API or an in-memory mock (see /admin/media-demo).
 */
export interface MediaApi {
  list(params: MediaListParams): Promise<{ data: MediaItem[]; hasMore: boolean }>;
  upload(files: File[], folderId: number | null): Promise<MediaItem[]>;
  update(id: number, patch: { alt?: string; folder_id?: number | null }): Promise<MediaItem>;
  remove(id: number): Promise<void>;
  folders(): Promise<MediaFolderNode[]>;
  createFolder(name: string, parentId: number | null): Promise<MediaFolderNode>;
  removeFolder(id: number): Promise<void>;
}

/** Best displayable image URL for a media item (optimized thumbnail when available). */
export function thumbnailUrl(item: MediaItem): string {
  if (item.conversions?.thumbnail) {
    return `${API_URL}/storage/${item.conversions.thumbnail}`;
  }
  return item.url;
}

export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
}

export const realMediaApi: MediaApi = {
  async list(params) {
    const query = new URLSearchParams({ per_page: "40", page: String(params.page ?? 1) });
    if (params.folder_id != null) query.set("folder_id", String(params.folder_id));
    if (params.type) query.set("type", params.type);
    if (params.search) query.set("search", params.search);

    const res = await adminFetch<Paginated<MediaItem>>(`media?${query}`);
    return { data: res.data, hasMore: res.current_page < res.last_page };
  },

  async upload(files, folderId) {
    // FormData upload - must NOT go through adminFetch (which forces a JSON content type).
    const form = new FormData();
    files.forEach((file) => form.append("files[]", file));
    if (folderId != null) form.append("folder_id", String(folderId));

    const token = typeof window !== "undefined" ? localStorage.getItem("cms_token") : null;
    const res = await fetch(adminApiUrl("media"), {
      method: "POST",
      headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: form,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { message?: string }).message ?? `Upload failed (${res.status})`);
    }

    return (await res.json()) as MediaItem[];
  },

  update: (id, patch) => adminFetch<MediaItem>(`media/${id}`, { method: "PUT", body: JSON.stringify(patch) }),

  remove: async (id) => {
    await adminFetch(`media/${id}`, { method: "DELETE" });
  },

  folders: () => adminFetch<MediaFolderNode[]>("media-folders"),

  createFolder: (name, parentId) =>
    adminFetch<MediaFolderNode>("media-folders", { method: "POST", body: JSON.stringify({ name, parent_id: parentId }) }),

  removeFolder: async (id) => {
    await adminFetch(`media-folders/${id}`, { method: "DELETE" });
  },
};
