import type { DesignTokens } from "./types";

/**
 * Website theme settings - stored as the `theme` group in website_settings.
 * These override the active template's design_tokens. The same mapping
 * (themeToCssVars) powers the public renderer and the customizer's live
 * preview, so what admins see is exactly what ships.
 */
export interface ThemeSettings {
  mode?: "light" | "dark";
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
  typography?: {
    heading_font?: string;
    body_font?: string;
    base_size?: number; // px
  };
  buttons?: {
    radius?: number; // px
  };
  layout?: {
    max_width?: number | null; // px content width; null/undefined = template default
  };
}

/** Font stacks that render without loading external font files. */
export const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Template default" },
  { value: "system-ui, -apple-system, 'Segoe UI', sans-serif", label: "System Sans (modern)" },
  { value: "Arial, Helvetica, sans-serif", label: "Arial / Helvetica" },
  { value: "Verdana, Geneva, sans-serif", label: "Verdana" },
  { value: "'Trebuchet MS', 'Segoe UI', sans-serif", label: "Trebuchet" },
  { value: "Georgia, 'Times New Roman', serif", label: "Georgia (serif)" },
  { value: "'Palatino Linotype', Palatino, Georgia, serif", label: "Palatino (serif)" },
  { value: "'Times New Roman', Times, serif", label: "Times" },
  { value: "'Courier New', Courier, monospace", label: "Courier (mono)" },
];

const MODE_PRESETS = {
  light: { bg: "#ffffff", text: "#0f172a", surface: "#ffffff", surfaceAlt: "#f8fafc", muted: "#475569", border: "#e2e8f0" },
  dark: { bg: "#0b1220", text: "#e2e8f0", surface: "#1e293b", surfaceAlt: "#111c33", muted: "#94a3b8", border: "#334155" },
} as const;

/**
 * Resolve template tokens + per-website theme overrides into the CSS custom
 * properties consumed by the block components and `.themed` styles.
 */
export function themeToCssVars(tokens?: DesignTokens | null, theme?: ThemeSettings | null): Record<string, string> {
  const preset = MODE_PRESETS[theme?.mode === "dark" ? "dark" : "light"];
  const colors = theme?.colors ?? {};
  const base = tokens?.colors ?? {};
  const templateTypography = tokens?.typography ?? {};
  const templateRadius = tokens?.radius ?? "0.75rem";

  return {
    "--color-primary": colors.primary ?? base.primary ?? "#0e7490",
    "--color-secondary": colors.secondary ?? base.secondary ?? "#0f172a",
    "--color-accent": colors.accent ?? base.accent ?? "#22d3ee",
    "--color-bg": colors.background ?? preset.bg,
    "--color-text": colors.text ?? preset.text,
    "--color-surface": preset.surface,
    "--color-surface-alt": preset.surfaceAlt,
    "--color-muted": preset.muted,
    "--color-border": preset.border,
    "--font-heading": theme?.typography?.heading_font || templateTypography.heading || "inherit",
    "--font-body": theme?.typography?.body_font || templateTypography.body || "inherit",
    "--text-base": `${theme?.typography?.base_size ?? 16}px`,
    "--btn-radius": theme?.buttons?.radius === undefined ? templateRadius : `${theme.buttons.radius}px`,
    "--card-radius": templateRadius,
    "--content-max": theme?.layout?.max_width ? `${theme.layout.max_width}px` : "72rem",
  };
}
