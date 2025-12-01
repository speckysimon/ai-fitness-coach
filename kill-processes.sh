#!/bin/bash
echo "🛑 Stopping all nodemon processes..."
pkill -f "nodemon.*server/index.js"
echo "✅ All processes stopped"
