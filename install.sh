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

echo "[1/6] Betriebssystem erkannt: $OS"
echo ""

# Install MongoDB if not present
echo "[2/6] Prüfe MongoDB..."
if ! command -v mongod &> /dev/null; then
    echo "  → MongoDB wird installiert..."
    
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        # Install dependencies
        sudo apt-get update -qq
        sudo apt-get install -y -qq gnupg curl
        
        # Add MongoDB repository
        curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
            sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes
        
        echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
            sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
        
        sudo apt-get update -qq
        sudo apt-get install -y -qq mongodb-org
        
        # Start MongoDB
        sudo systemctl start mongod || sudo mongod --fork --logpath /var/log/mongodb.log --dbpath /var/lib/mongodb
        sudo systemctl enable mongod 2>/dev/null || true
        
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "fedora" ]; then
        # RHEL/CentOS/Fedora
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
        # macOS
        brew tap mongodb/brew
        brew install mongodb-community
        brew services start mongodb-community
    else
        echo "  ✗ Automatische MongoDB Installation für $OS nicht unterstützt."
        echo "    Bitte manuell installieren: https://www.mongodb.com/docs/manual/installation/"
        exit 1
    fi
    
    # Wait for MongoDB to start
    echo "  → Warte auf MongoDB Start..."
    sleep 3
    
    echo "  ✓ MongoDB installiert und gestartet"
else
    echo "  ✓ MongoDB bereits installiert"
    # Make sure it's running
    sudo systemctl start mongod 2>/dev/null || sudo mongod --fork --logpath /var/log/mongodb.log --dbpath /var/lib/mongodb 2>/dev/null || true
fi
echo ""

# Install Node.js if not present
echo "[3/6] Prüfe Node.js..."
if ! command -v node &> /dev/null; then
    echo "  → Node.js wird installiert..."
    
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y -qq nodejs
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "fedora" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    elif [ "$OS" = "Darwin" ]; then
        brew install node
    fi
    
    echo "  ✓ Node.js installiert: $(node -v)"
else
    echo "  ✓ Node.js gefunden: $(node -v)"
fi
echo ""

# Setup Python virtual environment
echo "[4/6] Installiere Backend (Python)..."
cd "$SCRIPT_DIR/backend"

# Install python3-venv if needed
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt-get install -y -qq python3-venv python3-pip 2>/dev/null || true
fi

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "  → Erstelle Python Virtual Environment..."
    python3 -m venv venv
fi

# Activate and install dependencies
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q

echo "  ✓ Backend-Abhängigkeiten installiert"
deactivate
cd "$SCRIPT_DIR"
echo ""

# Install frontend dependencies
echo "[5/6] Installiere Frontend (Node.js)..."
cd "$SCRIPT_DIR/frontend"

# Install yarn if not present
if ! command -v yarn &> /dev/null; then
    sudo npm install -g yarn -q
fi

yarn install --silent 2>/dev/null || npm install --silent

echo "  ✓ Frontend-Abhängigkeiten installiert"
cd "$SCRIPT_DIR"
echo ""

# Setup environment files
echo "[6/6] Konfiguriere Umgebung..."

# Backend .env
cat > backend/.env << 'EOF'
MONGO_URL="mongodb://localhost:27017"
DB_NAME="connecthub"
JWT_SECRET="connecthub-secret-key-change-in-production-$(openssl rand -hex 16)"
EOF
echo "  ✓ Backend .env erstellt"

# Frontend .env
cat > frontend/.env << 'EOF'
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
EOF
echo "  ✓ Frontend .env erstellt"

# Create start script
cat > start.sh << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Start MongoDB if not running
if ! pgrep -x "mongod" > /dev/null; then
    echo "Starting MongoDB..."
    sudo systemctl start mongod 2>/dev/null || sudo mongod --fork --logpath /var/log/mongodb.log --dbpath /var/lib/mongodb
fi

# Start Backend
echo "Starting Backend on port 8001..."
cd "$SCRIPT_DIR/backend"
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

# Start Frontend
echo "Starting Frontend..."
cd "$SCRIPT_DIR/frontend"
npx expo start --web --port 3000 &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

echo ""
echo "==========================================="
echo "   ConnectHub läuft!"
echo "==========================================="
echo ""
echo "   Web App:    http://localhost:3000"
echo "   API:        http://localhost:8001"
echo ""
echo "   Zum Beenden: Ctrl+C drücken"
echo "==========================================="

# Handle Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
EOF
chmod +x start.sh
echo "  ✓ Start-Skript erstellt"

# Create stop script
cat > stop.sh << 'EOF'
#!/bin/bash
echo "Stopping ConnectHub..."
pkill -f "uvicorn server:app" 2>/dev/null
pkill -f "expo start" 2>/dev/null
echo "ConnectHub gestoppt."
EOF
chmod +x stop.sh
echo "  ✓ Stop-Skript erstellt"

echo ""
echo "==========================================="
echo "   Installation abgeschlossen!"
echo "==========================================="
echo ""
echo "   Starten:     ./start.sh"
echo "   Stoppen:     ./stop.sh"
echo ""
echo "   Die App öffnet sich automatisch unter:"
echo "   → http://localhost:3000"
echo ""
echo "==========================================="
