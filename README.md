# MSF API

Backend API service for MSF built with Express, TypeScript, and BullMQ.

## Overview

This API provides the backend services for the MSF application, including:

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Queue/Jobs**: BullMQ with Redis
- **Metrics**: Prometheus (prom-client)
- **Testing**: Vitest
- **Documentation**: Swagger/OpenAPI

## Project Structure

```
msf-api/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── database/        # Database schemas and connections
│   ├── jobs/            # Background job processing
│   ├── middleware/      # Express middleware
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── utils/           # Utility functions
├── tests/               # Test files
├── drizzle.config.ts    # Drizzle ORM configuration
└── package.json         # Project metadata
```

## Jobs Module

The jobs module uses BullMQ and Redis to process background tasks efficiently. It consists of:

### Queue (queue.ts)

Defines and manages the job queue for scheduled synchronization operations.

```typescript
// Create a queue instance
const syncQueue = new Queue<SyncJobData>('sync-queue', { ... });

// Schedule a job
await scheduleSyncJob();
```

### Worker (worker.ts)

A worker class that processes jobs from the queue:

- Initializes a BullMQ worker
- Sets up event listeners for job states
- Processes jobs with proper error handling
- Updates metrics to track job execution

```typescript
// Create a worker instance
const worker = new CarrierWorker();

// The worker automatically:
// - Sets up event listeners (completed, failed, error)
// - Processes jobs from the queue
// - Updates metrics
// - Handles errors

// When shutting down:
await worker.close();
```

### Metrics (metrics.ts)

Prometheus metrics collection for monitoring job health:

- Queue size by state (waiting, active, completed, failed)
- Job execution counts and durations
- Error tracking
- Redis connection status

```typescript
// Access the metrics registry
import { registry } from './metrics';

// Reset metrics when needed
initMetrics();

// Update queue metrics
await updateQueueMetrics();

// Expose metrics endpoint in your Express app
app.get('/metrics', async (_, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});
```

## Getting Started

### Prerequisites

- Node.js 18+
- Redis server
- PostgreSQL database

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/your-org/msf-api.git
   cd msf-api
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Set up environment variables

   ```bash
   # Create .env file with the following variables
   PORT=3000
   NODE_ENV=development
   DB_URL=postgres://username:password@localhost:5432/msf_db
   REDIS_HOST=localhost
   REDIS_PORT=6379
   JWT_SECRET=your_secret_key_here
   JWT_EXPIRES_IN=1d
   BCRYPT_SALT_ROUNDS=10
   SYNC_INTERVAL_HOURS=6
   ```

4. Start development server
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm start` - Starts the production server
- `npm run dev` - Starts development server with hot reloading
- `npm run build` - Builds the TypeScript code
- `npm run test` - Runs tests
- `npm run test:coverage` - Runs tests with coverage report
- `npm run test:sonar` - Runs tests with coverage and generates SonarQube report
- `npm run lint` - Lints the codebase
- `npm run format` - Formats the codebase
- `npm run db:generate` - Generates database migration files
- `npm run db:push` - Pushes schema changes to the database
- `npm run seed` - Seeds the database with initial data

## Testing

The project uses Vitest for testing. Tests are located in the `tests/` directory, mirroring the project structure.

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific tests
npm test -- tests/jobs
```

### Jobs Module Test Coverage

The jobs module has 100% test coverage across all metrics:

#### queue.test.ts

- Tests the creation of the BullMQ queue with proper configuration
- Tests job scheduling with correct parameters and timing

#### worker.test.ts

- Tests worker initialization and configuration
- Tests all event handlers (completed, failed, error)
- Tests job processing with progress updates
- Tests error handling during job processing
- Tests various edge cases (null job, job without attempts, etc.)
- Tests the createSystemLog utility for both error and non-error cases

#### metrics.test.ts

- Tests metrics initialization and registry setup
- Tests metrics reset functionality
- Tests queue metrics collection from Redis
- Tests error handling during metrics collection

## Code Coverage Results

The jobs module has achieved complete coverage:

```
jobs                     |     100 |      100 |     100 |     100 |
 metrics.ts              |     100 |      100 |     100 |     100 |
 queue.ts                |     100 |      100 |     100 |     100 |
 worker.ts               |     100 |      100 |     100 |     100 |
```

## API Documentation

API documentation is available via Swagger at `/api-docs` when the server is running.

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add some amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## License

This project is proprietary and confidential.
