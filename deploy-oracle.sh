#!/bin/bash
set -euo pipefail

# ==============================================================================
# SurveyLite Oracle Cloud VM Deployment Script
# ==============================================================================

DEPLOY_DIR="$HOME/surveylite"
ARCHIVE_PATH="$DEPLOY_DIR/surveylite-standalone.tar.gz"

echo "=== [1/5] Preparing deployment directory at $DEPLOY_DIR ==="
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

if [ -f "$ARCHIVE_PATH" ]; then
    echo "=== [2/5] Extracting application bundle ==="
    tar -xzf "$ARCHIVE_PATH" -C "$DEPLOY_DIR"
    rm -f "$ARCHIVE_PATH"
else
    echo "Warning: $ARCHIVE_PATH not found, proceeding with current directory files..."
fi

echo "=== [3/5] Setting up persistent data directory ==="
mkdir -p "$DEPLOY_DIR/data"
chmod 777 "$DEPLOY_DIR/data"

echo "=== [4/5] Configuring firewall rules for port 3003 ==="
# Check if iptables rule for port 3003 already exists
if sudo iptables -C INPUT -p tcp --dport 3003 -j ACCEPT 2>/dev/null; then
    echo "Port 3003 already permitted in iptables."
else
    echo "Opening port 3003 in iptables..."
    # Insert before default REJECT rule if present, or append
    if sudo iptables -L INPUT --line-numbers | grep -q "REJECT"; then
        sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3003 -j ACCEPT 2>/dev/null || \
        sudo iptables -I INPUT 1 -p tcp --dport 3003 -j ACCEPT
    else
        sudo iptables -I INPUT 1 -p tcp --dport 3003 -j ACCEPT
    fi
fi

# Persist firewall rules across reboots
if command -v netfilter-persistent >/dev/null 2>&1; then
    sudo netfilter-persistent save || true
elif [ -d /etc/iptables ]; then
    sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null || true
fi

echo "=== [5/5] Building and launching SurveyLite container ==="
docker compose down 2>/dev/null || true
if docker compose version >/dev/null 2>&1; then
    docker compose up -d --build
elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose up -d --build
else
    echo "ERROR: Neither 'docker compose' nor 'docker-compose' found on the system."
    exit 1
fi

echo ""
echo "=============================================================================="
echo "✅ SurveyLite deployed successfully!"
echo "📍 Access your survey engine at: http://$(curl -s ifconfig.me || echo '<VM-IP>'):3003"
echo ""
echo "ℹ️  NOTE: If accessing from your browser times out, ensure port 3003 is allowed"
echo "   in the Oracle Cloud Console (VCN > Security Lists > Default Security List > Add Ingress Rule: TCP Port 3003)."
echo "=============================================================================="
