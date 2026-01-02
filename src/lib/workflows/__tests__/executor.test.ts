import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeWorkflow,
  triggerWorkflows,
  type WorkflowContext,
} from '../executor';

// Mock dependencies
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('@/lib/email/send', () => ({
  sendWorkflowEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock fetch for webhook tests
global.fetch = vi.fn();

const SITE_ID = 'site-123';
const WORKFLOW_ID = 'workflow-123';
const EXECUTION_ID = 'execution-123';

// Helper to create chainable mock
function createChainable(returnValue: { data: unknown; error: unknown }) {
  const chainable: Record<string, unknown> = {};
  chainable.select = vi.fn().mockReturnValue(chainable);
  chainable.insert = vi.fn().mockReturnValue(chainable);
  chainable.update = vi.fn().mockReturnValue(chainable);
  chainable.delete = vi.fn().mockReturnValue(chainable);
  chainable.eq = vi.fn().mockReturnValue(chainable);
  chainable.single = vi.fn().mockResolvedValue(returnValue);
  chainable.then = (resolve: (value: unknown) => void) => {
    resolve(returnValue);
  };
  return chainable;
}

// Mock workflow data
const mockWorkflow = {
  id: WORKFLOW_ID,
  site_id: SITE_ID,
  name: 'Test Workflow',
  trigger_type: 'form_submit',
  is_active: true,
  workflow_steps: [
    {
      id: 'step-1',
      order_index: 0,
      action_type: 'send_email',
      config: {
        to: '{{trigger.email}}',
        subject: 'Welcome {{trigger.name}}!',
        body: 'Thanks for signing up!',
      },
    },
  ],
};

const mockExecution = {
  id: EXECUTION_ID,
  workflow_id: WORKFLOW_ID,
  status: 'running',
  started_at: new Date().toISOString(),
};

describe('Workflow Executor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeWorkflow', () => {
    it('throws error when workflow not found', async () => {
      mockSupabase.from.mockReturnValue(
        createChainable({ data: null, error: { message: 'Not found' } })
      );

      await expect(
        executeWorkflow(WORKFLOW_ID, 'form_submit', {})
      ).rejects.toThrow('Workflow not found or inactive');
    });

    it('throws error when workflow is inactive', async () => {
      const inactiveWorkflow = { ...mockWorkflow, is_active: false };
      mockSupabase.from.mockReturnValue(
        createChainable({ data: null, error: null })
      );

      await expect(
        executeWorkflow(WORKFLOW_ID, 'form_submit', {})
      ).rejects.toThrow('Workflow not found or inactive');
    });

    it('creates execution record before running', async () => {
      // Workflow query
      const workflowQuery = createChainable({ data: mockWorkflow, error: null });

      // Execution insert
      const executionInsert = createChainable({ data: mockExecution, error: null });

      // Step logs insert
      const stepLogsInsert = createChainable({ error: null } as any);

      // Step logs update
      const stepLogsUpdate = createChainable({ error: null } as any);

      // Execution update
      const executionUpdate = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery) // workflows.select
        .mockReturnValueOnce(executionInsert) // workflow_executions.insert
        .mockReturnValueOnce(stepLogsInsert) // workflow_step_logs.insert
        .mockReturnValueOnce(stepLogsUpdate) // workflow_step_logs.update
        .mockReturnValueOnce(executionUpdate); // workflow_executions.update

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {
        email: 'test@example.com',
        name: 'John',
      });

      expect(result.executionId).toBe(EXECUTION_ID);
      expect(result.success).toBe(true);
    });

    it('executes steps in order', async () => {
      const multiStepWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          { id: 'step-1', order_index: 0, action_type: 'delay', config: { duration: 0, unit: 'seconds' } },
          { id: 'step-2', order_index: 1, action_type: 'delay', config: { duration: 0, unit: 'seconds' } },
        ],
      };

      const workflowQuery = createChainable({ data: multiStepWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);
      const executionUpdate = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {});

      expect(result.success).toBe(true);
      expect(result.results).toHaveProperty('step-1');
      expect(result.results).toHaveProperty('step-2');
    });

    it('stops on error when stopOnError is not false', async () => {
      const failingWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          { id: 'step-1', order_index: 0, action_type: 'unknown_action' as any, config: {} },
          { id: 'step-2', order_index: 1, action_type: 'delay', config: { duration: 0, unit: 'seconds' } },
        ],
      };

      const workflowQuery = createChainable({ data: failingWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {});

      expect(result.success).toBe(false);
      expect(result.results['step-1'].error).toContain('Unknown action type');
      expect(result.results).not.toHaveProperty('step-2');
    });

    it('adds step output to context variables', async () => {
      const workflowWithOutput = {
        ...mockWorkflow,
        workflow_steps: [
          { id: 'step-1', order_index: 0, action_type: 'delay', config: { duration: 0, unit: 'seconds' } },
        ],
      };

      const workflowQuery = createChainable({ data: workflowWithOutput, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {});

      expect(result.results['step-1'].output).toBeDefined();
    });
  });

  describe('triggerWorkflows', () => {
    it('returns zero count when no workflows found', async () => {
      mockSupabase.from.mockReturnValue(
        createChainable({ data: [], error: null })
      );

      const result = await triggerWorkflows(SITE_ID, 'form_submit', {});

      expect(result.executedCount).toBe(0);
      expect(result.results).toEqual({});
    });

    it('returns zero count on database error', async () => {
      mockSupabase.from.mockReturnValue(
        createChainable({ data: null, error: { message: 'Error' } })
      );

      const result = await triggerWorkflows(SITE_ID, 'form_submit', {});

      expect(result.executedCount).toBe(0);
    });

    it('executes all matching workflows', async () => {
      // First call: find matching workflows
      const workflowsQuery: Record<string, unknown> = {};
      workflowsQuery.select = vi.fn().mockReturnValue(workflowsQuery);
      workflowsQuery.eq = vi.fn().mockReturnValue(workflowsQuery);
      workflowsQuery.then = (resolve: (value: unknown) => void) => {
        resolve({
          data: [
            { id: 'workflow-1', name: 'Workflow 1' },
            { id: 'workflow-2', name: 'Workflow 2' },
          ],
          error: null,
        });
      };

      // Subsequent calls: get each workflow and execute
      const workflowQuery = createChainable({
        data: { ...mockWorkflow, workflow_steps: [] },
        error: null,
      });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const executionUpdate = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowsQuery) // Find workflows
        .mockReturnValueOnce(workflowQuery) // Get workflow 1
        .mockReturnValueOnce(executionInsert) // Create execution 1
        .mockReturnValueOnce(executionUpdate) // Update execution 1
        .mockReturnValueOnce(workflowQuery) // Get workflow 2
        .mockReturnValueOnce(executionInsert) // Create execution 2
        .mockReturnValueOnce(executionUpdate); // Update execution 2

      const result = await triggerWorkflows(SITE_ID, 'form_submit', {});

      expect(result.executedCount).toBe(2);
      expect(Object.keys(result.results)).toHaveLength(2);
    });

    it('catches errors for individual workflows', async () => {
      const workflowsQuery: Record<string, unknown> = {};
      workflowsQuery.select = vi.fn().mockReturnValue(workflowsQuery);
      workflowsQuery.eq = vi.fn().mockReturnValue(workflowsQuery);
      workflowsQuery.then = (resolve: (value: unknown) => void) => {
        resolve({
          data: [{ id: 'workflow-1', name: 'Workflow 1' }],
          error: null,
        });
      };

      // Workflow query fails
      const failingWorkflowQuery = createChainable({
        data: null,
        error: { message: 'Not found' },
      });

      mockSupabase.from
        .mockReturnValueOnce(workflowsQuery)
        .mockReturnValueOnce(failingWorkflowQuery);

      const result = await triggerWorkflows(SITE_ID, 'form_submit', {});

      expect(result.executedCount).toBe(1);
      expect(result.results['workflow-1'].success).toBe(false);
    });
  });
});

describe('Action Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('send_email', () => {
    it('sends email to single recipient', async () => {
      const { sendWorkflowEmail } = await import('@/lib/email/send');

      const workflowQuery = createChainable({ data: mockWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      await executeWorkflow(WORKFLOW_ID, 'form_submit', {
        email: 'test@example.com',
        name: 'John',
      });

      expect(sendWorkflowEmail).toHaveBeenCalledWith('test@example.com', {
        subject: 'Welcome John!',
        body: 'Thanks for signing up!',
        ctaText: undefined,
        ctaUrl: undefined,
      });
    });

    it('sends email to multiple recipients', async () => {
      const { sendWorkflowEmail } = await import('@/lib/email/send');

      const multiRecipientWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'send_email',
            config: {
              to: ['user1@example.com', 'user2@example.com'],
              subject: 'Hello',
              body: 'Message',
            },
          },
        ],
      };

      const workflowQuery = createChainable({ data: multiRecipientWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      await executeWorkflow(WORKFLOW_ID, 'form_submit', {});

      expect(sendWorkflowEmail).toHaveBeenCalledTimes(2);
    });
  });

  describe('send_webhook', () => {
    it('sends webhook with correct payload', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ received: true }),
      } as Response);

      const webhookWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'send_webhook',
            config: {
              url: 'https://example.com/webhook',
              method: 'POST',
              body: { name: '{{trigger.name}}' },
            },
          },
        ],
      };

      const workflowQuery = createChainable({ data: webhookWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {
        name: 'John',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result.success).toBe(true);
    });

    it('handles webhook failure', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      } as Response);

      const webhookWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'send_webhook',
            config: {
              url: 'https://example.com/webhook',
              body: {},
            },
          },
        ],
      };

      const workflowQuery = createChainable({ data: webhookWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {});

      expect(result.success).toBe(false);
      expect(result.results['step-1'].error).toContain('HTTP 500');
    });
  });

  describe('delay', () => {
    it('waits for short delays', async () => {
      const delayWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'delay',
            config: { duration: 0, unit: 'seconds' },
          },
        ],
      };

      const workflowQuery = createChainable({ data: delayWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {});

      expect(result.success).toBe(true);
      expect(result.results['step-1'].output?.waited).toBe(0);
    });

    it('schedules long delays for later', async () => {
      const delayWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'delay',
            config: { duration: 1, unit: 'hours' },
          },
        ],
      };

      const workflowQuery = createChainable({ data: delayWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {});

      expect(result.success).toBe(true);
      expect(result.results['step-1'].output?.scheduled).toBe(true);
      expect(result.results['step-1'].output?.resumeAt).toBeDefined();
    });
  });

  describe('condition', () => {
    it('evaluates equals condition correctly', async () => {
      const conditionWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'condition',
            config: {
              conditions: [{ field: 'trigger.status', operator: 'equals', value: 'active' }],
              logic: 'and',
              trueSteps: ['step-true'],
              falseSteps: ['step-false'],
            },
          },
        ],
      };

      const workflowQuery = createChainable({ data: conditionWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {
        status: 'active',
      });

      expect(result.results['step-1'].output?.passed).toBe(true);
    });

    it('evaluates not_equals condition', async () => {
      const conditionWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'condition',
            config: {
              conditions: [{ field: 'trigger.status', operator: 'not_equals', value: 'inactive' }],
              logic: 'and',
            },
          },
        ],
      };

      const workflowQuery = createChainable({ data: conditionWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {
        status: 'active',
      });

      expect(result.results['step-1'].output?.passed).toBe(true);
    });

    it('evaluates contains condition', async () => {
      const conditionWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'condition',
            config: {
              conditions: [{ field: 'trigger.email', operator: 'contains', value: '@example' }],
              logic: 'and',
            },
          },
        ],
      };

      const workflowQuery = createChainable({ data: conditionWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {
        email: 'test@example.com',
      });

      expect(result.results['step-1'].output?.passed).toBe(true);
    });

    it('evaluates greater_than condition', async () => {
      const conditionWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'condition',
            config: {
              conditions: [{ field: 'trigger.amount', operator: 'greater_than', value: 100 }],
              logic: 'and',
            },
          },
        ],
      };

      const workflowQuery = createChainable({ data: conditionWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {
        amount: 150,
      });

      expect(result.results['step-1'].output?.passed).toBe(true);
    });

    it('evaluates is_empty condition', async () => {
      const conditionWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'condition',
            config: {
              conditions: [{ field: 'trigger.missing', operator: 'is_empty', value: null }],
              logic: 'and',
            },
          },
        ],
      };

      const workflowQuery = createChainable({ data: conditionWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {});

      expect(result.results['step-1'].output?.passed).toBe(true);
    });

    it('uses OR logic when specified', async () => {
      const conditionWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'condition',
            config: {
              conditions: [
                { field: 'trigger.a', operator: 'equals', value: 'x' },
                { field: 'trigger.b', operator: 'equals', value: 'y' },
              ],
              logic: 'or',
            },
          },
        ],
      };

      const workflowQuery = createChainable({ data: conditionWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      // Only 'a' matches, but OR logic should pass
      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {
        a: 'x',
        b: 'z',
      });

      expect(result.results['step-1'].output?.passed).toBe(true);
    });
  });

  describe('loop', () => {
    it('iterates over array items', async () => {
      const loopWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'loop',
            config: {
              items: 'trigger.items',
              variable: 'currentItem',
              steps: ['step-inner'],
            },
          },
        ],
      };

      const workflowQuery = createChainable({ data: loopWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {
        items: ['a', 'b', 'c'],
      });

      expect(result.success).toBe(true);
      expect(result.results['step-1'].output?.itemCount).toBe(3);
    });

    it('fails when items is not an array', async () => {
      const loopWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'loop',
            config: {
              items: 'trigger.notAnArray',
              variable: 'item',
              steps: [],
            },
          },
        ],
      };

      const workflowQuery = createChainable({ data: loopWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {
        notAnArray: 'string value',
      });

      expect(result.success).toBe(false);
      expect(result.results['step-1'].error).toBe('Loop items must be an array');
    });
  });

  describe('create_record', () => {
    it('creates record in collection', async () => {
      const createRecordWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'create_record',
            config: {
              collectionId: 'collection-123',
              data: { name: '{{trigger.name}}', email: '{{trigger.email}}' },
            },
          },
        ],
      };

      const workflowQuery = createChainable({ data: createRecordWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);
      const recordInsert = createChainable({
        data: { id: 'record-123', data: { name: 'John', email: 'john@example.com' } },
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValueOnce(stepLogsChain) // insert step log
        .mockReturnValueOnce(recordInsert) // collection_records.insert
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {
        name: 'John',
        email: 'john@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.results['step-1'].output?.recordId).toBe('record-123');
    });
  });

  describe('add_tag', () => {
    it('adds tag to user', async () => {
      const addTagWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'add_tag',
            config: { userId: '{{trigger.userId}}', tag: 'premium' },
          },
        ],
      };

      const workflowQuery = createChainable({ data: addTagWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);
      const userSelect = createChainable({ data: { tags: ['existing'] }, error: null });
      const userUpdate = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValueOnce(stepLogsChain)
        .mockReturnValueOnce(userSelect) // site_users.select
        .mockReturnValueOnce(userUpdate) // site_users.update
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {
        userId: 'user-123',
      });

      expect(result.success).toBe(true);
      expect(result.results['step-1'].output?.tags).toContain('premium');
    });

    it('does not duplicate existing tags', async () => {
      const addTagWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'add_tag',
            config: { userId: '{{trigger.userId}}', tag: 'existing' },
          },
        ],
      };

      const workflowQuery = createChainable({ data: addTagWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);
      const userSelect = createChainable({ data: { tags: ['existing'] }, error: null });

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValueOnce(stepLogsChain)
        .mockReturnValueOnce(userSelect) // Only select, no update needed
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {
        userId: 'user-123',
      });

      expect(result.success).toBe(true);
      // Tags array should still be length 1 (not duplicated)
      expect(result.results['step-1'].output?.tags).toEqual(['existing']);
    });
  });

  describe('remove_tag', () => {
    it('removes tag from user', async () => {
      const removeTagWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'remove_tag',
            config: { userId: '{{trigger.userId}}', tag: 'old-tag' },
          },
        ],
      };

      const workflowQuery = createChainable({ data: removeTagWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);
      const userSelect = createChainable({ data: { tags: ['old-tag', 'keep-tag'] }, error: null });
      const userUpdate = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValueOnce(stepLogsChain)
        .mockReturnValueOnce(userSelect)
        .mockReturnValueOnce(userUpdate)
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {
        userId: 'user-123',
      });

      expect(result.success).toBe(true);
      expect(result.results['step-1'].output?.tags).toEqual(['keep-tag']);
    });
  });

  describe('assign_role', () => {
    it('assigns role to user when not already assigned', async () => {
      const assignRoleWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'assign_role',
            config: { userId: '{{trigger.userId}}', roleId: 'role-123' },
          },
        ],
      };

      const workflowQuery = createChainable({ data: assignRoleWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);
      const roleCheck = createChainable({ data: null, error: null }); // No existing role
      const roleInsert = createChainable({ error: null } as any);

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValueOnce(stepLogsChain)
        .mockReturnValueOnce(roleCheck) // Check existing role
        .mockReturnValueOnce(roleInsert) // Insert role
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {
        userId: 'user-123',
      });

      expect(result.success).toBe(true);
      expect(result.results['step-1'].output?.roleId).toBe('role-123');
    });

    it('skips insert if role already assigned', async () => {
      const assignRoleWorkflow = {
        ...mockWorkflow,
        workflow_steps: [
          {
            id: 'step-1',
            order_index: 0,
            action_type: 'assign_role',
            config: { userId: '{{trigger.userId}}', roleId: 'role-123' },
          },
        ],
      };

      const workflowQuery = createChainable({ data: assignRoleWorkflow, error: null });
      const executionInsert = createChainable({ data: mockExecution, error: null });
      const stepLogsChain = createChainable({ error: null } as any);
      const roleCheck = createChainable({ data: { id: 'existing' }, error: null }); // Has role

      mockSupabase.from
        .mockReturnValueOnce(workflowQuery)
        .mockReturnValueOnce(executionInsert)
        .mockReturnValueOnce(stepLogsChain)
        .mockReturnValueOnce(roleCheck) // Check existing role - already has it
        .mockReturnValue(stepLogsChain);

      const result = await executeWorkflow(WORKFLOW_ID, 'form_submit', {
        userId: 'user-123',
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('Variable Interpolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('interpolates trigger variables in email subject', async () => {
    const { sendWorkflowEmail } = await import('@/lib/email/send');

    const workflowQuery = createChainable({ data: mockWorkflow, error: null });
    const executionInsert = createChainable({ data: mockExecution, error: null });
    const stepLogsChain = createChainable({ error: null } as any);

    mockSupabase.from
      .mockReturnValueOnce(workflowQuery)
      .mockReturnValueOnce(executionInsert)
      .mockReturnValue(stepLogsChain);

    await executeWorkflow(WORKFLOW_ID, 'form_submit', {
      email: 'test@example.com',
      name: 'John Doe',
    });

    expect(sendWorkflowEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.objectContaining({
        subject: 'Welcome John Doe!',
      })
    );
  });

  it('handles nested variable paths', async () => {
    const { sendWorkflowEmail } = await import('@/lib/email/send');

    const nestedVarWorkflow = {
      ...mockWorkflow,
      workflow_steps: [
        {
          id: 'step-1',
          order_index: 0,
          action_type: 'send_email',
          config: {
            to: '{{trigger.user.email}}',
            subject: 'Hello {{trigger.user.name}}',
            body: 'Your order #{{trigger.order.id}} is ready',
          },
        },
      ],
    };

    const workflowQuery = createChainable({ data: nestedVarWorkflow, error: null });
    const executionInsert = createChainable({ data: mockExecution, error: null });
    const stepLogsChain = createChainable({ error: null } as any);

    mockSupabase.from
      .mockReturnValueOnce(workflowQuery)
      .mockReturnValueOnce(executionInsert)
      .mockReturnValue(stepLogsChain);

    await executeWorkflow(WORKFLOW_ID, 'form_submit', {
      user: { email: 'deep@example.com', name: 'Deep User' },
      order: { id: 'ORD-123' },
    });

    expect(sendWorkflowEmail).toHaveBeenCalledWith('deep@example.com', {
      subject: 'Hello Deep User',
      body: 'Your order #ORD-123 is ready',
      ctaText: undefined,
      ctaUrl: undefined,
    });
  });

  it('preserves unmatched variables in template', async () => {
    const { sendWorkflowEmail } = await import('@/lib/email/send');

    const unmatchedVarWorkflow = {
      ...mockWorkflow,
      workflow_steps: [
        {
          id: 'step-1',
          order_index: 0,
          action_type: 'send_email',
          config: {
            to: 'test@example.com',
            subject: 'Value: {{trigger.missing}}',
            body: 'Body',
          },
        },
      ],
    };

    const workflowQuery = createChainable({ data: unmatchedVarWorkflow, error: null });
    const executionInsert = createChainable({ data: mockExecution, error: null });
    const stepLogsChain = createChainable({ error: null } as any);

    mockSupabase.from
      .mockReturnValueOnce(workflowQuery)
      .mockReturnValueOnce(executionInsert)
      .mockReturnValue(stepLogsChain);

    await executeWorkflow(WORKFLOW_ID, 'form_submit', {});

    expect(sendWorkflowEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.objectContaining({
        subject: 'Value: {{trigger.missing}}',
      })
    );
  });
});
