#!/bin/bash

# ConnectHub - Vollautomatische Installation
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==========================================="
echo "   ConnectHub - Vereins- & Teamplattform"
echo "   Vollautomatische Installation"
echo "==========================================="
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    OS=$(uname -s)
fi

# Get local IP
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ipconfig getifaddr en0 2>/dev/null || echo "localhost")

echo "[1/7] Betriebssystem: $OS"
echo "      Lokale IP: $LOCAL_IP"
echo ""

# Install/Upgrade Node.js to v20+
echo "[2/7] Prüfe Node.js (benötigt v20+)..."
NEED_NODE_UPGRADE=false

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        echo "  → Node.js $NODE_VERSION gefunden, aber v20+ benötigt. Upgrade..."
        NEED_NODE_UPGRADE=true
    else
        echo "  ✓ Node.js $(node -v) OK"
    fi
else
    NEED_NODE_UPGRADE=true
fi

if [ "$NEED_NODE_UPGRADE" = true ]; then
    echo "  → Node.js v20 wird installiert..."
    
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        sudo apt-get update -qq
        sudo apt-get install -y -qq ca-certificates curl gnupg
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
        sudo apt-get update -qq
        sudo apt-get install -y -qq nodejs
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "fedora" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    elif [ "$OS" = "Darwin" ]; then
        brew install node@20
    fi
    
    echo "  ✓ Node.js $(node -v) installiert"
fi
echo ""

# Install MongoDB if not present
echo "[3/7] Prüfe MongoDB..."
if ! command -v mongod &> /dev/null; then
    echo "  → MongoDB wird installiert..."
    
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        sudo apt-get install -y -qq gnupg curl
        curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
            sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes
        
        # Detect Ubuntu version
        UBUNTU_CODENAME=$(lsb_release -cs 2>/dev/null || echo "jammy")
        echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu ${UBUNTU_CODENAME}/mongodb-org/7.0 multiverse" | \
            sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
        
        sudo apt-get update -qq
        sudo apt-get install -y -qq mongodb-org
        
        sudo systemctl start mongod || true
        sudo systemctl enable mongod 2>/dev/null || true
        
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "fedora" ]; then
        cat <<EOF | sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF
        sudo yum install -y mongodb-org
        sudo systemctl start mongod
        sudo systemctl enable mongod
        
    elif [ "$OS" = "Darwin" ]; then
        brew tap mongodb/brew
        brew install mongodb-community
        brew services start mongodb-community
    fi
    
    sleep 3
    echo "  ✓ MongoDB installiert und gestartet"
else
    echo "  ✓ MongoDB bereits installiert"
    sudo systemctl start mongod 2>/dev/null || true
fi
echo ""

# Setup Python virtual environment
echo "[4/7] Installiere Backend (Python)..."
cd "$SCRIPT_DIR/backend"

if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt-get install -y -qq python3-venv python3-pip 2>/dev/null || true
fi

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
deactivate

echo "  ✓ Backend installiert"
cd "$SCRIPT_DIR"
echo ""

# Install frontend dependencies
echo "[5/7] Installiere Frontend..."
cd "$SCRIPT_DIR/frontend"

if ! command -v yarn &> /dev/null; then
    sudo npm install -g yarn -q 2>/dev/null || npm install -g yarn
fi

yarn install --silent 2>/dev/null || npm install --silent
cd "$SCRIPT_DIR"
echo "  ✓ Frontend installiert"
echo ""

# Setup environment files
echo "[6/7] Konfiguriere Umgebung..."

# Backend .env
cat > backend/.env << EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="connecthub"
JWT_SECRET="connecthub-$(openssl rand -hex 16 2>/dev/null || date +%s)"
EOF

# Frontend .env - use local IP
cat > frontend/.env << EOF
EXPO_PUBLIC_BACKEND_URL=http://${LOCAL_IP}:8001
EOF

echo "  ✓ Umgebung konfiguriert"
echo ""

# Create start script
echo "[7/7] Erstelle Start-Skripte..."

cat > start.sh << 'STARTSCRIPT'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get local IP
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ipconfig getifaddr en0 2>/dev/null || echo "localhost")

# Start MongoDB if not running
if ! pgrep -x "mongod" > /dev/null; then
    echo "→ Starte MongoDB..."
    sudo systemctl start mongod 2>/dev/null || sudo mongod --fork --logpath /var/log/mongodb.log --dbpath /var/lib/mongodb 2>/dev/null || true
    sleep 2
fi

# Kill old processes
pkill -f "uvicorn server:app" 2>/dev/null || true
pkill -f "expo start" 2>/dev/null || true
sleep 1

# Update frontend .env with current IP
cat > "$SCRIPT_DIR/frontend/.env" << EOF
EXPO_PUBLIC_BACKEND_URL=http://${LOCAL_IP}:8001
EOF

# Start Backend
echo "→ Starte Backend..."
cd "$SCRIPT_DIR/backend"
source venv/bin/activate
nohup uvicorn server:app --host 0.0.0.0 --port 8001 > ../backend.log 2>&1 &
BACKEND_PID=$!
cd "$SCRIPT_DIR"
sleep 2

# Start Frontend (web only, on local IP)
echo "→ Starte Frontend..."
cd "$SCRIPT_DIR/frontend"
nohup npx expo start --web --host lan --port 3000 > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

# Save PIDs
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid

sleep 3

echo ""
echo "==========================================="
echo "   ConnectHub läuft!"
echo "==========================================="
echo ""
echo "   Web App:  http://${LOCAL_IP}:3000"
echo "   API:      http://${LOCAL_IP}:8001"
echo ""
echo "   Logs:     tail -f backend.log"
echo "             tail -f frontend.log"
echo ""
echo "   Stoppen:  ./stop.sh"
echo "==========================================="
STARTSCRIPT

chmod +x start.sh

# Create stop script
cat > stop.sh << 'STOPSCRIPT'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Stoppe ConnectHub..."

# Kill by PID files
if [ -f "$SCRIPT_DIR/.backend.pid" ]; then
    kill $(cat "$SCRIPT_DIR/.backend.pid") 2>/dev/null || true
    rm "$SCRIPT_DIR/.backend.pid"
fi

if [ -f "$SCRIPT_DIR/.frontend.pid" ]; then
    kill $(cat "$SCRIPT_DIR/.frontend.pid") 2>/dev/null || true
    rm "$SCRIPT_DIR/.frontend.pid"
fi

# Also kill by name
pkill -f "uvicorn server:app" 2>/dev/null || true
pkill -f "expo start" 2>/dev/null || true

echo "✓ ConnectHub gestoppt."
STOPSCRIPT

chmod +x stop.sh

# Create status script
cat > status.sh << 'STATUSSCRIPT'
#!/bin/bash
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo "ConnectHub Status:"
echo "=================="

if pgrep -f "uvicorn server:app" > /dev/null; then
    echo "Backend:  ✓ Läuft (http://${LOCAL_IP}:8001)"
else
    echo "Backend:  ✗ Gestoppt"
fi

if pgrep -f "expo start" > /dev/null; then
    echo "Frontend: ✓ Läuft (http://${LOCAL_IP}:3000)"
else
    echo "Frontend: ✗ Gestoppt"
fi

if pgrep -x "mongod" > /dev/null; then
    echo "MongoDB:  ✓ Läuft"
else
    echo "MongoDB:  ✗ Gestoppt"
fi
STATUSSCRIPT

chmod +x status.sh

echo "  ✓ Skripte erstellt"
echo ""
echo "==========================================="
echo "   Installation abgeschlossen!"
echo "==========================================="
echo ""
echo "   Starten:   ./start.sh"
echo "   Stoppen:   ./stop.sh"
echo "   Status:    ./status.sh"
echo ""
echo "   Die App ist dann erreichbar unter:"
echo "   → http://${LOCAL_IP}:3000"
echo ""
echo "==========================================="
