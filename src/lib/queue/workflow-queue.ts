import { Queue, Worker, Job } from 'bullmq';
import { redisConnection, isRedisAvailable } from '@/lib/redis';
import { loggers } from '@/lib/logger';

const QUEUE_NAME = 'workflow-delayed-steps';

/**
 * Workflow Queue for handling delayed workflow steps
 *
 * Used when workflow delays exceed 30 seconds (serverless timeout limit)
 * Jobs are persisted in Redis and processed by a worker
 */

export interface DelayedStepJob {
  siteId: string;
  workflowId: string;
  executionId: string;
  stepId: string;
  stepConfig: Record<string, unknown>;
  context: Record<string, unknown>;
  delayMs: number;
}

let queue: Queue<DelayedStepJob> | null = null;
let worker: Worker<DelayedStepJob> | null = null;

/**
 * Get or create the workflow queue
 */
export function getWorkflowQueue(): Queue<DelayedStepJob> | null {
  if (!process.env.REDIS_URL) {
    loggers.workflow.debug('Redis not configured - workflow queue disabled');
    return null;
  }

  if (!queue) {
    queue = new Queue<DelayedStepJob>(QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000,    // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    loggers.workflow.info({ queueName: QUEUE_NAME }, 'Workflow queue initialized');
  }

  return queue;
}

/**
 * Add a delayed step to the queue
 */
export async function enqueueDelayedStep(
  job: DelayedStepJob
): Promise<Job<DelayedStepJob> | null> {
  const workflowQueue = getWorkflowQueue();

  if (!workflowQueue) {
    loggers.workflow.warn(
      { stepId: job.stepId, delayMs: job.delayMs },
      'Cannot enqueue delayed step - Redis not available'
    );
    return null;
  }

  const queuedJob = await workflowQueue.add(
    `step-${job.stepId}`,
    job,
    {
      delay: job.delayMs,
      jobId: `${job.executionId}-${job.stepId}`,
    }
  );

  loggers.workflow.info(
    {
      jobId: queuedJob.id,
      stepId: job.stepId,
      executionId: job.executionId,
      delayMs: job.delayMs,
    },
    'Delayed step enqueued'
  );

  return queuedJob;
}

/**
 * Process delayed workflow steps
 * This should be called when starting the worker process
 */
export async function startWorkflowWorker(
  processStep: (job: DelayedStepJob) => Promise<void>
): Promise<Worker<DelayedStepJob> | null> {
  if (!process.env.REDIS_URL) {
    loggers.workflow.debug('Redis not configured - workflow worker disabled');
    return null;
  }

  // Import the executor dynamically to avoid circular dependencies
  worker = new Worker<DelayedStepJob>(
    QUEUE_NAME,
    async (job) => {
      loggers.workflow.info(
        {
          jobId: job.id,
          stepId: job.data.stepId,
          executionId: job.data.executionId,
        },
        'Processing delayed workflow step'
      );

      try {
        await processStep(job.data);
        loggers.workflow.info(
          { jobId: job.id, stepId: job.data.stepId },
          'Delayed step completed'
        );
      } catch (error) {
        loggers.workflow.error(
          { jobId: job.id, stepId: job.data.stepId, error },
          'Delayed step failed'
        );
        throw error; // Re-throw to trigger retry
      }
    },
    {
      connection: redisConnection,
      concurrency: 5, // Process up to 5 jobs concurrently
    }
  );

  worker.on('completed', (job) => {
    loggers.workflow.debug({ jobId: job.id }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    loggers.workflow.error(
      { jobId: job?.id, error: err },
      'Job failed'
    );
  });

  worker.on('error', (err) => {
    loggers.workflow.error({ error: err }, 'Worker error');
  });

  loggers.workflow.info('Workflow worker started');
  return worker;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
} | null> {
  const workflowQueue = getWorkflowQueue();
  if (!workflowQueue) return null;

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    workflowQueue.getWaitingCount(),
    workflowQueue.getActiveCount(),
    workflowQueue.getCompletedCount(),
    workflowQueue.getFailedCount(),
    workflowQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Cleanup queues and workers for graceful shutdown
 */
export async function closeWorkflowQueue(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
}

// Maximum delay that can be handled in-process (30 seconds)
// Delays longer than this should be enqueued to Bull
export const MAX_INLINE_DELAY_MS = 30 * 1000;
