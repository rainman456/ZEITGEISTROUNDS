# WebSocket Server

Real-time communication layer for Social Roulette.

## Overview

The WebSocket server provides real-time updates to connected clients using Socket.io. It broadcasts events for round lifecycle, predictions, price updates, and settlements.

## Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling'],
});

socket.on('connected', (data) => {
  console.log('Connected:', data.clientId);
});
```

## Event Types

### Client → Server (Subscriptions)

```javascript
// Subscribe to specific round updates
socket.emit('subscribe:round', roundId);

// Subscribe to price updates
socket.emit('subscribe:prices');

// Subscribe to global events (new rounds, settlements)
socket.emit('subscribe:global');

// Unsubscribe
socket.emit('unsubscribe:round', roundId);
socket.emit('unsubscribe:prices');
socket.emit('unsubscribe:global');
```

### Server → Client (Events)

#### Round Events

```javascript
// New round created
socket.on('round:created', (data) => {
  console.log('New round:', data.roundId, data.question);
  // data: { roundId, roundPda, question, startTime, endTime, ... }
});

// Round updated (pool changes, time remaining)
socket.on('round:updated', (data) => {
  console.log('Round updated:', data.roundId);
  // data: { roundId, totalPool, pools, participantCount, timeRemaining }
});

// Betting closed
socket.on('round:betting_closed', (data) => {
  console.log('Betting closed:', data.roundId);
  // data: { roundId, closedAt, totalPool, pools }
});

// Round settled
socket.on('round:settled', (data) => {
  console.log('Round settled:', data.roundId, 'Winner:', data.winningOutcome);
  // data: { roundId, winningOutcome, finalValue, targetValue, settledAt, totalPool, winningPool }
});
```

#### Prediction Events

```javascript
// New prediction placed
socket.on('prediction:placed', (data) => {
  console.log('Prediction placed:', data.userPubkey, data.outcome, data.amount);
  // data: { roundId, userPubkey, outcome, amount, timestamp, newPoolTotal, newPoolAmounts }
});

// Pool updated
socket.on('pool:updated', (data) => {
  console.log('Pool updated:', data.roundId, data.pools);
  // data: { roundId, pools, totalPool, participantCount }
});
```

#### Price Events

```javascript
// Price update (every 5 seconds)
socket.on('price:update', (data) => {
  console.log(`${data.symbol}: $${data.price}`);
  // data: { symbol, price, confidence, publishTime, timestamp }
});
```

#### Winnings Events

```javascript
// Winnings available
socket.on('winnings:available', (data) => {
  console.log('Winnings available:', data.userPubkey, data.amount);
  // data: { roundId, userPubkey, amount, outcome }
});
```

## Usage Examples

### Subscribe to a Round

```javascript
const roundId = 1234567890;

// Subscribe to round updates
socket.emit('subscribe:round', roundId);

// Listen for events
socket.on('round:updated', (data) => {
  if (data.roundId === roundId) {
    updateUI(data);
  }
});

socket.on('prediction:placed', (data) => {
  if (data.roundId === roundId) {
    updatePoolDisplay(data.newPoolAmounts);
  }
});

socket.on('round:settled', (data) => {
  if (data.roundId === roundId) {
    showWinner(data.winningOutcome);
  }
});
```

### Subscribe to Live Prices

```javascript
socket.emit('subscribe:prices');

socket.on('price:update', (data) => {
  switch (data.symbol) {
    case 'SOL/USD':
      updateSolPrice(data.price);
      break;
    case 'BTC/USD':
      updateBtcPrice(data.price);
      break;
    case 'ETH/USD':
      updateEthPrice(data.price);
      break;
  }
});
```

### Subscribe to Global Events

```javascript
socket.emit('subscribe:global');

// New rounds
socket.on('round:created', (data) => {
  addRoundToList(data);
});

// Settlements
socket.on('round:settled', (data) => {
  showNotification(`Round ${data.roundId} settled!`);
});
```

## Room-Based Broadcasting

The server uses Socket.io rooms for efficient broadcasting:

- `global` - All global events (round created, settled)
- `prices` - Price updates
- `round:{roundId}` - Events for specific round

Clients only receive events for rooms they've subscribed to.

## REST API Integration

### Get WebSocket Stats

```http
GET /api/websocket/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "connectedClients": 42,
    "rooms": {
      "global": 30,
      "prices": 25
    },
    "timestamp": 1234567890
  }
}
```

### Get Round Client Count

```http
GET /api/websocket/rounds/:roundId/clients
```

Response:
```json
{
  "success": true,
  "data": {
    "roundId": 1234567890,
    "clientCount": 15,
    "room": "round:1234567890"
  }
}
```

## Integration with Services

Services can broadcast events using `WebSocketIntegration`:

```typescript
import { WebSocketIntegration } from '../services/websocket.integration';

// After creating a round
await WebSocketIntegration.broadcastRoundCreated(roundId);

// After placing a prediction
await WebSocketIntegration.broadcastPredictionPlaced(
  roundId,
  userPubkey,
  outcome,
  amount
);

// After settling
await WebSocketIntegration.broadcastRoundSettled(
  roundId,
  winningOutcome,
  finalValue
);
```

## Error Handling

```javascript
socket.on('error', (data) => {
  console.error('WebSocket error:', data.message);
  // data: { message, code?, details? }
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  // Implement reconnection logic
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

## Frontend React Hook Example

```typescript
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');

    newSocket.on('connected', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return { socket, connected };
}

// Usage in component
function RoundView({ roundId }) {
  const { socket, connected } = useWebSocket();
  const [roundData, setRoundData] = useState(null);

  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit('subscribe:round', roundId);

    socket.on('round:updated', (data) => {
      if (data.roundId === roundId) {
        setRoundData(data);
      }
    });

    return () => {
      socket.emit('unsubscribe:round', roundId);
    };
  }, [socket, connected, roundId]);

  return <div>{/* Render round data */}</div>;
}
```

## Performance Considerations

- **Room-based broadcasting** reduces unnecessary network traffic
- **Event throttling** on price updates (5 second intervals)
- **Selective subscriptions** - clients only subscribe to needed data
- **Automatic cleanup** on disconnect

## Monitoring

Monitor WebSocket health:

```bash
# Get stats
curl http://localhost:3001/api/websocket/stats

# Get round-specific clients
curl http://localhost:3001/api/websocket/rounds/1234567890/clients
```

## Production Deployment

For production:

1. **Use Redis adapter** for horizontal scaling:
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
io.adapter(createAdapter(redisClient, redisClient.duplicate()));
```

2. **Enable sticky sessions** for load balancing
3. **Configure CORS** properly
4. **Use WSS** (WebSocket Secure) in production
5. **Implement rate limiting** on subscriptions
