#!/bin/bash

# Script untuk menghentikan semua komponen aplikasi bot telegram

echo "🛑 Stopping Telegram Bot Web Application..."

# Function to stop service by PID file
stop_service() {
    local service_name=$1
    local pid_file="logs/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "Stopping $service_name (PID: $pid)..."
            kill "$pid"
            sleep 2
            
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                echo "Force stopping $service_name..."
                kill -9 "$pid" 2>/dev/null || true
            fi
            
            echo "✅ $service_name stopped"
        else
            echo "⚠️  $service_name was not running"
        fi
        rm -f "$pid_file"
    else
        echo "⚠️  No PID file found for $service_name"
    fi
}

# Stop all services
stop_service "frontend"
stop_service "backend" 
stop_service "telegram-api"

# Also try to kill by process name as fallback
echo "🔍 Checking for remaining processes..."

# Kill any remaining node processes related to our app
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "npm run start:dev" 2>/dev/null || true
pkill -f "telegram-bot-api" 2>/dev/null || true

# Clean up log directory
if [ -d "logs" ]; then
    rm -f logs/*.pid
fi

echo "✅ All services stopped successfully!"
