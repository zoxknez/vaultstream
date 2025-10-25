# StreamVault Development Environment Setup Script (Windows PowerShell)
# This script automates the setup of local development environment

Write-Host "🚀 StreamVault Development Environment Setup" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is required but not installed." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js $(node --version)" -ForegroundColor Green

if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm is required but not installed." -ForegroundColor Red
    exit 1
}
Write-Host "✅ npm $(npm --version)" -ForegroundColor Green

if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Docker not found - optional but recommended" -ForegroundColor Yellow
} else {
    Write-Host "✅ Docker installed" -ForegroundColor Green
}

if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  docker-compose not found - optional but recommended" -ForegroundColor Yellow
} else {
    Write-Host "✅ docker-compose installed" -ForegroundColor Green
}

Write-Host ""

# Install root dependencies
Write-Host "📦 Installing root dependencies..." -ForegroundColor Yellow
npm install
Write-Host "✅ Root dependencies installed" -ForegroundColor Green
Write-Host ""

# Setup server
Write-Host "🔧 Setting up server..." -ForegroundColor Yellow
Set-Location server

if (!(Test-Path .env)) {
    Write-Host "📝 Creating server .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    
    # Generate SESSION_SECRET
    $SESSION_SECRET = node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
    (Get-Content .env) -replace 'SESSION_SECRET=.*', "SESSION_SECRET=$SESSION_SECRET" | Set-Content .env
    
    Write-Host "⚠️  Please configure server/.env with your credentials:" -ForegroundColor Yellow
    Write-Host "   - SUPABASE_URL"
    Write-Host "   - SUPABASE_SERVICE_ROLE_KEY"
    Write-Host "   - ACCESS_PASSWORD (or ACCESS_PASSWORD_HASH)"
    Write-Host "   - TMDB_API_KEY"
    Write-Host "   - OMDB_API_KEY (optional)"
    Write-Host "   - REDIS_URL (for production)"
}

npm install
Write-Host "✅ Server dependencies installed" -ForegroundColor Green
Set-Location ..
Write-Host ""

# Setup client
Write-Host "🎨 Setting up client..." -ForegroundColor Yellow
Set-Location client

if (!(Test-Path .env.local)) {
    Write-Host "📝 Creating client .env.local file..." -ForegroundColor Yellow
    Copy-Item .env.example .env.local
    
    Write-Host "⚠️  Please configure client/.env.local with your credentials:" -ForegroundColor Yellow
    Write-Host "   - VITE_SUPABASE_URL"
    Write-Host "   - VITE_SUPABASE_ANON_KEY"
    Write-Host "   - VITE_TMDB_API_KEY"
    Write-Host "   - VITE_OPENSUBTITLES_* (optional)"
}

npm install
Write-Host "✅ Client dependencies installed" -ForegroundColor Green
Set-Location ..
Write-Host ""

# Setup Docker services (optional)
if ((Get-Command docker-compose -ErrorAction SilentlyContinue) -and (Test-Path docker-compose.dev.yml)) {
    Write-Host "🐳 Starting Docker services..." -ForegroundColor Yellow
    docker-compose -f docker-compose.dev.yml up -d
    Write-Host "✅ Docker services started (Redis, PostgreSQL)" -ForegroundColor Green
    
    Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

Write-Host ""

# Setup monitoring (optional)
if ((Get-Command docker-compose -ErrorAction SilentlyContinue) -and (Test-Path docker-compose.monitoring.yml)) {
    $response = Read-Host "🔍 Do you want to set up monitoring (Grafana, Prometheus)? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        docker-compose -f docker-compose.monitoring.yml up -d
        Write-Host "✅ Monitoring stack started" -ForegroundColor Green
        Write-Host "   - Grafana: http://localhost:3001 (admin/admin)"
        Write-Host "   - Prometheus: http://localhost:9090"
        Write-Host "   - AlertManager: http://localhost:9093"
    }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Configure environment variables in:"
Write-Host "      - server/.env"
Write-Host "      - client/.env.local"
Write-Host ""
Write-Host "   2. Start development servers:"
Write-Host "      npm run dev"
Write-Host ""
Write-Host "   3. Access the application:"
Write-Host "      - Frontend: http://localhost:5173"
Write-Host "      - Backend:  http://localhost:3000"
Write-Host "      - API Docs: http://localhost:3000/api-docs"
Write-Host ""
Write-Host "📚 Documentation:"
Write-Host "   - README.md"
Write-Host "   - PROJECT-IMPROVEMENT-ANALYSIS.md"
Write-Host "   - ROADMAP.md"
Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Cyan
