/**
 * TypeScript Design Token Definitions and CSS Variable Reference Map
 */
export const tokens = {
  colors: {
    bg: {
      canvas: "var(--bg-canvas)",
      surface: "var(--bg-surface)",
      surfaceElevated: "var(--bg-surface-elevated)",
      surfaceSubtle: "var(--bg-surface-subtle)",
    },
    fg: {
      default: "var(--fg-default)",
      muted: "var(--fg-muted)",
      subtle: "var(--fg-subtle)",
      inverted: "var(--fg-inverted)",
    },
    border: {
      default: "var(--border-default)",
      subtle: "var(--border-subtle)",
      strong: "var(--border-strong)",
    },
    primary: {
      DEFAULT: "var(--color-primary)",
      hover: "var(--color-primary-hover)",
      fg: "var(--color-primary-fg)",
    },
    secondary: {
      DEFAULT: "var(--color-secondary)",
      hover: "var(--color-secondary-hover)",
      fg: "var(--color-secondary-fg)",
    },
    accent: {
      DEFAULT: "var(--color-accent)",
      hover: "var(--color-accent-hover)",
      fg: "var(--color-accent-fg)",
    },
    semantic: {
      success: "var(--color-success)",
      successBg: "var(--color-success-bg)",
      warning: "var(--color-warning)",
      warningBg: "var(--color-warning-bg)",
      destructive: "var(--color-destructive)",
      destructiveBg: "var(--color-destructive-bg)",
      info: "var(--color-info)",
      infoBg: "var(--color-info-bg)",
    },
    tenant: {
      primary: "var(--tenant-primary)",
      primaryHover: "var(--tenant-primary-hover)",
      primaryFg: "var(--tenant-primary-fg)",
      accent: "var(--tenant-accent)",
      coverOverlay: "var(--tenant-cover-overlay)",
    },
  },
  radii: {
    xs: "var(--radius-xs)",
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    xl: "var(--radius-xl)",
    full: "var(--radius-full)",
  },
  shadows: {
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)",
    xl: "var(--shadow-xl)",
  },
} as const;

export type DesignTokens = typeof tokens;
