#!/bin/bash

# Server Admin Dashboard Service Installer
# This script installs the Server Admin Dashboard as a systemd service

set -e

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root" >&2
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Default values
ENV_FILE=".env.docker"
SERVICE_FILE="server-admin-dashboard.service"
SERVICE_DEST="/etc/systemd/system/server-admin-dashboard.service"

# Check if .env.docker exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found. Please create it first."
    exit 1
fi

# Check if service file exists
if [ ! -f "$SERVICE_FILE" ]; then
    echo "Error: $SERVICE_FILE not found."
    exit 1
fi

# Load environment variables
echo "Loading configuration from $ENV_FILE..."
source "$ENV_FILE"

# Validate required variables
if [ -z "$REACT_APP_API_URL" ] || [ -z "$REACT_APP_WOL_SERVICE_URL" ] || [ -z "$GITHUB_USERNAME" ]; then
    echo "Error: Missing required environment variables in $ENV_FILE."
    echo "Please ensure REACT_APP_API_URL, REACT_APP_WOL_SERVICE_URL, and GITHUB_USERNAME are set."
    exit 1
fi

# Create a temporary file with environment variables substituted
echo "Configuring service file..."
cat "$SERVICE_FILE" | \
    sed "s|\${GITHUB_USERNAME}|$GITHUB_USERNAME|g" | \
    sed "s|\${API_URL}|$REACT_APP_API_URL|g" | \
    sed "s|\${WOL_SERVICE_URL}|$REACT_APP_WOL_SERVICE_URL|g" \
    > /tmp/server-admin-dashboard.service

# Copy service file to systemd directory
echo "Installing service file to $SERVICE_DEST..."
cp /tmp/server-admin-dashboard.service "$SERVICE_DEST"
rm /tmp/server-admin-dashboard.service

# Reload systemd
echo "Reloading systemd..."
systemctl daemon-reload

# Enable and start the service
echo "Enabling and starting service..."
systemctl enable server-admin-dashboard
systemctl start server-admin-dashboard

echo "Service installation complete!"
echo "You can check the status with: systemctl status server-admin-dashboard"
echo "View logs with: journalctl -u server-admin-dashboard -f"