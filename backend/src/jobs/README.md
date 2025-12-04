# Background Jobs

Automated jobs that run the Social Roulette game cycle.

## Jobs Overview

### 1. Round Creator Job
**Schedule:** Every 60 seconds (at :00 seconds)  
**Purpose:** Automatically creates new prediction rounds

- Creates SOL/USD price prediction rounds
- 60-second round duration
- Uses Pyth price feed for verification
- Runs continuously to maintain game flow

### 2. Betting Closer Job
**Schedule:** Every 10 seconds  
**Purpose:** Closes betting windows when rounds end

- Monitors all active rounds
- Closes betting when `endTime` is reached
- Calls `close_betting` instruction on-chain
- Prepares rounds for settlement

### 3. Settlement Job
**Schedule:** Every 15 seconds  
**Purpose:** Settles rounds after betting closes

- Fetches oracle price data from Pyth
- Determines winning outcome
- Calls `settle_round` instruction on-chain
- Distributes winnings to prediction pools

### 4. Price Monitor Job
**Schedule:** Every 5 seconds  
**Purpose:** Fetches live prices and broadcasts to clients

- Monitors SOL/USD, BTC/USD, ETH/USD prices
- Emits `priceUpdate` events
- Can be integrated with WebSocket for real-time updates
- Provides latest prices via `getLatestPrice()` API

### 5. Cleanup Job
**Schedule:** Daily at 3:00 AM  
**Purpose:** Archives old data and maintains database health

- Archives rounds older than 30 days
- Moves old predictions to archive tables
- Cleans up old events
- Runs VACUUM ANALYZE on PostgreSQL

## Usage

### Starting All Jobs

```typescript
import { JobManager } from './jobs';

const jobManager = new JobManager();
jobManager.startAll();
```

### Stopping All Jobs

```typescript
jobManager.stopAll();
```

### Accessing Individual Jobs

```typescript
const jobs = jobManager.getJobs();

// Run a job manually
await jobs.roundCreator.createNow();
await jobs.settlement.runNow();
```

### Price Monitor Integration

```typescript
const priceMonitor = jobManager.getPriceMonitor();

// Listen to price updates
priceMonitor.on('priceUpdate', (update) => {
  console.log(`${update.symbol}: $${update.price}`);
  // Broadcast to WebSocket clients
});

// Get latest price
const solPrice = priceMonitor.getLatestPrice('SOL/USD');
```

## Environment Variables

Required environment variables:

```env
ADMIN_PUBKEY=<admin_wallet_public_key>
ORACLE_PUBKEY=<oracle_wallet_public_key>
```

## Job Dependencies

```
Round Creator → Creates rounds
       ↓
Betting Closer → Closes betting when time expires
       ↓
Settlement → Fetches oracle data and settles
       ↓
Users claim winnings via API
```

## Testing Jobs

Each job has a `runNow()` method for manual testing:

```typescript
// Test round creation
await jobManager.getJobs().roundCreator.createNow();

// Test betting closer
await jobManager.getJobs().bettingCloser.runNow();

// Test settlement
await jobManager.getJobs().settlement.runNow();

// Test price fetch
await jobManager.getJobs().priceMonitor.runNow();

// Test cleanup
await jobManager.getJobs().cleanup.runNow();
```

## Monitoring

All jobs use the centralized logger:

```typescript
import { logger } from '../utils/logger';

// Jobs log:
// - Start/stop events
// - Successful operations
// - Errors with stack traces
// - Performance metrics
```

## Error Handling

- Jobs catch and log errors without crashing
- Failed operations are retried on next schedule
- Critical errors are logged with full stack traces
- Jobs continue running even if individual operations fail

## Scalability

For production deployments:

1. **Use BullMQ** for distributed job queues
2. **Separate worker processes** for each job type
3. **Redis-backed queues** for reliability
4. **Job monitoring** with Bull Board dashboard
5. **Horizontal scaling** with multiple workers

Example BullMQ migration:

```typescript
import { Queue, Worker } from 'bullmq';

const roundQueue = new Queue('rounds', { connection: redis });

// Producer
await roundQueue.add('create', { params });

// Consumer
const worker = new Worker('rounds', async (job) => {
  await roundService.createRound(job.data.params);
});
```
