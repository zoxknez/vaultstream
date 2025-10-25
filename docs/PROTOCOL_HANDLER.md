# 🔗 StreamVault - Protocol Handler Guide

StreamVault supports custom protocol handlers for deep linking and magnet link integration.

## Supported Protocols

### 1. `streamvault://` - Deep Links

Custom protocol for navigating within the app.

**Examples:**

```
streamvault://                    # Open home page
streamvault://home                # Open home page
streamvault://torrents            # Open torrents page
streamvault://search/movie-name   # Search for "movie-name"
streamvault://play/torrent-hash   # Auto-play torrent by hash
```

### 2. `magnet:` - Magnet Links

Standard BitTorrent magnet link protocol.

**Example:**

```
magnet:?xt=urn:btih:HASH&dn=Movie+Name&tr=tracker-url
```

When clicked, StreamVault will:

1. Launch automatically (if not running)
2. Navigate to Torrents page
3. Add the torrent
4. Show notification

## Testing Protocol Handlers

### Windows

**Test in PowerShell:**

```powershell
# Test streamvault protocol
Start-Process "streamvault://torrents"

# Test magnet link
Start-Process "magnet:?xt=urn:btih:HASH&dn=Test"
```

**Test via HTML:**

```html
<a href="streamvault://search/inception">Open in StreamVault</a>
<a href="magnet:?xt=urn:btih:HASH">Open Magnet</a>
```

### macOS

**Test in Terminal:**

```bash
# Test streamvault protocol
open "streamvault://torrents"

# Test magnet link
open "magnet:?xt=urn:btih:HASH&dn=Test"
```

### Linux

**Test in Terminal:**

```bash
# Test streamvault protocol
xdg-open "streamvault://torrents"

# Test magnet link
xdg-open "magnet:?xt=urn:btih:HASH&dn=Test"
```

## How It Works

### 1. Protocol Registration

**package.json** (electron-builder config):

```json
"protocols": [
  {
    "name": "StreamVault Protocol",
    "schemes": ["streamvault"],
    "role": "Viewer"
  },
  {
    "name": "Magnet Link",
    "schemes": ["magnet"],
    "role": "Viewer"
  }
]
```

### 2. Main Process Handler

**electron-main.js**:

```javascript
// Register protocols
app.setAsDefaultProtocolClient('streamvault');
app.setAsDefaultProtocolClient('magnet');

// Handle protocol URLs
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

// Windows/Linux: second instance
app.on('second-instance', (_event, commandLine) => {
  const url = commandLine.find(
    (arg) => arg.startsWith('streamvault://') || arg.startsWith('magnet:')
  );
  if (url) handleProtocolUrl(url);
});
```

### 3. Renderer Process Hook

**useProtocolHandler.js**:

```javascript
// Listen for protocol events
useEffect(() => {
  const unsubscribeMagnet = window.electron.protocol.onMagnetLink((magnetLink) => {
    // Handle magnet link
  });

  const unsubscribeDeepLink = window.electron.protocol.onDeepLink((route) => {
    // Handle deep link navigation
  });

  return () => {
    unsubscribeMagnet();
    unsubscribeDeepLink();
  };
}, []);
```

### 4. React Integration

**App.jsx**:

```javascript
function App() {
  // Enable protocol handling
  useProtocolHandler();

  return <Router>{/* Routes */}</Router>;
}
```

## Custom Event System

Protocol handler dispatches custom events that components can listen to:

### magnet-link Event

```javascript
window.addEventListener('magnet-link', (event) => {
  const { magnetLink } = event.detail;
  // Add torrent
});
```

### auto-play-torrent Event

```javascript
window.addEventListener('auto-play-torrent', (event) => {
  const { torrentHash } = event.detail;
  // Play torrent
});
```

## Security

- ✅ Protocol URLs are validated before processing
- ✅ Only allowed protocols are handled (streamvault, magnet)
- ✅ Cross-origin navigation is blocked
- ✅ External links open in default browser
- ✅ Deep link routes are sanitized

## Browser Integration

Users can create bookmarklets or browser extensions that use:

```javascript
window.location.href = 'streamvault://search/movie+name';
```

This will launch StreamVault and perform the action.

## File Association

StreamVault also registers as the default handler for:

- `.torrent` files (planned in Task 4.4)
- `magnet:` links ✅
- `streamvault://` links ✅

## Development Testing

In development mode, protocols work with caveats:

- Windows: Requires rebuild to register protocols
- macOS: Works after first run
- Linux: Requires manual registration

**Tip:** Build the app once to register protocols:

```bash
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

Then protocols will work even in development.
