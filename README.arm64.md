# ARM64 Docker Support for Server Admin Dashboard

This document provides instructions for running the Server Admin Dashboard and Wake-on-LAN service on ARM64 architecture devices like Raspberry Pi.

## Changes Made

The following changes have been made to support ARM64 architecture:

1. Updated `Dockerfile` to use platform-specific build arguments
2. Updated GitHub Actions workflow to build multi-architecture images
3. Removed obsolete `version` field from docker-compose.yml
4. Added platform support to docker-compose.yml
5. Created a template for the Wake-on-LAN service docker-compose.yml

## Running on ARM64 Devices

### Dashboard Service

To run the dashboard service on an ARM64 device:

```bash
# Pull the latest image (which now supports ARM64)
docker pull ghcr.io/lamarquenet/server-admin-dashboard:latest

# Or build locally
docker-compose up -d
```

### Wake-on-LAN Service

For the Wake-on-LAN service, you need to:

1. Copy the `wol-service-docker-compose.yml` file to your WOL service directory:
   ```bash
   cp wol-service-docker-compose.yml /home/piserver/docker/wol-service/docker-compose.yml
   ```

2. Modify it as needed for your specific WOL service.

3. Run the WOL service:
   ```bash
   cd /home/piserver/docker/wol-service
   docker-compose up -d
   ```

## Building Multi-Architecture Images Locally

If you want to build multi-architecture images locally:

1. Set up QEMU for emulating different architectures:
   ```bash
   docker run --privileged --rm tonistiigi/binfmt --install all
   ```

2. Create a new builder instance:
   ```bash
   docker buildx create --name mybuilder --driver docker-container --bootstrap
   docker buildx use mybuilder
   ```

3. Build and push the image:
   ```bash
   docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7 -t your-image-name:latest --push .
   ```

## Troubleshooting

- If you encounter issues with the WOL service, check if the image you're using supports ARM64 architecture.
- You may need to modify the Dockerfile for your WOL service to add platform support.
- Check Docker logs for detailed error messages: `docker logs wol-service`