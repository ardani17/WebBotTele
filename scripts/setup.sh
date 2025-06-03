#!/bin/bash

# Telegram Bot Web App Setup Script
# This script helps you set up the development environment

set -e

echo "🚀 Setting up Telegram Bot Web App..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js >= 18.0.0"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        print_error "Node.js version $NODE_VERSION is too old. Please install Node.js >= 18.0.0"
        exit 1
    fi
    
    print_success "Node.js $NODE_VERSION is installed"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm >= 9.0.0"
        exit 1
    fi
    
    print_success "npm $(npm -v) is installed"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. You'll need to set up PostgreSQL manually."
        return 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_warning "Docker Compose is not installed. You'll need to set up PostgreSQL manually."
        return 1
    fi
    
    print_success "Docker and Docker Compose are installed"
    return 0
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Setup environment file
setup_env() {
    if [ ! -f ".env" ]; then
        print_status "Creating .env file from .env.example..."
        cp .env.example .env
        print_success ".env file created"
        print_warning "Please edit .env file with your configuration before continuing"
    else
        print_warning ".env file already exists"
    fi
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    if check_docker; then
        print_status "Starting PostgreSQL with Docker..."
        docker-compose up -d postgres redis
        
        # Wait for PostgreSQL to be ready
        print_status "Waiting for PostgreSQL to be ready..."
        sleep 10
        
        # Check if PostgreSQL is ready
        until docker-compose exec postgres pg_isready -U postgres; do
            print_status "Waiting for PostgreSQL..."
            sleep 2
        done
        
        print_success "PostgreSQL is ready"
    else
        print_warning "Please make sure PostgreSQL is running and accessible"
    fi
    
    # Generate Prisma client
    print_status "Generating Prisma client..."
    cd apps/backend && npm run db:generate
    cd ../..
    
    # Run migrations
    print_status "Running database migrations..."
    cd apps/backend && npm run db:migrate
    cd ../..
    
    print_success "Database setup completed"
}

# Build shared package
build_shared() {
    print_status "Building shared package..."
    cd packages/shared && npm run build
    cd ../..
    print_success "Shared package built"
}

# Main setup function
main() {
    echo "🔍 Checking prerequisites..."
    check_node
    check_npm
    
    echo ""
    echo "📦 Setting up project..."
    install_dependencies
    setup_env
    build_shared
    
    echo ""
    echo "🗄️ Setting up database..."
    setup_database
    
    echo ""
    print_success "Setup completed! 🎉"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env file with your configuration"
    echo "2. Get your Telegram bot token from @BotFather"
    echo "3. Run 'npm run dev' to start development"
    echo ""
    echo "Available commands:"
    echo "  npm run dev          - Start all services"
    echo "  npm run dev:backend  - Start backend only"
    echo "  npm run dev:frontend - Start frontend only"
    echo "  npm run db:studio    - Open Prisma Studio"
    echo ""
    echo "Access points:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend:  http://localhost:3001"
    echo "  API Docs: http://localhost:3001/api/docs"
}

# Run main function
main "$@"
