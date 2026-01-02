import { createClient } from '@/lib/supabase/server';
import { sendWorkflowEmail } from '@/lib/email/send';
import { enqueueDelayedStep, MAX_INLINE_DELAY_MS } from '@/lib/queue/workflow-queue';
import { loggers } from '@/lib/logger';

export type TriggerType =
  | 'form_submit'
  | 'record_create'
  | 'record_update'
  | 'record_delete'
  | 'user_signup'
  | 'user_login'
  | 'order_placed'
  | 'payment_received'
  | 'schedule'
  | 'webhook'
  | 'manual';

export type ActionType =
  | 'send_email'
  | 'send_webhook'
  | 'create_record'
  | 'update_record'
  | 'delete_record'
  | 'add_tag'
  | 'remove_tag'
  | 'assign_role'
  | 'delay'
  | 'condition'
  | 'loop'
  | 'create_task'
  | 'send_notification';

export interface WorkflowContext {
  siteId: string;
  triggerType: TriggerType;
  triggerData: Record<string, any>;
  variables: Record<string, any>;
  executionId: string;
}

export interface StepResult {
  success: boolean;
  output?: Record<string, any>;
  error?: string;
  nextSteps?: string[];
}

// Action handlers
const actionHandlers: Record<ActionType, (config: any, context: WorkflowContext) => Promise<StepResult>> = {
  send_email: async (config, context) => {
    try {
      const { to, subject, body, ctaText, ctaUrl } = config;

      // Interpolate variables in email content
      const interpolatedSubject = interpolateVariables(subject, context.variables);
      const interpolatedBody = interpolateVariables(body, context.variables);
      const interpolatedCtaUrl = ctaUrl ? interpolateVariables(ctaUrl, context.variables) : undefined;
      const recipients = Array.isArray(to) ? to : [to];

      // Send email to each recipient
      const results: Array<{ to: string; success: boolean; error?: string }> = [];

      for (const recipient of recipients) {
        const interpolatedRecipient = interpolateVariables(recipient, context.variables);
        const result = await sendWorkflowEmail(interpolatedRecipient, {
          subject: interpolatedSubject,
          body: interpolatedBody,
          ctaText,
          ctaUrl: interpolatedCtaUrl,
        });
        results.push({
          to: interpolatedRecipient,
          success: result.success,
          error: result.error,
        });
      }

      const allSucceeded = results.every((r) => r.success);

      return {
        success: allSucceeded,
        output: { sent: allSucceeded, recipients: results, subject: interpolatedSubject },
        error: allSucceeded ? undefined : 'Some emails failed to send',
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  send_webhook: async (config, context) => {
    try {
      const { url, method = 'POST', headers = {}, body } = config;
      const interpolatedBody = interpolateVariables(JSON.stringify(body), context.variables);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: interpolatedBody,
      });

      const responseData = await response.json().catch(() => null);

      return {
        success: response.ok,
        output: {
          status: response.status,
          data: responseData,
        },
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  create_record: async (config, context) => {
    try {
      const { collectionId, data } = config;
      const interpolatedData = interpolateVariables(JSON.stringify(data), context.variables);
      const parsedData = JSON.parse(interpolatedData);

      const supabase = await createClient();

      const { data: record, error } = await supabase
        .from('collection_records')
        .insert({
          collection_id: collectionId,
          data: parsedData,
          created_by: 'workflow',
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        output: { recordId: record.id, data: record.data },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  update_record: async (config, context) => {
    try {
      const { recordId, data } = config;
      const interpolatedData = interpolateVariables(JSON.stringify(data), context.variables);
      const parsedData = JSON.parse(interpolatedData);
      const actualRecordId = interpolateVariables(recordId, context.variables);

      const supabase = await createClient();

      const { data: record, error } = await supabase
        .from('collection_records')
        .update({
          data: parsedData,
          updated_by: 'workflow',
          updated_at: new Date().toISOString(),
        })
        .eq('id', actualRecordId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        output: { recordId: record.id, data: record.data },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  delete_record: async (config, context) => {
    try {
      const { recordId } = config;
      const actualRecordId = interpolateVariables(recordId, context.variables);

      const supabase = await createClient();

      const { error } = await supabase
        .from('collection_records')
        .delete()
        .eq('id', actualRecordId);

      if (error) throw error;

      return {
        success: true,
        output: { deleted: true, recordId: actualRecordId },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  add_tag: async (config, context) => {
    try {
      const { userId, tag } = config;
      const actualUserId = interpolateVariables(userId, context.variables);

      const supabase = await createClient();

      // Get current user
      const { data: user, error: userError } = await supabase
        .from('site_users')
        .select('tags')
        .eq('id', actualUserId)
        .single();

      if (userError) throw userError;

      const currentTags = user.tags || [];
      if (!currentTags.includes(tag)) {
        currentTags.push(tag);

        await supabase
          .from('site_users')
          .update({ tags: currentTags })
          .eq('id', actualUserId);
      }

      return {
        success: true,
        output: { userId: actualUserId, tags: currentTags },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  remove_tag: async (config, context) => {
    try {
      const { userId, tag } = config;
      const actualUserId = interpolateVariables(userId, context.variables);

      const supabase = await createClient();

      const { data: user, error: userError } = await supabase
        .from('site_users')
        .select('tags')
        .eq('id', actualUserId)
        .single();

      if (userError) throw userError;

      const currentTags = (user.tags || []).filter((t: string) => t !== tag);

      await supabase
        .from('site_users')
        .update({ tags: currentTags })
        .eq('id', actualUserId);

      return {
        success: true,
        output: { userId: actualUserId, tags: currentTags },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  assign_role: async (config, context) => {
    try {
      const { userId, roleId } = config;
      const actualUserId = interpolateVariables(userId, context.variables);

      const supabase = await createClient();

      // Check if user already has role
      const { data: existing } = await supabase
        .from('site_user_roles')
        .select('id')
        .eq('site_user_id', actualUserId)
        .eq('site_role_id', roleId)
        .single();

      if (!existing) {
        await supabase.from('site_user_roles').insert({
          site_user_id: actualUserId,
          site_role_id: roleId,
        });
      }

      return {
        success: true,
        output: { userId: actualUserId, roleId },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  delay: async (config, context) => {
    try {
      const { duration, unit, nextStepId, nextStepConfig } = config;

      const multipliers: Record<string, number> = {
        seconds: 1000,
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000,
      };

      const ms = duration * (multipliers[unit] || 1000);

      // For short delays, wait directly (within serverless timeout)
      if (ms <= MAX_INLINE_DELAY_MS) {
        await new Promise(resolve => setTimeout(resolve, ms));
        return { success: true, output: { waited: ms, inline: true } };
      }

      // For longer delays, enqueue to Bull queue if available
      if (nextStepId && nextStepConfig) {
        const job = await enqueueDelayedStep({
          siteId: context.siteId,
          workflowId: context.variables.workflowId || '',
          executionId: context.executionId,
          stepId: nextStepId,
          stepConfig: nextStepConfig,
          context: context.variables,
          delayMs: ms,
        });

        if (job) {
          loggers.workflow.info(
            { executionId: context.executionId, delayMs: ms, jobId: job.id },
            'Long delay enqueued to job queue'
          );
          return {
            success: true,
            output: {
              queued: true,
              jobId: job.id,
              resumeAt: new Date(Date.now() + ms).toISOString(),
            },
          };
        }
      }

      // Fallback: log warning that delay cannot be persisted
      loggers.workflow.warn(
        { executionId: context.executionId, delayMs: ms },
        'Long delay requested but Redis not available or no next step configured'
      );
      return {
        success: true,
        output: { scheduled: true, resumeAt: new Date(Date.now() + ms).toISOString() },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  condition: async (config, context) => {
    try {
      const { conditions, logic = 'and' } = config;

      const results = conditions.map((condition: any) => {
        const { field, operator, value } = condition;
        const fieldValue = getNestedValue(context.variables, field);

        switch (operator) {
          case 'equals':
            return fieldValue === value;
          case 'not_equals':
            return fieldValue !== value;
          case 'contains':
            return String(fieldValue).includes(value);
          case 'not_contains':
            return !String(fieldValue).includes(value);
          case 'greater_than':
            return Number(fieldValue) > Number(value);
          case 'less_than':
            return Number(fieldValue) < Number(value);
          case 'is_empty':
            return !fieldValue || fieldValue === '';
          case 'is_not_empty':
            return fieldValue && fieldValue !== '';
          default:
            return false;
        }
      });

      const passed = logic === 'and'
        ? results.every(Boolean)
        : results.some(Boolean);

      return {
        success: true,
        output: { passed, results },
        nextSteps: passed ? config.trueSteps : config.falseSteps,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  loop: async (config, context) => {
    try {
      const { items, variable = 'item', steps } = config;
      const actualItems = typeof items === 'string'
        ? getNestedValue(context.variables, items)
        : items;

      if (!Array.isArray(actualItems)) {
        return { success: false, error: 'Loop items must be an array' };
      }

      // Execute steps for each item
      const results: any[] = [];
      for (const item of actualItems) {
        // Update context with current item
        context.variables[variable] = item;

        // Steps would be executed by the main executor
        results.push({ item, stepsToExecute: steps });
      }

      return {
        success: true,
        output: { itemCount: actualItems.length, results },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  create_task: async (config, context) => {
    try {
      const { title, description, dueDate, assignee } = config;

      const interpolatedTitle = interpolateVariables(title, context.variables);
      const interpolatedDescription = interpolateVariables(description || '', context.variables);

      const supabase = await createClient();

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          site_id: context.siteId,
          title: interpolatedTitle,
          description: interpolatedDescription,
          due_date: dueDate,
          assignee_id: assignee,
          status: 'pending',
          created_by: 'workflow',
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        output: { taskId: task.id, title: interpolatedTitle },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  send_notification: async (config, context) => {
    try {
      const { userId, title, message, type = 'info' } = config;

      const interpolatedTitle = interpolateVariables(title, context.variables);
      const interpolatedMessage = interpolateVariables(message, context.variables);
      const actualUserId = interpolateVariables(userId, context.variables);

      const supabase = await createClient();

      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          site_id: context.siteId,
          user_id: actualUserId,
          title: interpolatedTitle,
          message: interpolatedMessage,
          type,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        output: { notificationId: notification.id },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

// Helper functions
function interpolateVariables(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(variables, path.trim());
    return value !== undefined ? String(value) : match;
  });
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

// Main executor
export async function executeWorkflow(
  workflowId: string,
  triggerType: TriggerType,
  triggerData: Record<string, any>
): Promise<{ success: boolean; executionId: string; results: Record<string, StepResult> }> {
  const supabase = await createClient();

  // Get workflow with steps
  const { data: workflow, error: workflowError } = await supabase
    .from('workflows')
    .select(`
      *,
      workflow_steps (*)
    `)
    .eq('id', workflowId)
    .eq('is_active', true)
    .single();

  if (workflowError || !workflow) {
    throw new Error('Workflow not found or inactive');
  }

  // Create execution record
  const { data: execution, error: execError } = await supabase
    .from('workflow_executions')
    .insert({
      workflow_id: workflowId,
      trigger_type: triggerType,
      trigger_data: triggerData,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (execError) {
    throw new Error('Failed to create execution record');
  }

  const context: WorkflowContext = {
    siteId: workflow.site_id,
    triggerType,
    triggerData,
    variables: {
      trigger: triggerData,
      workflow: { id: workflowId, name: workflow.name },
    },
    executionId: execution.id,
  };

  const results: Record<string, StepResult> = {};
  const steps = workflow.workflow_steps.sort((a: any, b: any) => a.order_index - b.order_index);
  let currentStepIndex = 0;
  let overallSuccess = true;

  try {
    while (currentStepIndex < steps.length) {
      const step = steps[currentStepIndex];
      const handler = actionHandlers[step.action_type as ActionType];

      if (!handler) {
        results[step.id] = { success: false, error: `Unknown action type: ${step.action_type}` };
        overallSuccess = false;
        break;
      }

      // Log step start
      await supabase.from('workflow_step_logs').insert({
        execution_id: execution.id,
        step_id: step.id,
        status: 'running',
        started_at: new Date().toISOString(),
      });

      const result = await handler(step.config, context);
      results[step.id] = result;

      // Update context with step output
      if (result.output) {
        context.variables[`step_${step.id}`] = result.output;
      }

      // Log step completion
      await supabase.from('workflow_step_logs').update({
        status: result.success ? 'completed' : 'failed',
        output: result.output,
        error: result.error,
        completed_at: new Date().toISOString(),
      }).eq('execution_id', execution.id).eq('step_id', step.id);

      if (!result.success) {
        overallSuccess = false;
        if (step.config?.stopOnError !== false) {
          break;
        }
      }

      // Handle conditional branching
      if (result.nextSteps) {
        // Find the indices of the next steps
        const nextIndices = result.nextSteps
          .map((stepId: string) => steps.findIndex((s: any) => s.id === stepId))
          .filter((i: number) => i !== -1);

        if (nextIndices.length > 0) {
          currentStepIndex = Math.min(...nextIndices);
          continue;
        }
      }

      currentStepIndex++;
    }

    // Update execution record
    await supabase
      .from('workflow_executions')
      .update({
        status: overallSuccess ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        result: results,
      })
      .eq('id', execution.id);

    return { success: overallSuccess, executionId: execution.id, results };
  } catch (error: any) {
    await supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: error.message,
      })
      .eq('id', execution.id);

    throw error;
  }
}

// Trigger workflow by event
export async function triggerWorkflows(
  siteId: string,
  triggerType: TriggerType,
  triggerData: Record<string, any>
): Promise<{ executedCount: number; results: Record<string, any> }> {
  const supabase = await createClient();

  // Find active workflows matching this trigger
  const { data: workflows, error } = await supabase
    .from('workflows')
    .select('id, name')
    .eq('site_id', siteId)
    .eq('trigger_type', triggerType)
    .eq('is_active', true);

  if (error || !workflows?.length) {
    return { executedCount: 0, results: {} };
  }

  const results: Record<string, any> = {};

  for (const workflow of workflows) {
    try {
      const result = await executeWorkflow(workflow.id, triggerType, triggerData);
      results[workflow.id] = result;
    } catch (error: any) {
      results[workflow.id] = { success: false, error: error.message };
    }
  }

  return { executedCount: workflows.length, results };
}
