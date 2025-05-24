import { Counter, Gauge, Registry, collectDefaultMetrics } from 'prom-client';
import { ProductsFetchQueue } from './queues/products-fetch-queue';

// Create a new registry
export const registry = new Registry();

// Create queue instances
const productsFetchQueue = new ProductsFetchQueue();

// Add default metrics to the registry
collectDefaultMetrics({ register: registry, prefix: 'msf_' });

// Define metrics

// Job execution metrics
export const jobExecutionCounter = new Counter({
  name: 'sync_job_executions_total',
  help: 'Total number of sync job executions',
  labelNames: ['status'] as const,
  registers: [registry],
});

// Job duration metrics
export const jobDurationGauge = new Gauge({
  name: 'sync_job_duration_seconds',
  help: 'Duration of sync job execution in seconds',
  registers: [registry],
});

// Products fetched metrics
export const productsFetchedGauge = new Gauge({
  name: 'products_fetched_total',
  help: 'Total number of products fetched from API',
  registers: [registry],
});

// Carriers fetched metrics (legacy)
export const carriersFetchedGauge = new Gauge({
  name: 'sync_fetched_total',
  help: 'Total number of sync fetched from API',
  registers: [registry],
});

// Queue metrics
export const queueSizeGauge = new Gauge({
  name: 'queue_size',
  help: 'Number of jobs in the queue',
  labelNames: ['queue', 'state'] as const,
  registers: [registry],
});

// Failed jobs metrics
export const failedJobsCounter = new Counter({
  name: 'bull_failed_jobs_total',
  help: 'Total number of failed jobs',
  labelNames: ['queue', 'reason'] as const,
  registers: [registry],
});

// Retry attempts metrics
export const retryAttemptsGauge = new Gauge({
  name: 'bull_job_retry_attempts',
  help: 'Number of retry attempts for jobs',
  labelNames: ['queue', 'jobName'] as const,
  registers: [registry],
});

// Jobs waiting in queue metrics
export const waitingDurationGauge = new Gauge({
  name: 'bull_job_waiting_duration_seconds',
  help: 'Time a job has been waiting in the queue in seconds',
  labelNames: ['queue', 'jobName'] as const,
  registers: [registry],
});

// Job processing time histogram
export const jobProcessingDurationGauge = new Gauge({
  name: 'bull_job_processing_duration_seconds',
  help: 'Time taken to process a job in seconds',
  labelNames: ['queue', 'jobName'] as const,
  registers: [registry],
});

// Last sync timestamp
export const lastSyncTimestampGauge = new Gauge({
  name: 'carrier_last_sync_timestamp',
  help: 'Timestamp of the last successful carrier sync',
  registers: [registry],
});

// Redis connection metrics
export const redisConnectionGauge = new Gauge({
  name: 'bull_redis_connection_status',
  help: 'Status of the Redis connection (1=connected, 0=disconnected)',
  registers: [registry],
});

// Initialize metrics
export function initMetrics(): void {
  // Reset all metrics to initial values
  jobExecutionCounter.reset();
  jobDurationGauge.reset();
  productsFetchedGauge.reset();
  carriersFetchedGauge.reset();
  queueSizeGauge.reset();
  failedJobsCounter.reset();
  retryAttemptsGauge.reset();
  waitingDurationGauge.reset();
  jobProcessingDurationGauge.reset();
  lastSyncTimestampGauge.reset();
  redisConnectionGauge.reset();
}

// Update queue metrics periodically
export async function updateQueueMetrics(): Promise<void> {
  try {
    // Update products fetch queue metrics
    const productsQueue = productsFetchQueue.getQueue();
    const productsWaitingCount = await productsQueue.getWaitingCount();
    const productsActiveCount = await productsQueue.getActiveCount();
    const productsCompletedCount = await productsQueue.getCompletedCount();
    const productsFailedCount = await productsQueue.getFailedCount();
    const productsDelayedCount = await productsQueue.getDelayedCount();

    queueSizeGauge.set({ queue: 'products-fetch-queue', state: 'waiting' }, productsWaitingCount);
    queueSizeGauge.set({ queue: 'products-fetch-queue', state: 'active' }, productsActiveCount);
    queueSizeGauge.set(
      { queue: 'products-fetch-queue', state: 'completed' },
      productsCompletedCount,
    );
    queueSizeGauge.set({ queue: 'products-fetch-queue', state: 'failed' }, productsFailedCount);
    queueSizeGauge.set({ queue: 'products-fetch-queue', state: 'delayed' }, productsDelayedCount);

    // Set Redis connection status to connected if we've made it this far
    redisConnectionGauge.set(1); // If we can fetch counts, Redis is connected
  } catch (error) {
    console.error('Error updating queue metrics:', error);
    redisConnectionGauge.set(0); // Set to disconnected if we caught an error
  }
}
