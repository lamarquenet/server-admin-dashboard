# Server Admin Dashboard

React-based web dashboard for monitoring and controlling AI servers. Deployed on **piserver (192.168.8.170)** and communicates with the stats-server API on aiserver.

## Deployment Location

```
┌─────────────────────────────────────────────────────────────────┐
│                    piserver (192.168.8.170)                     │
│                     Raspberry Pi - Always On                    │
│                                                                 │
│  Docker:                                                        │
│  ├── server-admin-dashboard:80 ─── Calls ───► aiserver:8002    │
│  └── wol-service:8002 ─── WOL packet ───► aiserver             │
└─────────────────────────────────────────────────────────────────┘
```

Users access this dashboard at `http://192.168.8.170` from any device on the network.

## Features

- **Real-time Monitoring**: CPU, memory, GPU stats via WebSocket
- **Power Control**: Wake-on-LAN and remote shutdown
- **vLLM Control**: Start/stop server with model selection
- **Ollama Control**: Manage Ollama service and models
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- React 18
- Chart.js / react-chartjs-2
- TailwindCSS
- Socket.io-client
- Axios

## Configuration

### Environment Variables

```env
# Backend API URL (stats-server on aiserver)
REACT_APP_API_URL=http://192.168.8.209:8002

# Wake-on-LAN service URL (on piserver)
REACT_APP_WOL_SERVICE_URL=http://192.168.8.170:8002
```

### Docker Compose (piserver)

```yaml
services:
  dashboard:
    image: ghcr.io/lamarquenet/server-admin-dashboard:latest
    container_name: server-admin-dashboard
    platform: linux/arm64
    ports:
      - 80:80
    environment:
      - REACT_APP_API_URL=http://192.168.8.209:8002
      - REACT_APP_WOL_SERVICE_URL=http://192.168.8.170:8002
    restart: unless-stopped
```

## Local Development

```bash
npm install
npm start
npm run build
```

## Components

| Component | Description |
|-----------|-------------|
| `App.js` | Main application, WebSocket connection |
| `PowerControl.js` | Wake-on-LAN and shutdown controls |
| `VllmControl.js` | vLLM server control with model selection |
| `CpuCard.js` | CPU usage and temperature |
| `MemoryCard.js` | Memory usage display |
| `GpuCards.js` | GPU stats from nvidia-smi |

## Custom Hooks

### useInterval

Prevents memory leaks by properly managing intervals:

```javascript
import useInterval from './hooks/useInterval';

// Poll every 5 seconds
useInterval(fetchData, 5000, [dependency]);

// Pause by passing null
useInterval(fetchData, isPaused ? null : 5000);
```

## Related Repositories

| Repo | Location | IP | Purpose |
|------|----------|-----|---------|
| server-admin-dashboard | **piserver** | 192.168.8.170 | This frontend |
| wol-service | piserver | 192.168.8.170 | Wake-on-LAN service |
| stats-server | aiserver | 192.168.8.209 | Backend API |
