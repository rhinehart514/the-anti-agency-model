import { z } from 'zod';

// Form Field Types
export const FormFieldTypeEnum = z.enum([
  'text',
  'email',
  'phone',
  'number',
  'textarea',
  'select',
  'multiselect',
  'radio',
  'checkbox',
  'toggle',
  'date',
  'time',
  'datetime',
  'file',
  'signature',
  'rating',
  'scale',
  'hidden',
  'heading',
  'paragraph',
  'divider',
]);

export type FormFieldType = z.infer<typeof FormFieldTypeEnum>;

// Validation Schema
export const ValidationSchema = z.object({
  required: z.boolean().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  patternMessage: z.string().optional(),
  email: z.boolean().optional(),
  url: z.boolean().optional(),
});

export type Validation = z.infer<typeof ValidationSchema>;

// Conditional Logic
export const ConditionalLogicSchema = z.object({
  action: z.enum(['show', 'hide', 'require']),
  conditions: z.array(
    z.object({
      field: z.string(),
      operator: z.enum(['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty']),
      value: z.unknown(),
    })
  ),
  logic: z.enum(['and', 'or']).default('and'),
});

export type ConditionalLogic = z.infer<typeof ConditionalLogicSchema>;

// Form Field Config
export const SelectOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const FormFieldConfigSchema = z.object({
  options: z.array(SelectOptionSchema).optional(),
  multiple: z.boolean().optional(),
  accept: z.string().optional(), // file types
  maxFiles: z.number().optional(),
  maxSize: z.number().optional(),
  rows: z.number().optional(), // textarea
  min: z.number().optional(), // rating/scale
  max: z.number().optional(),
  step: z.number().optional(),
  defaultValue: z.unknown().optional(),
});

export type FormFieldConfig = z.infer<typeof FormFieldConfigSchema>;

// Form Field Schema
export const FormFieldSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  type: FormFieldTypeEnum,
  label: z.string(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  config: FormFieldConfigSchema.default({}),
  validation: ValidationSchema.default({}),
  conditionalLogic: ConditionalLogicSchema.optional(),
  orderIndex: z.number().default(0),
});

export type FormField = z.infer<typeof FormFieldSchema>;

// Form Settings Schema
export const FormSettingsSchema = z.object({
  submitButtonText: z.string().default('Submit'),
  successMessage: z.string().default('Thank you for your submission!'),
  redirectUrl: z.string().url().optional(),
  notifyEmails: z.array(z.string().email()).default([]),
  captchaEnabled: z.boolean().default(false),
  honeypotEnabled: z.boolean().default(true),
  doubleOptIn: z.boolean().default(false),
  saveToCollection: z.string().uuid().optional(),
  triggerWorkflow: z.string().uuid().optional(),
});

export type FormSettings = z.infer<typeof FormSettingsSchema>;

// Form Status
export const FormStatusEnum = z.enum(['draft', 'active', 'paused', 'archived']);
export type FormStatus = z.infer<typeof FormStatusEnum>;

// Form Schema
export const FormSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  settings: FormSettingsSchema.default({}),
  status: FormStatusEnum.default('draft'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Form = z.infer<typeof FormSchema>;

// Form with fields
export interface FormWithFields extends Form {
  fields: FormField[];
}

// Submission Status
export const SubmissionStatusEnum = z.enum(['new', 'read', 'replied', 'archived', 'spam']);
export type SubmissionStatus = z.infer<typeof SubmissionStatusEnum>;

// Form Submission Schema
export const FormSubmissionSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  siteUserId: z.string().uuid().optional(),
  data: z.record(z.unknown()),
  metadata: z
    .object({
      referrer: z.string().optional(),
      page: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
    })
    .default({}),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  status: SubmissionStatusEnum.default('new'),
  createdAt: z.date(),
});

export type FormSubmission = z.infer<typeof FormSubmissionSchema>;

// Form rendering types
export interface FormRenderContext {
  form: FormWithFields;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onChange: (field: string, value: unknown) => void;
  onBlur: (field: string) => void;
}
