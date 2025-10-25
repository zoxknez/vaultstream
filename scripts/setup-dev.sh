#!/bin/bash

# StreamVault Development Environment Setup Script
# This script automates the setup of local development environment

set -e # Exit on error

echo "🚀 StreamVault Development Environment Setup"
echo "============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js is required but not installed.${NC}"; exit 1; }
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

command -v npm >/dev/null 2>&1 || { echo -e "${RED}❌ npm is required but not installed.${NC}"; exit 1; }
echo -e "${GREEN}✅ npm $(npm --version)${NC}"

command -v docker >/dev/null 2>&1 || { echo -e "${YELLOW}⚠️  Docker not found - optional but recommended${NC}"; }
if command -v docker >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Docker $(docker --version)${NC}"
fi

command -v docker-compose >/dev/null 2>&1 || { echo -e "${YELLOW}⚠️  docker-compose not found - optional but recommended${NC}"; }
if command -v docker-compose >/dev/null 2>&1; then
  echo -e "${GREEN}✅ docker-compose $(docker-compose --version)${NC}"
fi

echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install
echo -e "${GREEN}✅ Root dependencies installed${NC}"
echo ""

# Setup server
echo "🔧 Setting up server..."
cd server

if [ ! -f .env ]; then
  echo "📝 Creating server .env file..."
  cp .env.example .env
  
  # Generate SESSION_SECRET
  SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
  else
    # Linux
    sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
  fi
  
  echo -e "${YELLOW}⚠️  Please configure server/.env with your credentials:${NC}"
  echo "   - SUPABASE_URL"
  echo "   - SUPABASE_SERVICE_ROLE_KEY"
  echo "   - ACCESS_PASSWORD (or ACCESS_PASSWORD_HASH)"
  echo "   - TMDB_API_KEY"
  echo "   - OMDB_API_KEY (optional)"
  echo "   - REDIS_URL (for production)"
fi

npm install
echo -e "${GREEN}✅ Server dependencies installed${NC}"
cd ..
echo ""

# Setup client
echo "🎨 Setting up client..."
cd client

if [ ! -f .env.local ]; then
  echo "📝 Creating client .env.local file..."
  cp .env.example .env.local
  
  echo -e "${YELLOW}⚠️  Please configure client/.env.local with your credentials:${NC}"
  echo "   - VITE_SUPABASE_URL"
  echo "   - VITE_SUPABASE_ANON_KEY"
  echo "   - VITE_TMDB_API_KEY"
  echo "   - VITE_OPENSUBTITLES_* (optional)"
fi

npm install
echo -e "${GREEN}✅ Client dependencies installed${NC}"
cd ..
echo ""

# Setup Docker services (optional)
if command -v docker-compose >/dev/null 2>&1; then
  echo "🐳 Starting Docker services..."
  
  # Check if docker-compose.dev.yml exists
  if [ -f docker-compose.dev.yml ]; then
    docker-compose -f docker-compose.dev.yml up -d
    echo -e "${GREEN}✅ Docker services started (Redis, PostgreSQL)${NC}"
    
    echo "⏳ Waiting for services to be ready..."
    sleep 5
  else
    echo -e "${YELLOW}⚠️  docker-compose.dev.yml not found, skipping Docker setup${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Docker Compose not available, skipping Docker setup${NC}"
fi

echo ""

# Setup database (if needed)
echo "🗃️  Database setup..."
if [ -f server/scripts/setup-database.js ]; then
  cd server
  node scripts/setup-database.js
  cd ..
  echo -e "${GREEN}✅ Database setup complete${NC}"
else
  echo -e "${YELLOW}⚠️  Database setup script not found, skipping${NC}"
fi

echo ""

# Setup monitoring (optional)
if command -v docker-compose >/dev/null 2>&1 && [ -f docker-compose.monitoring.yml ]; then
  read -p "🔍 Do you want to set up monitoring (Grafana, Prometheus)? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f docker-compose.monitoring.yml up -d
    echo -e "${GREEN}✅ Monitoring stack started${NC}"
    echo "   - Grafana: http://localhost:3001 (admin/admin)"
    echo "   - Prometheus: http://localhost:9090"
    echo "   - AlertManager: http://localhost:9093"
  fi
fi

echo ""
echo "============================================="
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "🎯 Next steps:"
echo "   1. Configure environment variables in:"
echo "      - server/.env"
echo "      - client/.env.local"
echo ""
echo "   2. Start development servers:"
echo "      npm run dev"
echo ""
echo "   3. Access the application:"
echo "      - Frontend: http://localhost:5173"
echo "      - Backend:  http://localhost:3000"
echo "      - API Docs: http://localhost:3000/api-docs"
echo ""
echo "📚 Documentation:"
echo "   - README.md"
echo "   - PROJECT-IMPROVEMENT-ANALYSIS.md"
echo "   - ROADMAP.md"
echo ""
echo "Happy coding! 🚀"
