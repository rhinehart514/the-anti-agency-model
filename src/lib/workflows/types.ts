import { z } from 'zod';

// Trigger Types
export const TriggerTypeEnum = z.enum([
  'form_submit',
  'record_create',
  'record_update',
  'record_delete',
  'user_signup',
  'user_login',
  'order_placed',
  'payment_received',
  'schedule',
  'webhook',
  'manual',
]);

export type TriggerType = z.infer<typeof TriggerTypeEnum>;

// Trigger Configuration
export const FormTriggerConfigSchema = z.object({
  formId: z.string().uuid(),
});

export const RecordTriggerConfigSchema = z.object({
  collectionId: z.string().uuid(),
  filters: z.array(z.record(z.unknown())).optional(),
});

export const ScheduleTriggerConfigSchema = z.object({
  cronExpression: z.string(),
  timezone: z.string().default('UTC'),
});

export const WebhookTriggerConfigSchema = z.object({
  secret: z.string().optional(),
  headers: z.record(z.string()).optional(),
});

// Action Types
export const ActionTypeEnum = z.enum([
  'send_email',
  'send_sms',
  'send_webhook',
  'create_record',
  'update_record',
  'delete_record',
  'add_tag',
  'remove_tag',
  'assign_role',
  'delay',
  'condition',
  'loop',
  'create_task',
  'send_notification',
]);

export type ActionType = z.infer<typeof ActionTypeEnum>;

// Action Configurations
export const EmailActionConfigSchema = z.object({
  to: z.string(), // Can be template: {{user.email}}
  subject: z.string(),
  body: z.string(),
  isHtml: z.boolean().default(true),
  replyTo: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

export const WebhookActionConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  retryCount: z.number().default(3),
});

export const RecordActionConfigSchema = z.object({
  collectionId: z.string().uuid(),
  data: z.record(z.unknown()),
  recordId: z.string().optional(), // For update/delete
});

export const DelayActionConfigSchema = z.object({
  duration: z.number(), // milliseconds
  unit: z.enum(['seconds', 'minutes', 'hours', 'days']).default('minutes'),
});

export const ConditionActionConfigSchema = z.object({
  conditions: z.array(
    z.object({
      field: z.string(),
      operator: z.string(),
      value: z.unknown(),
    })
  ),
  logic: z.enum(['and', 'or']).default('and'),
});

// Workflow Status
export const WorkflowStatusEnum = z.enum(['draft', 'active', 'paused']);
export type WorkflowStatus = z.infer<typeof WorkflowStatusEnum>;

// Workflow Step Schema
export const WorkflowStepSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  actionType: ActionTypeEnum,
  config: z.record(z.unknown()),
  orderIndex: z.number().default(0),
  parentStepId: z.string().uuid().optional(),
  branch: z.enum(['true', 'false', 'loop']).optional(),
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

// Workflow Schema
export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  triggerType: TriggerTypeEnum,
  triggerConfig: z.record(z.unknown()).default({}),
  status: WorkflowStatusEnum.default('draft'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Workflow = z.infer<typeof WorkflowSchema>;

// Workflow with steps
export interface WorkflowWithSteps extends Workflow {
  steps: WorkflowStep[];
}

// Run Status
export const RunStatusEnum = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);
export type RunStatus = z.infer<typeof RunStatusEnum>;

// Workflow Run Schema
export const WorkflowRunSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  triggerData: z.record(z.unknown()).default({}),
  status: RunStatusEnum.default('pending'),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  errorMessage: z.string().optional(),
  stepResults: z.array(
    z.object({
      stepId: z.string(),
      status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
      result: z.unknown().optional(),
      error: z.string().optional(),
      executedAt: z.date().optional(),
    })
  ).default([]),
});

export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;

// Execution context
export interface WorkflowContext {
  workflow: WorkflowWithSteps;
  run: WorkflowRun;
  trigger: {
    type: TriggerType;
    data: Record<string, unknown>;
  };
  variables: Record<string, unknown>;
  siteId: string;
}

// Template rendering
export interface TemplateContext {
  trigger: Record<string, unknown>;
  user?: Record<string, unknown>;
  record?: Record<string, unknown>;
  order?: Record<string, unknown>;
  variables: Record<string, unknown>;
}
