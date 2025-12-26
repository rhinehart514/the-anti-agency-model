import { z } from 'zod';

// Color scale schema
export const ColorScaleSchema = z.object({
  50: z.string().optional(),
  100: z.string().optional(),
  200: z.string().optional(),
  300: z.string().optional(),
  400: z.string().optional(),
  500: z.string(),
  600: z.string(),
  700: z.string().optional(),
  800: z.string().optional(),
  900: z.string().optional(),
});

// Theme colors schema
export const ThemeColorsSchema = z.object({
  primary: ColorScaleSchema,
  secondary: ColorScaleSchema,
  accent: ColorScaleSchema,
  background: z.string(),
  foreground: z.string(),
  muted: z.string().optional(),
  mutedForeground: z.string().optional(),
  card: z.string().optional(),
  cardForeground: z.string().optional(),
  border: z.string().optional(),
  success: z.string().optional(),
  warning: z.string().optional(),
  error: z.string().optional(),
});

// Typography schema
export const ThemeTypographySchema = z.object({
  fontFamily: z.object({
    heading: z.string(),
    body: z.string(),
    mono: z.string().optional(),
  }),
  fontSize: z.object({
    xs: z.string().optional(),
    sm: z.string().optional(),
    base: z.string(),
    lg: z.string().optional(),
    xl: z.string().optional(),
    '2xl': z.string().optional(),
    '3xl': z.string().optional(),
    '4xl': z.string().optional(),
    '5xl': z.string().optional(),
    '6xl': z.string().optional(),
  }),
  fontWeight: z.object({
    normal: z.number().optional(),
    medium: z.number().optional(),
    semibold: z.number().optional(),
    bold: z.number().optional(),
  }).optional(),
  lineHeight: z.object({
    tight: z.number().optional(),
    normal: z.number().optional(),
    relaxed: z.number().optional(),
  }).optional(),
});

// Spacing schema
export const ThemeSpacingSchema = z.object({
  section: z.string().optional(),
  container: z.string().optional(),
  gap: z.string().optional(),
});

// Border radius schema
export const ThemeBorderRadiusSchema = z.object({
  none: z.string().optional(),
  sm: z.string().optional(),
  md: z.string().optional(),
  lg: z.string().optional(),
  xl: z.string().optional(),
  full: z.string().optional(),
});

// Full theme schema
export const ThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  colors: ThemeColorsSchema,
  typography: ThemeTypographySchema,
  spacing: ThemeSpacingSchema.optional(),
  borderRadius: ThemeBorderRadiusSchema.optional(),
  isPublic: z.boolean().optional(),
});

// Type exports
export type ColorScale = z.infer<typeof ColorScaleSchema>;
export type ThemeColors = z.infer<typeof ThemeColorsSchema>;
export type ThemeTypography = z.infer<typeof ThemeTypographySchema>;
export type ThemeSpacing = z.infer<typeof ThemeSpacingSchema>;
export type ThemeBorderRadius = z.infer<typeof ThemeBorderRadiusSchema>;
export type Theme = z.infer<typeof ThemeSchema>;

// CSS Variable generation helpers
export function generateColorVars(colors: ThemeColors): Record<string, string> {
  const vars: Record<string, string> = {};

  // Primary colors
  Object.entries(colors.primary).forEach(([shade, value]) => {
    if (value) vars[`--color-primary-${shade}`] = value;
  });

  // Secondary colors
  Object.entries(colors.secondary).forEach(([shade, value]) => {
    if (value) vars[`--color-secondary-${shade}`] = value;
  });

  // Accent colors
  Object.entries(colors.accent).forEach(([shade, value]) => {
    if (value) vars[`--color-accent-${shade}`] = value;
  });

  // Semantic colors
  vars['--color-background'] = colors.background;
  vars['--color-foreground'] = colors.foreground;

  if (colors.muted) vars['--color-muted'] = colors.muted;
  if (colors.mutedForeground) vars['--color-muted-foreground'] = colors.mutedForeground;
  if (colors.card) vars['--color-card'] = colors.card;
  if (colors.cardForeground) vars['--color-card-foreground'] = colors.cardForeground;
  if (colors.border) vars['--color-border'] = colors.border;
  if (colors.success) vars['--color-success'] = colors.success;
  if (colors.warning) vars['--color-warning'] = colors.warning;
  if (colors.error) vars['--color-error'] = colors.error;

  return vars;
}

export function generateTypographyVars(typography: ThemeTypography): Record<string, string> {
  const vars: Record<string, string> = {};

  // Font families
  vars['--font-heading'] = typography.fontFamily.heading;
  vars['--font-body'] = typography.fontFamily.body;
  if (typography.fontFamily.mono) vars['--font-mono'] = typography.fontFamily.mono;

  // Font sizes
  Object.entries(typography.fontSize).forEach(([size, value]) => {
    if (value) vars[`--font-size-${size}`] = value;
  });

  // Font weights
  if (typography.fontWeight) {
    Object.entries(typography.fontWeight).forEach(([weight, value]) => {
      if (value) vars[`--font-weight-${weight}`] = String(value);
    });
  }

  // Line heights
  if (typography.lineHeight) {
    Object.entries(typography.lineHeight).forEach(([key, value]) => {
      if (value) vars[`--line-height-${key}`] = String(value);
    });
  }

  return vars;
}

export function generateThemeVars(theme: Theme): Record<string, string> {
  return {
    ...generateColorVars(theme.colors),
    ...generateTypographyVars(theme.typography),
  };
}
