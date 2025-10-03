#!/bin/bash
# Setup script for Raspberry Pi deployment

set -e

echo "🚀 AI Fitness Coach - Raspberry Pi Setup"
echo "=========================================="

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    echo "⚠️  Warning: This doesn't appear to be a Raspberry Pi"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Install dependencies
echo "📦 Installing project dependencies..."
npm install --production

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Create data directories
echo "📁 Creating data directories..."
mkdir -p data tokens

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your API keys!"
fi

# Create systemd service
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/ai-fitness-coach.service > /dev/null <<EOF
[Unit]
Description=AI Fitness Coach
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PWD
ExecStart=$(which node) --max-old-space-size=512 server/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ai-fitness-coach
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys: nano .env"
echo "2. Enable service: sudo systemctl enable ai-fitness-coach"
echo "3. Start service: sudo systemctl start ai-fitness-coach"
echo "4. Check status: sudo systemctl status ai-fitness-coach"
echo "5. View logs: sudo journalctl -u ai-fitness-coach -f"
