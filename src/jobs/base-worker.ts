import { Worker, Job } from 'bullmq';
import env from '../config/env.config';
import { BaseJobData } from './base-queue';
import { logger } from '../utils';

export abstract class BaseWorker {
  protected worker: Worker;
  protected queueName: string;

  protected constructor(queueName: string, concurrency: number = 2) {
    this.queueName = queueName;
    this.worker = new Worker(queueName, async job => this.processJob(job), {
      connection: {
        host: env.REDIS_HOST,
        port: Number(env.REDIS_PORT),
      },
      concurrency,
    });

    this.setupEventListeners();
  }
  protected abstract processJob(job: Job<BaseJobData>): Promise<void>;
  protected setupEventListeners(): void {
    this.worker.on('completed', job => {
      const message = `✅ Job ${job.id} completed successfully in queue ${this.queueName}`;
      logger.info(message);
      job.log(message);
    });

    this.worker.on('failed', async (job, err) => {
      const message = `❌ Job ${job?.id} failed in queue ${this.queueName}: ${err.message}`;
      logger.error(message);
      if (job) {
        await job.log(message);
      }
    });

    this.worker.on('error', err => {
      const message = `⚠️ Worker error in queue ${this.queueName}: ${err}`;
      logger.error(message);
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
