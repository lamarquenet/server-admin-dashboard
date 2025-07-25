# Server Admin Dashboard - Docker Setup

This document provides instructions for building, running, and deploying the Server Admin Dashboard using Docker.

## Prerequisites

- Docker and Docker Compose installed on your machine
- Git repository access
- GitHub account with appropriate permissions (for GitHub Actions deployment)

## Local Development

### Building and Running with Docker Compose

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd server-admin-dashboard
   ```

2. Build and start the container:
   ```bash
   docker-compose up --build
   ```

3. Access the dashboard at http://localhost:80

### Environment Variables

The following environment variables can be configured in the `docker-compose.yml` file or passed directly to the container:

- `REACT_APP_API_URL`: URL for the main server API (default: http://192.168.8.209:8002)
- `REACT_APP_WOL_SERVICE_URL`: URL for the Wake-on-LAN service (default: http://192.168.8.170:8002)

## Production Deployment

### Manual Build and Run

1. Build the Docker image:
   ```bash
   docker build -t server-admin-dashboard .
   ```

2. Run the container:
   ```bash
   docker run -d -p 80:80 \
     -e REACT_APP_API_URL=http://your-api-server:8002 \
     -e REACT_APP_WOL_SERVICE_URL=http://your-wol-server:8002 \
     --name server-admin-dashboard \
     --restart unless-stopped \
     server-admin-dashboard
   ```

### Using GitHub Container Registry

The GitHub Actions workflow automatically builds and pushes the Docker image to GitHub Container Registry (ghcr.io) when changes are pushed to the main/master branch or when a new tag is created.

To pull and run the latest image:

```bash
# Pull the image
docker pull ghcr.io/lamarquenet/server-admin-dashboard:latest

# Run the container
docker run -d -p 80:80 \
  -e REACT_APP_API_URL=http://your-api-server:8002 \
  -e REACT_APP_WOL_SERVICE_URL=http://your-wol-server:8002 \
  --name server-admin-dashboard \
  --restart unless-stopped \
  ghcr.io/lamarquenet/server-admin-dashboard:latest
```

## Running as a Service

### Using Docker Compose

Create a `docker-compose.yml` file:
```yaml
version: "0.8"

services:
  wol-service:
    image: ghcr.io/lamarquenet/wol-service:latest
    container_name: wol-service
    platform: linux/arm64
    restart: unless-stopped
    network_mode: "host"
    environment:
      - WOL_SERVICE_PORT=${WOL_SERVICE_PORT:-8002}
      - SERVER_MAC=${SERVER_MAC:-10:7B:44:93:F0:CD}
      - WOL_BROADCAST_ADDR=${WOL_BROADCAST_ADDR:-192.168.8.255}
    extra_hosts:
      - "host.docker.internal:host-gateway"

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
    networks:
      - stats-network
    extra_hosts:
      - "host.docker.internal:host-gateway"

networks:
  stats-network:
    driver: bridge
```
Then run:

```bash
docker compose up -d
```

### Using Systemd

Create a systemd service file at `/etc/systemd/system/server-admin-dashboard.service`:

```ini
[Unit]
Description=Server Admin Dashboard
After=docker.service
Requires=docker.service

[Service]
TimeoutStartSec=0
Restart=always
ExecStartPre=-/usr/bin/docker stop server-admin-dashboard
ExecStartPre=-/usr/bin/docker rm server-admin-dashboard
ExecStartPre=/usr/bin/docker pull ghcr.io/<username>/server-admin-dashboard:latest
ExecStart=/usr/bin/docker run --name server-admin-dashboard \
  -p 80:80 \
  -e REACT_APP_API_URL=http://your-api-server:8002 \
  -e REACT_APP_WOL_SERVICE_URL=http://your-wol-server:8002 \
  ghcr.io/<username>/server-admin-dashboard:latest

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable server-admin-dashboard
sudo systemctl start server-admin-dashboard
```

## Troubleshooting

- **Container not starting**: Check logs with `docker logs server-admin-dashboard`
- **API connection issues**: Verify the environment variables are set correctly
- **GitHub Actions failing**: Ensure the repository has the necessary permissions for GitHub Container Registry