import { Queue, Worker, FlowProducer, Job } from 'bullmq';
import type { QueueOptions, WorkerOptions } from 'bullmq';
import env from '../config/env.config';
import { logger } from './logger';

// Track all created instances for graceful shutdown
const queues: Queue[] = [];
const workers: Worker[] = [];
const flowProducers: FlowProducer[] = [];

// Default Redis connection options
const defaultRedisOptions = {
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT, 10),
  password: env.REDIS_PASSWORD,
  db: parseInt(env.REDIS_DB, 10),
};

// Default BullMQ options with our Redis connection
const defaultQueueOptions: QueueOptions = {
  connection: defaultRedisOptions,
  prefix: 'msf', // This prefix should match the one in docker-compose.yml for bull-board
};

/**
 * Create a new Queue instance
 * @param name Queue name
 * @param options Queue options (optional)
 * @returns Queue instance
 */
export const createQueue = (name: string, options: Partial<QueueOptions> = {}): Queue => {
  const queue = new Queue(name, {
    ...defaultQueueOptions,
    ...options,
  });

  queues.push(queue);
  logger.info(`Queue created: ${name}`);
  return queue;
};

/**
 * Create a new Worker instance
 * @param name Queue name
 * @param processor Job processor function
 * @param options Worker options (optional)
 * @returns Worker instance
 */
export const createWorker = <T, R>(
  name: string,
  processor: (job: Job<T>) => Promise<R>,
  options: Partial<WorkerOptions> = {},
): Worker<T, R> => {
  const worker = new Worker<T, R>(name, processor, {
    connection: defaultRedisOptions,
    prefix: 'msf',
    ...options,
  });

  worker.on('error', (err: Error) => {
    logger.error(`Worker ${name} error:`, err);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`Job ${job?.id} in queue ${name} failed:`, err);
  });

  workers.push(worker);
  logger.info(`Worker created for queue: ${name}`);
  return worker;
};

/**
 * Create a FlowProducer for job workflows
 * @param options FlowProducer options (optional)
 * @returns FlowProducer instance
 */
export const createFlowProducer = (
  options: Partial<Record<string, unknown>> = {},
): FlowProducer => {
  const flowProducer = new FlowProducer({
    connection: defaultRedisOptions,
    prefix: 'msf',
    ...options,
  });

  flowProducers.push(flowProducer);
  logger.info('FlowProducer created');
  return flowProducer;
};

/**
 * Close all BullMQ connections gracefully
 */
export const closeBullMQConnections = async (): Promise<void> => {
  logger.info('Closing BullMQ connections...');

  // Close all workers first
  await Promise.all(
    workers.map(async (worker, index) => {
      try {
        await worker.close();
        logger.debug(`Worker ${index + 1} closed successfully`);
      } catch (error) {
        logger.error(`Error closing worker ${index + 1}:`, error);
      }
    }),
  );

  // Close all flow producers
  await Promise.all(
    flowProducers.map(async (producer, index) => {
      try {
        await producer.close();
        logger.debug(`FlowProducer ${index + 1} closed successfully`);
      } catch (error) {
        logger.error(`Error closing FlowProducer ${index + 1}:`, error);
      }
    }),
  );

  // Close all queues
  await Promise.all(
    queues.map(async (queue, index) => {
      try {
        await queue.close();
        logger.debug(`Queue ${index + 1} closed successfully`);
      } catch (error) {
        logger.error(`Error closing Queue ${index + 1}:`, error);
      }
    }),
  );

  logger.info('All BullMQ connections closed');
};

// Export a singleton instance of commonly used components
export const defaultQueue = createQueue('default');
export const defaultFlowProducer = createFlowProducer();
