import { z } from 'zod';

// Field Types
export const FieldTypeEnum = z.enum([
  'text',
  'longtext',
  'number',
  'currency',
  'percent',
  'date',
  'datetime',
  'boolean',
  'select',
  'multiselect',
  'email',
  'url',
  'phone',
  'file',
  'image',
  'relation',
  'formula',
  'rollup',
  'lookup',
  'autonumber',
  'json',
]);

export type FieldType = z.infer<typeof FieldTypeEnum>;

// Field Configuration by type
export const SelectConfigSchema = z.object({
  options: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      color: z.string().optional(),
    })
  ),
});

export const RelationConfigSchema = z.object({
  collectionId: z.string().uuid(),
  displayField: z.string(),
  allowMultiple: z.boolean().default(false),
});

export const NumberConfigSchema = z.object({
  precision: z.number().min(0).max(10).default(2),
  min: z.number().optional(),
  max: z.number().optional(),
});

export const CurrencyConfigSchema = z.object({
  currency: z.string().default('USD'),
  precision: z.number().default(2),
});

export const FormulaConfigSchema = z.object({
  formula: z.string(),
  resultType: z.enum(['text', 'number', 'date', 'boolean']),
});

export const FileConfigSchema = z.object({
  maxSize: z.number().default(10 * 1024 * 1024), // 10MB
  allowedTypes: z.array(z.string()).optional(),
  maxFiles: z.number().default(1),
});

// Collection Field Schema
export const CollectionFieldSchema = z.object({
  id: z.string().uuid(),
  collectionId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  type: FieldTypeEnum,
  config: z.record(z.unknown()).default({}),
  isRequired: z.boolean().default(false),
  isUnique: z.boolean().default(false),
  isPrimary: z.boolean().default(false),
  defaultValue: z.unknown().optional(),
  orderIndex: z.number().default(0),
  createdAt: z.date(),
});

export type CollectionField = z.infer<typeof CollectionFieldSchema>;

// Collection Schema
export const CollectionSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  icon: z.string().default('Database'),
  color: z.string().default('#3b82f6'),
  settings: z.record(z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Collection = z.infer<typeof CollectionSchema>;

// Collection with fields
export interface CollectionWithFields extends Collection {
  fields: CollectionField[];
}

// Record Schema
export const CollectionRecordSchema = z.object({
  id: z.string().uuid(),
  collectionId: z.string().uuid(),
  data: z.record(z.unknown()),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CollectionRecord = z.infer<typeof CollectionRecordSchema>;

// View Types
export const ViewTypeEnum = z.enum(['grid', 'kanban', 'calendar', 'gallery', 'list']);
export type ViewType = z.infer<typeof ViewTypeEnum>;

// Filter Operators
export const FilterOperatorEnum = z.enum([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'is_empty',
  'is_not_empty',
  'greater_than',
  'less_than',
  'greater_or_equal',
  'less_or_equal',
  'is_before',
  'is_after',
  'is_between',
]);

export type FilterOperator = z.infer<typeof FilterOperatorEnum>;

// Filter Schema
export const FilterSchema = z.object({
  field: z.string(),
  operator: FilterOperatorEnum,
  value: z.unknown(),
});

export type Filter = z.infer<typeof FilterSchema>;

// Sort Schema
export const SortSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']),
});

export type Sort = z.infer<typeof SortSchema>;

// View Schema
export const CollectionViewSchema = z.object({
  id: z.string().uuid(),
  collectionId: z.string().uuid(),
  name: z.string(),
  type: ViewTypeEnum,
  config: z.record(z.unknown()).default({}),
  filters: z.array(FilterSchema).default([]),
  sorts: z.array(SortSchema).default([]),
  hiddenFields: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
  createdAt: z.date(),
});

export type CollectionView = z.infer<typeof CollectionViewSchema>;

// Query options
export interface QueryOptions {
  filters?: Filter[];
  sorts?: Sort[];
  limit?: number;
  offset?: number;
  fields?: string[];
}

// Field value types for rendering
export type FieldValue = string | number | boolean | Date | null | FieldValue[];

export interface RenderedField {
  field: CollectionField;
  value: FieldValue;
  displayValue: string;
}
