import { Queue, QueueOptions, JobsOptions } from 'bullmq';
import env from '../config/env.config';

export interface BaseJobData {
  timestamp: string;
  [key: string]: unknown;
}

export abstract class BaseQueue {
  protected queue: Queue;

  protected constructor(queueName: string, options?: Partial<QueueOptions>) {
    this.queue = new Queue(queueName, {
      connection: {
        host: env.REDIS_HOST,
        port: Number(env.REDIS_PORT),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
      ...options,
    });
  }

  async addJob(jobName: string, data: BaseJobData, options?: JobsOptions): Promise<void> {
    await this.queue.add(jobName, data, options);
  }

  async addRepeatingJob(jobName: string, data: BaseJobData, intervalMs: number): Promise<void> {
    await this.queue.add(jobName, data, {
      repeat: {
        every: intervalMs,
      },
    });
  }

  async close(): Promise<void> {
    await this.queue.close();
  }

  getQueue(): Queue {
    return this.queue;
  }
}
