#!/bin/sh

# Replace environment variables in the built JavaScript files
echo "Replacing environment variables..."

# Find all JS files in the nginx html directory
find /usr/share/nginx/html -type f -name "*.js" | while read -r file; do
  echo "Processing: $file"
  
  # Replace REACT_APP_API_URL
  if [ ! -z "$REACT_APP_API_URL" ]; then
    sed -i "s|REACT_APP_API_URL=.*|REACT_APP_API_URL=$REACT_APP_API_URL|g" "$file"
    sed -i "s|http://192.168.8.209:8002|$REACT_APP_API_URL|g" "$file"
  fi
  
  # Replace REACT_APP_WOL_SERVICE_URL
  if [ ! -z "$REACT_APP_WOL_SERVICE_URL" ]; then
    sed -i "s|REACT_APP_WOL_SERVICE_URL=.*|REACT_APP_WOL_SERVICE_URL=$REACT_APP_WOL_SERVICE_URL|g" "$file"
  fi
done

echo "Environment variable replacement complete"

# Execute the CMD
exec "$@"