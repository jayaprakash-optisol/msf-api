import { Queue, Worker, FlowProducer, Job } from 'bullmq';
import type { QueueOptions, WorkerOptions } from 'bullmq';
import winston from 'winston';
import env from '../config/env.config';

// Create a dedicated logger for BullMQ to avoid circular dependencies
const bullMQLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: BullMQ - ${message}`;
    }),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

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
  bullMQLogger.info(`Queue created: ${name}`);
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
    bullMQLogger.error(`Worker ${name} error:`, err);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    bullMQLogger.error(`Job ${job?.id} in queue ${name} failed:`, err);
  });

  workers.push(worker);
  bullMQLogger.info(`Worker created for queue: ${name}`);
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
  bullMQLogger.info('FlowProducer created');
  return flowProducer;
};

/**
 * Close all BullMQ connections gracefully
 */
export const closeBullMQConnections = async (): Promise<void> => {
  bullMQLogger.info('Closing BullMQ connections...');

  // Close all workers first
  await Promise.all(
    workers.map(async (worker, index) => {
      try {
        await worker.close();
        bullMQLogger.debug(`Worker ${index + 1} closed successfully`);
      } catch (error) {
        bullMQLogger.error(`Error closing worker ${index + 1}:`, error);
      }
    }),
  );

  // Close all flow producers
  await Promise.all(
    flowProducers.map(async (producer, index) => {
      try {
        await producer.close();
        bullMQLogger.debug(`FlowProducer ${index + 1} closed successfully`);
      } catch (error) {
        bullMQLogger.error(`Error closing FlowProducer ${index + 1}:`, error);
      }
    }),
  );

  // Close all queues
  await Promise.all(
    queues.map(async (queue, index) => {
      try {
        await queue.close();
        bullMQLogger.debug(`Queue ${index + 1} closed successfully`);
      } catch (error) {
        bullMQLogger.error(`Error closing Queue ${index + 1}:`, error);
      }
    }),
  );

  bullMQLogger.info('All BullMQ connections closed');
};

// Don't initialize the default instances eagerly to avoid initialization issues
let _defaultQueue: Queue | null = null;
let _defaultFlowProducer: FlowProducer | null = null;

/**
 * Get the default queue, initializing it if it doesn't exist
 */
export const getDefaultQueue = (): Queue => {
  if (!_defaultQueue) {
    _defaultQueue = createQueue('default');
  }
  return _defaultQueue;
};

/**
 * Get the default flow producer, initializing it if it doesn't exist
 */
export const getDefaultFlowProducer = (): FlowProducer => {
  if (!_defaultFlowProducer) {
    _defaultFlowProducer = createFlowProducer();
  }
  return _defaultFlowProducer;
};
