#!/bin/bash

# Stop any running workers
pkill -f "node.*worker"

# Start the worker with debug logging
cd /home/jatin-saini/Desktop/Resume/InvProcSystem/inv-proc-ui/backend-core

# Enable debug logging
export DEBUG=*

# Start the worker
npx ts-node src/worker.ts 2>&1 | tee /tmp/worker-debug.log

echo "Worker logs are being written to /tmp/worker-debug.log"
echo "You can monitor the logs with: tail -f /tmp/worker-debug.log"
