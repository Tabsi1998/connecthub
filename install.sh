#!/bin/bash

# ConnectHub - Installation Script
# ================================

set -e

echo "==========================================="
echo "   ConnectHub - Vereins- & Teamplattform"
echo "==========================================="
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js ist erforderlich. Bitte installieren: https://nodejs.org"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Python 3 ist erforderlich. Bitte installieren: https://python.org"; exit 1; }
command -v mongod >/dev/null 2>&1 || { echo "MongoDB ist erforderlich. Bitte installieren: https://mongodb.com"; exit 1; }

echo "[1/5] Prüfe Voraussetzungen..."
echo "  ✓ Node.js gefunden: $(node -v)"
echo "  ✓ Python gefunden: $(python3 --version)"
echo ""

# Install backend dependencies
echo "[2/5] Installiere Backend-Abhängigkeiten..."
cd backend
python3 -m pip install -r requirements.txt --quiet
echo "  ✓ Backend-Abhängigkeiten installiert"
cd ..
echo ""

# Install frontend dependencies
echo "[3/5] Installiere Frontend-Abhängigkeiten..."
cd frontend
npm install --silent 2>/dev/null || yarn install --silent
echo "  ✓ Frontend-Abhängigkeiten installiert"
cd ..
echo ""

# Setup environment
echo "[4/5] Konfiguriere Umgebung..."
if [ ! -f backend/.env ]; then
  cat > backend/.env << EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="connecthub"
JWT_SECRET="your-secret-key-change-in-production"
EOF
  echo "  ✓ Backend .env erstellt"
fi

if [ ! -f frontend/.env ]; then
  cat > frontend/.env << EOF
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
EOF
  echo "  ✓ Frontend .env erstellt"
fi
echo ""

# Done
echo "[5/5] Installation abgeschlossen!"
echo ""
echo "==========================================="
echo "   Starten:"
echo "==========================================="
echo ""
echo "1. MongoDB starten (falls nicht läuft):"
echo "   mongod --dbpath /data/db"
echo ""
echo "2. Backend starten (Terminal 1):"
echo "   cd backend && python3 -m uvicorn server:app --reload --port 8001"
echo ""
echo "3. Frontend starten (Terminal 2):"
echo "   cd frontend && npx expo start"
echo ""
echo "4. App öffnen:"
echo "   - Web: http://localhost:3000"
echo "   - iOS/Android: Expo Go App scannen QR Code"
echo ""
echo "==========================================="
echo "   Fertig! Viel Spaß mit ConnectHub!"
echo "==========================================="
