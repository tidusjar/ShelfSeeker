#!/bin/bash
set -e

echo "🐳 ShelfSeeker Docker Setup"
echo "======================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first:"
    echo "   https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running. Please start Docker Desktop."
    exit 1
fi

echo "✓ Docker is installed and running"
echo ""

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ docker-compose not found. Please install it or use Docker Desktop."
    exit 1
fi

echo "Using: $COMPOSE_CMD"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo "📝 No .env file found. You can customize settings by creating one:"
    echo "   cp .env.example .env"
    echo "   nano .env"
    echo ""
    echo "Using defaults for now..."
else
    echo "✓ Found .env file - using custom configuration"
fi
echo ""

# Create directories if they don't exist
echo "📁 Creating data directories..."
mkdir -p downloads data
echo "✓ Created downloads/ and data/ directories"
echo ""

# Build and start
echo "🔨 Building Docker image..."
$COMPOSE_CMD build

echo ""
echo "🚀 Starting container..."
$COMPOSE_CMD up -d

echo ""
echo "✅ ShelfSeeker is running!"
echo ""
echo "📍 Access the application at: http://localhost:3001"
echo ""
echo "Useful commands:"
echo "  View logs:       $COMPOSE_CMD logs -f"
echo "  Stop:            $COMPOSE_CMD down"
echo "  Restart:         $COMPOSE_CMD restart"
echo "  Status:          $COMPOSE_CMD ps"
echo ""
echo "💡 Tip: Customize settings by editing .env file (see .env.example)"
echo ""
