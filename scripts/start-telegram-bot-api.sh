#!/bin/bash

# Script untuk menjalankan telegram-bot-api server
# Pastikan telegram-bot-api sudah terinstall di /usr/local/bin/telegram-bot-api

# Check if required environment variables are set
if [ -z "$TELEGRAM_API_ID" ] || [ -z "$TELEGRAM_API_HASH" ]; then
    echo "Error: TELEGRAM_API_ID dan TELEGRAM_API_HASH harus diset sebagai environment variables"
    echo "Contoh:"
    echo "export TELEGRAM_API_ID=your_api_id"
    echo "export TELEGRAM_API_HASH=your_api_hash"
    exit 1
fi

# Set default values
HTTP_PORT=${TELEGRAM_BOT_API_PORT:-8081}
DATA_DIR=${BOT_API_DATA_PATH:-/tmp/telegram-bot-api}

# Create data directory if it doesn't exist
mkdir -p "$DATA_DIR"

echo "Starting telegram-bot-api server..."
echo "API ID: $TELEGRAM_API_ID"
echo "HTTP Port: $HTTP_PORT"
echo "Data Directory: $DATA_DIR"

# Run telegram-bot-api server with correct working directory
exec /usr/local/bin/telegram-bot-api \
    --local \
    --api-id="$TELEGRAM_API_ID" \
    --api-hash="$TELEGRAM_API_HASH" \
    --http-port="$HTTP_PORT" \
    --dir="$DATA_DIR" \
    --temp-dir="$DATA_DIR/temp" \
    --verbosity=1
