import { z, ZodType } from 'zod';
import { ComponentType } from 'react';

// Component Categories
export const COMPONENT_CATEGORIES = [
  'hero',
  'features',
  'testimonials',
  'pricing',
  'contact',
  'footer',
  'navigation',
  'content',
  'cta',
  'gallery',
  'form',
  'stats',
  'team',
  'faq',
] as const;

export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number];

// Editable Field Types
export const EDITABLE_FIELD_TYPES = [
  'text',
  'richtext',
  'url',
  'email',
  'image',
  'icon',
  'color',
  'select',
  'boolean',
  'number',
  'array',
] as const;

export type EditableFieldType = (typeof EDITABLE_FIELD_TYPES)[number];

// Editable Field Definition
export interface EditableFieldDefinition {
  path: string;
  type: EditableFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  itemFields?: EditableFieldDefinition[];
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// Component Definition - what developers register
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ComponentDefinition<TProps = any> {
  id: string;
  category: ComponentCategory;
  name: string;
  description: string;
  thumbnail?: string;
  schema: ZodType<unknown>; // Accept any Zod schema
  defaultProps: TProps;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
  editableFields: EditableFieldDefinition[];
  slots?: SlotDefinition[];
  tags?: string[];
  isPremium?: boolean;
}

// Slot Definition - for nested components
export interface SlotDefinition {
  id: string;
  name: string;
  description?: string;
  allowedCategories?: ComponentCategory[];
  maxItems?: number;
}

// Page Section - instance of a component on a page
export interface PageSection {
  id: string;
  componentId: string;
  orderIndex: number;
  props: Record<string, unknown>;
  styles?: SectionStyles;
  visibility?: SectionVisibility;
}

// Section Styles - per-section style overrides
export interface SectionStyles {
  backgroundColor?: string;
  textColor?: string;
  paddingTop?: string;
  paddingBottom?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  customClasses?: string;
}

// Section Visibility
export interface SectionVisibility {
  visible: boolean;
  mobile?: boolean;
  desktop?: boolean;
}

// Database types (matching Supabase schema)
export interface DbComponentRegistry {
  id: string;
  category: ComponentCategory;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  schema: Record<string, unknown>;
  default_props: Record<string, unknown>;
  editable_fields: EditableFieldDefinition[];
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbPageSection {
  id: string;
  page_id: string;
  component_id: string;
  order_index: number;
  props: Record<string, unknown>;
  styles: SectionStyles | null;
  visibility: SectionVisibility | null;
  created_at: string;
  updated_at: string;
}

export interface DbTheme {
  id: string;
  organization_id: string | null;
  name: string;
  slug: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: Record<string, string>;
  border_radius: Record<string, string>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// Theme Types
export interface ThemeColors {
  primary: ColorScale;
  secondary: ColorScale;
  accent: ColorScale;
  background: string;
  foreground: string;
  muted?: string;
  mutedForeground?: string;
}

export interface ColorScale {
  50?: string;
  100?: string;
  200?: string;
  300?: string;
  400?: string;
  500: string;
  600: string;
  700?: string;
  800?: string;
  900?: string;
}

export interface ThemeTypography {
  fontFamily: {
    heading: string;
    body: string;
    mono?: string;
  };
  fontSize: {
    xs?: string;
    sm?: string;
    base: string;
    lg?: string;
    xl?: string;
    '2xl'?: string;
    '3xl'?: string;
    '4xl'?: string;
    '5xl'?: string;
  };
}

// Common Prop Schemas (reusable)
export const CTASchema = z.object({
  text: z.string(),
  url: z.string(),
  variant: z.enum(['primary', 'secondary', 'outline', 'ghost']).optional(),
});

export const ImageSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const LinkSchema = z.object({
  text: z.string(),
  url: z.string(),
  isExternal: z.boolean().optional(),
});

export type CTA = z.infer<typeof CTASchema>;
export type Image = z.infer<typeof ImageSchema>;
export type Link = z.infer<typeof LinkSchema>;
