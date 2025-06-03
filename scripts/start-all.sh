#!/bin/bash

# Script untuk menjalankan semua komponen aplikasi bot telegram
set -e

echo "🚀 Starting Telegram Bot Web Application..."

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Port $port is already in use"
        return 1
    fi
    return 0
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo "Waiting for $service_name to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo "✅ $service_name is ready!"
            return 0
        fi
        echo "Attempt $attempt/$max_attempts: $service_name not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name failed to start after $max_attempts attempts"
    return 1
}

# Check required environment variables
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ Error: TELEGRAM_BOT_TOKEN harus diset"
    echo "Contoh: export TELEGRAM_BOT_TOKEN=your_bot_token"
    exit 1
fi

if [ -z "$TELEGRAM_API_ID" ] || [ -z "$TELEGRAM_API_HASH" ]; then
    echo "❌ Error: TELEGRAM_API_ID dan TELEGRAM_API_HASH harus diset"
    echo "Contoh:"
    echo "export TELEGRAM_API_ID=your_api_id"
    echo "export TELEGRAM_API_HASH=your_api_hash"
    exit 1
fi

# Set default ports
FRONTEND_PORT=${FRONTEND_PORT:-3000}
BACKEND_PORT=${BACKEND_PORT:-3001}
TELEGRAM_BOT_API_PORT=${TELEGRAM_BOT_API_PORT:-8081}

# Check if ports are available
echo "🔍 Checking port availability..."
if ! check_port $FRONTEND_PORT; then
    echo "❌ Frontend port $FRONTEND_PORT is in use"
    exit 1
fi

if ! check_port $BACKEND_PORT; then
    echo "❌ Backend port $BACKEND_PORT is in use"
    exit 1
fi

if ! check_port $TELEGRAM_BOT_API_PORT; then
    echo "❌ Telegram Bot API port $TELEGRAM_BOT_API_PORT is in use"
    exit 1
fi

echo "✅ All ports are available"

# Create log directory
mkdir -p logs

# Start Telegram Bot API Server
echo "🔧 Starting Telegram Bot API Server..."
./scripts/start-telegram-bot-api.sh > logs/telegram-bot-api.log 2>&1 &
TELEGRAM_API_PID=$!
echo "Telegram Bot API Server started with PID: $TELEGRAM_API_PID"

# Wait for Telegram Bot API to be ready
sleep 5
if ! wait_for_service "http://localhost:$TELEGRAM_BOT_API_PORT" "Telegram Bot API"; then
    echo "❌ Failed to start Telegram Bot API"
    kill $TELEGRAM_API_PID 2>/dev/null || true
    exit 1
fi

# Start Backend
echo "🔧 Starting Backend Server..."
cd apps/backend
npm run start:dev > ../../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ../..
echo "Backend started with PID: $BACKEND_PID"

# Wait for Backend to be ready
if ! wait_for_service "http://localhost:$BACKEND_PORT/health" "Backend"; then
    echo "❌ Failed to start Backend"
    kill $TELEGRAM_API_PID $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start Frontend
echo "🔧 Starting Frontend Server..."
cd apps/frontend
npm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..
echo "Frontend started with PID: $FRONTEND_PID"

# Wait for Frontend to be ready
if ! wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend"; then
    echo "❌ Failed to start Frontend"
    kill $TELEGRAM_API_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

# Save PIDs for cleanup
echo "$TELEGRAM_API_PID" > logs/telegram-api.pid
echo "$BACKEND_PID" > logs/backend.pid
echo "$FRONTEND_PID" > logs/frontend.pid

echo ""
echo "🎉 All services started successfully!"
echo ""
echo "📊 Service URLs:"
echo "  Frontend:          http://localhost:$FRONTEND_PORT"
echo "  Backend:           http://localhost:$BACKEND_PORT"
echo "  Telegram Bot API:  http://localhost:$TELEGRAM_BOT_API_PORT"
echo ""
echo "📝 Logs:"
echo "  Frontend:          logs/frontend.log"
echo "  Backend:           logs/backend.log"
echo "  Telegram Bot API:  logs/telegram-bot-api.log"
echo ""
echo "🛑 To stop all services, run: ./scripts/stop-all.sh"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $TELEGRAM_API_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    rm -f logs/*.pid
    echo "✅ All services stopped"
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Keep script running and show logs
echo "📊 Monitoring services (Press Ctrl+C to stop)..."
echo "Use 'tail -f logs/[service].log' to view individual service logs"

# Wait for any process to exit
wait
