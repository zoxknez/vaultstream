# 🎬 StreamVault - Desktop Torrent Streaming Application

StreamVault is a cross-platform desktop application for streaming torrent content directly to your device. Built with Electron, React, and Node.js.

## 🌟 Features

- 🎥 Stream torrents directly without downloading
- 🖥️ Cross-platform support (Windows, macOS, Linux)
- 🎨 Modern, Netflix-inspired UI
- 🔒 Secure authentication with Supabase
- ⚡ Fast streaming with WebTorrent
- 📱 Responsive design
- 🎬 Video player with subtitle support

## 📋 Prerequisites

- **Node.js** 20.x or 22.x
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd filmovi
```

### 2. Install Dependencies

```bash
npm run install-all
```

This will install dependencies for:

- Root (Electron)
- Server (Express API)
- Client (React + Vite)

### 3. Environment Setup

Create `.env` files based on examples:

**Root `.env`:**

```bash
cp .env.example .env
```

**Server `.env`:**

```bash
cd server
cp .env.example .env
# Edit .env with your Supabase credentials
```

**Client `.env`:**

```bash
cd client
cp .env.example .env
# Configure API URL (usually http://localhost:3000)
```

### 4. Run Development Mode

```bash
npm run dev
```

This starts:

- Backend server on `http://localhost:3000`
- Frontend dev server on `http://localhost:5173`

To run with Electron:

```bash
npm run electron:dev
```

## 📦 Building for Production

### Build for Your Platform

**Windows:**

```bash
npm run build:win
```

Generates:

- `StreamVault-Setup-1.0.0.exe` (Installer)
- `StreamVault-Portable-1.0.0.exe` (Portable)

**macOS:**

```bash
npm run build:mac
```

Generates:

- `StreamVault-1.0.0.dmg` (Installer)
- `StreamVault-1.0.0-mac.zip` (Archive)

**Linux:**

```bash
npm run build:linux
```

Generates:

- `StreamVault-1.0.0.AppImage` (Universal)
- `streamvault_1.0.0_amd64.deb` (Debian/Ubuntu)
- `streamvault-1.0.0.x86_64.rpm` (Fedora/RHEL)

### Build for All Platforms

```bash
npm run build:all
```

**Note:** Building for macOS requires a Mac with Xcode. Cross-compilation from Windows/Linux has limitations.

## 📁 Project Structure

```
streamvault/
├── electron-main.js          # Electron main process
├── package.json              # Root dependencies & build config
├── client/                   # React frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── server/                   # Express backend
│   ├── index.js             # Server entry point
│   ├── app.js               # Express app setup
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   └── package.json
├── database/                 # SQL scripts
└── scripts/                  # Setup scripts
```

## 🛠️ Development

### Project Scripts

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start backend + frontend dev servers |
| `npm run electron:dev` | Run app in Electron development mode |
| `npm run server`       | Start only backend server            |
| `npm run client`       | Start only frontend dev server       |
| `npm run install-all`  | Install all dependencies             |
| `npm run build:win`    | Build Windows installer              |
| `npm run build:mac`    | Build macOS installer                |
| `npm run build:linux`  | Build Linux packages                 |
| `npm run build:all`    | Build for all platforms              |

### Server Scripts (in `server/` directory)

```bash
cd server
npm run dev      # Development with hot reload
npm test         # Run tests
npm run lint     # Run ESLint
```

### Client Scripts (in `client/` directory)

```bash
cd client
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
npm test         # Run Vitest tests
npm run test:e2e # Run Playwright E2E tests
npm run lint     # Run ESLint
```

## 🔧 Configuration

### Electron Builder

Configuration is in `package.json` under the `"build"` key. Customize:

- App name and ID
- Icons (currently using `public/leaf.svg`)
- Target platforms
- Installer options

### Environment Variables

**Server (.env):**

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SESSION_SECRET` - Secret for session encryption
- `SERVER_PORT` - Server port (default: 3000)

**Client (.env):**

- `VITE_API_BASE_URL` - Backend API URL
- `VITE_SUPABASE_URL` - Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Supabase key

## 🎯 Recommended Approach for Cross-Platform Development

### Option 1: Electron (Current Setup) ✅

**Pros:**

- Single codebase for all platforms
- Native desktop integration
- Auto-updates support
- Built-in distribution

**Cons:**

- Large bundle size (~100-150MB)
- Higher memory usage
- Requires Electron knowledge

### Option 2: Tauri (Alternative)

**Pros:**

- Smaller bundle size (~10-20MB)
- Lower memory usage
- Rust-based security
- Better performance

**Cons:**

- Requires Rust toolchain
- Newer ecosystem
- More complex setup

### Option 3: Native (Advanced)

Build separate apps for each platform:

- **Windows:** .NET MAUI / WPF
- **macOS:** Swift + SwiftUI
- **Linux:** GTK / Qt

**Pros:**

- Best performance
- Native look & feel
- Smallest bundle size

**Cons:**

- Separate codebases
- 3x development effort
- Requires platform-specific knowledge

## 💡 Recommendation: Stick with Electron

For your use case (torrent streaming desktop app), **Electron is the best choice** because:

1. ✅ **WebTorrent compatibility** - Works perfectly with Node.js torrent libraries
2. ✅ **Fast development** - You already have the React frontend
3. ✅ **Easy distribution** - Built-in auto-updater and installers
4. ✅ **Cross-platform** - One codebase, all platforms
5. ✅ **Rich ecosystem** - Many plugins and tools available

### Next Steps to Optimize

1. **Remove cloud dependencies:**

   - Remove Supabase if not needed (use local SQLite instead)
   - Implement local storage for user data

2. **Optimize bundle size:**

   - Use `electron-builder` compression
   - Remove unused dependencies
   - Implement code splitting

3. **Add desktop features:**

   - System tray integration
   - Global shortcuts
   - Download management
   - Notifications

4. **Improve security:**
   - Enable CSP (Content Security Policy)
   - Implement IPC security
   - Sandbox renderer processes

## 🐛 Troubleshooting

### Build Fails on Windows

- Install Windows Build Tools: `npm install -g windows-build-tools`
- Install Visual Studio Build Tools

### Build Fails on macOS

- Install Xcode Command Line Tools: `xcode-select --install`
- Accept Xcode license: `sudo xcodebuild -license accept`

### Build Fails on Linux

- Install required packages:
  ```bash
  sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev
  ```

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For issues and questions, please open a GitHub issue.

---

**Built with ❤️ using Electron, React, and Node.js**
