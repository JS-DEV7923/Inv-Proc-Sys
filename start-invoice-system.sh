#!/bin/bash

# Start the Invoice Processing System
# Usage: ./start-invoice-system.sh [--build] [--logs]

# Default values
BUILD=false
SHOW_LOGS=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --build)
      BUILD=true
      shift
      ;;
    --logs)
      SHOW_LOGS=true
      shift
      ;;
    *)
      echo "Unknown parameter: $1"
      exit 1
      ;;
  esac
done

# Set paths to Node.js and npm
export NODE_PATH="/home/jatin-saini/.nvm/versions/node/v22.17.0/bin/node"
export NPM_PATH="/home/jatin-saini/.nvm/versions/node/v22.17.0/bin/npm"
export PATH="/home/jatin-saini/.nvm/versions/node/v22.17.0/bin:$PATH"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required commands
for cmd in docker "$NODE_PATH" "$NPM_PATH"; do
  if ! command_exists "$cmd"; then
    echo "Error: $cmd is not installed or not in PATH"
    exit 1
  fi
done

# Check for docker compose or docker-compose
if ! docker compose version &>/dev/null && ! command_exists docker-compose; then
  echo "Error: docker compose or docker-compose is required but not found"
  exit 1
fi

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo "🚀 Starting Invoice Processing System..."

# Start Docker services
echo "🐳 Starting Docker services (Redis + MinIO)..."
if docker compose version &>/dev/null; then
    docker compose -f inv-proc-ui/docker-compose.yml up -d
else
    docker-compose -f inv-proc-ui/docker-compose.yml up -d
fi

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
until docker exec inv-proc-ui-redis-1 redis-cli ping &>/dev/null; do
  sleep 1
  echo -n "."
done
echo -e "\n✅ Redis is ready!"

# Install dependencies if --build flag is set
if [ "$BUILD" = true ]; then
  echo "📦 Installing dependencies..."
  
  echo "🔧 Installing API Gateway dependencies..."
  cd "$SCRIPT_DIR/inv-proc-ui/api-gateway" || exit 1
  "$NPM_PATH" ci
  
  echo "🔧 Installing Backend Worker dependencies..."
  cd "$SCRIPT_DIR/inv-proc-ui/backend-core" || exit 1
  "$NPM_PATH" ci
  
  echo "🔧 Installing Frontend dependencies..."
  cd "$SCRIPT_DIR/inv-proc-ui/frontend" || exit 1
  "$NPM_PATH" ci
  
  cd "$SCRIPT_DIR" || exit 1
fi

# Start API Gateway
echo "🚀 Starting API Gateway..."
cd "$SCRIPT_DIR/inv-proc-ui/api-gateway" || exit 1
if [ "$SHOW_LOGS" = true ]; then
  "$NPM_PATH" run dev
else
  "$NPM_PATH" run dev > "$SCRIPT_DIR/api-gateway.log" 2>&1 &
  API_GATEWAY_PID=$!
  echo "🔌 API Gateway started (PID: $API_GATEWAY_PID)"
fi

# Start Backend Worker
echo "⚙️  Starting Backend Worker..."
cd "$SCRIPT_DIR/inv-proc-ui/backend-core" || exit 1
if [ "$SHOW_LOGS" = true ]; then
  "$NPM_PATH" run dev
else
  "$NPM_PATH" run dev > "$SCRIPT_DIR/backend-worker.log" 2>&1 &
  WORKER_PID=$!
  echo "⚙️  Backend Worker started (PID: $WORKER_PID)"
fi

# Start Frontend
echo "💻 Starting Frontend..."
cd "$SCRIPT_DIR/inv-proc-ui/frontend" || exit 1
if [ "$SHOW_LOGS" = true ]; then
  "$NPM_PATH" run dev
else
  "$NPM_PATH" run dev > "$SCRIPT_DIR/frontend.log" 2>&1 &
  FRONTEND_PID=$!
  echo "🌐 Frontend started (PID: $FRONTEND_PID)"
  echo "🌍 Access the application at: http://localhost:5173"
fi

# Show logs if requested
if [ "$SHOW_LOGS" = true ]; then
  # This will only be reached if not already showing logs for a specific service
  tail -f "$SCRIPT_DIR/api-gateway.log" \
       "$SCRIPT_DIR/backend-worker.log" \
       "$SCRIPT_DIR/frontend.log" 2>/dev/null
else
  echo ""
  echo "🎉 All services started successfully!"
  echo ""
  echo "📝 Logs:"
  echo "  - API Gateway: tail -f $SCRIPT_DIR/api-gateway.log"
  echo "  - Backend Worker: tail -f $SCRIPT_DIR/backend-worker.log"
  echo "  - Frontend: tail -f $SCRIPT_DIR/frontend.log"
  echo ""
  echo "🌍 Access the application at: http://localhost:5173"
  echo ""
  if docker compose version &>/dev/null; then
      echo "🛑 To stop all services, run:"
      echo "   pkill -f 'node|npm' && docker compose -f $SCRIPT_DIR/inv-proc-ui/docker-compose.yml down"
  else
      echo "🛑 To stop all services, run:"
      echo "   pkill -f 'node|npm' && docker-compose -f $SCRIPT_DIR/inv-proc-ui/docker-compose.yml down"
  fi
fi

# Function to handle script termination
cleanup() {
  echo "🛑 Stopping all services..."
  kill -9 $API_GATEWAY_PID $WORKER_PID $FRONTEND_PID 2>/dev/null
  if docker compose version &>/dev/null; then
      docker compose -f "$SCRIPT_DIR/inv-proc-ui/docker-compose.yml" down
  else
      docker-compose -f "$SCRIPT_DIR/inv-proc-ui/docker-compose.yml" down
  fi
  exit 0
}

# Set up trap to catch script termination
trap cleanup SIGINT SIGTERM

# Keep the script running if not showing logs
if [ "$SHOW_LOGS" = false ]; then
  echo "Press Ctrl+C to stop all services..."
  wait
fi
