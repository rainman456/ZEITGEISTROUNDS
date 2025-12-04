# Blockchain Indexer

The indexer layer subscribes to Solana blockchain events and caches data in PostgreSQL for fast queries.

## Architecture

```
Blockchain → Listener → Parser → Handler → Database
                                         ↓
                                    WebSocket
```

## Components

### 1. Listener (`listener.ts`)
- Subscribes to program logs via Solana RPC
- Monitors all transactions involving the smart contract
- Fetches full transaction details for processing
- Handles connection management and health checks

### 2. Parser (`parser.ts`)
- Extracts events from transaction logs
- Decodes event data using Anchor IDL
- Transforms blockchain data into application format
- Supports all contract events:
  - RoundCreated
  - PredictionPlaced
  - BettingClosed
  - RoundSettled
  - WinningsClaimed
  - RoundCancelled
  - TournamentCreated

### 3. Handler (`handler.ts`)
- Processes parsed events
- Updates database via repositories
- Maintains data consistency
- Triggers WebSocket notifications
- Updates user statistics and rankings

## Event Flow

1. **Transaction occurs on blockchain**
2. **Listener receives log notification**
3. **Listener fetches full transaction**
4. **Parser extracts and decodes events**
5. **Handler updates database**
6. **WebSocket broadcasts updates**

## Database Updates

### RoundCreated
- Creates new round record
- Sets initial status to 'active'
- Broadcasts round creation event

### PredictionPlaced
- Creates prediction record
- Updates user statistics (total predictions, wagered)
- Updates round pool and prediction count
- Broadcasts prediction event

### BettingClosed
- Updates round status to 'betting_closed'
- Broadcasts status change

### RoundSettled
- Updates round status to 'settled'
- Marks predictions as winners/losers
- Calculates payouts
- Updates user statistics (wins, losses, streaks)
- Updates global rankings
- Broadcasts settlement event

### WinningsClaimed
- Marks prediction as claimed
- Records claim timestamp

### RoundCancelled
- Updates round status to 'cancelled'
- Broadcasts cancellation event

## Usage

```typescript
import { getListener } from './indexer';

// Get singleton instance
const listener = getListener();

// Start listening
await listener.start();

// Check status
const status = listener.getStatus();
console.log(status);

// Health check
const healthy = await listener.healthCheck();

// Stop listening
await listener.stop();
```

## Integration

The indexer is automatically started in `backend/src/index.ts`:

```typescript
import { getListener } from './indexer';

const blockchainListener = getListener();
await blockchainListener.start();
```

## Performance

- **Real-time**: Events processed as they occur on-chain
- **Reliable**: Automatic reconnection on connection loss
- **Efficient**: Only processes confirmed transactions
- **Scalable**: Handles high transaction volumes

## Error Handling

- Failed transactions are skipped
- Parse errors are logged but don't stop processing
- Database errors are logged and retried
- Connection issues trigger automatic reconnection

## Monitoring

Health check endpoint includes indexer status:

```bash
GET /health

{
  "services": {
    "database": "up",
    "redis": "up",
    "solana": "up",
    "indexer": "up"
  }
}
```

## Event Logs

All events are logged to `events_log` table for audit trail:
- Event type
- Round ID (if applicable)
- User pubkey (if applicable)
- Event data (JSON)
- Transaction signature
- Slot number
- Timestamp

Query event history via analytics API:
```bash
GET /api/analytics/events
GET /api/analytics/events?type=RoundCreated
```
