# 🗺️ StreamVault Desktop App - Modernization Roadmap

**Cilj:** Transformisati StreamVault u najsavremeniju desktop/laptop aplikaciju za sve platforme uz najbolje prakse i tehnologije.

**Datum kreiranja:** 25. Oktobar 2025  
**Verzija:** 1.0  
**Platforma:** Desktop (Windows, macOS, Linux)

---

## 📊 Pregled Projekta

- **Frontend:** React 19.1.1 + Vite 7.1.0
- **Backend:** Node.js 20/22 + Express 5.1.0
- **Desktop:** Electron 38.4.0
- **Streaming:** WebTorrent 2.8.4
- **UI Framework:** Custom Netflix-inspired design system

---

## 🎯 FAZA 1: KRITIČNA BEZBEDNOST I STABILNOST (1-2 dana)

### ✅ Task 1.1: Electron Security Hardening

**Prioritet:** 🔴 KRITIČNO  
**Vreme:** 3h  
**Fajlovi:**

- `electron-preload.js` (NOVI)
- `electron-main.js` (UPDATE)

**Akcije:**

1. Kreirati `electron-preload.js` sa bezbednim IPC API-jem
2. Dodati `sandbox: true` u webPreferences
3. Implementirati IPC handlere za desktop funkcije:
   - Window controls (minimize, maximize, close)
   - File dialogs
   - System paths
   - External links
4. Dodati CSP (Content Security Policy) za Electron
5. Implementirati signature verification za updates

**Definicija Završetka:**

- [ ] Preload script registrovan i testiran
- [ ] Sandbox mode aktivan
- [ ] IPC channels bezbedni i funkcionalni
- [ ] CSP konfigurisano
- [ ] Nema security warnings u Electron DevTools

---

### ✅ Task 1.2: Root Error Boundary & Error Tracking

**Prioritet:** 🔴 KRITIČNO  
**Vreme:** 2h  
**Fajlovi:**

- `client/src/main.jsx` (UPDATE)
- `client/src/components/ErrorBoundaries.jsx` (UPDATE)
- `client/src/utils/errorTracking.js` (NOVI)

**Akcije:**

1. Wrap App u ErrorBoundary na root nivou
2. Implementirati error logging sa stack traces
3. Dodati Electron-specific error reporting
4. Kreirati user-friendly error UI sa retry opcijama
5. Implementirati crash reporting (opciono: Sentry integration)

**Definicija Završetka:**

- [ ] Aplikacija ne crashuje na nehandled errors
- [ ] Errors se loguju sa kontekstom
- [ ] User vidi prijateljsku poruku
- [ ] Retry mehanizam funkcioniše

---

### ✅ Task 1.3: Fix Context Provider Duplication

**Prioritet:** 🟡 VAŽNO  
**Vreme:** 1h  
**Fajlovi:**

- `client/src/main.jsx` (UPDATE)
- `client/src/App.jsx` (UPDATE)

**Akcije:**

1. Ukloniti duplicate ServerSessionProvider iz main.jsx
2. Ukloniti duplicate SyncProvider iz main.jsx
3. Zadržati samo u App.jsx
4. Testirati da session i sync rade

**Definicija Završetka:**

- [ ] Nema duplikata
- [ ] Session context radi
- [ ] Sync context radi
- [ ] Nema console warnings

---

## 🚀 FAZA 2: PERFORMANCE OPTIMIZACIJE (2-3 dana)

### ✅ Task 2.1: React 19 Code Splitting (Route-based)

**Prioritet:** 🟡 VAŽNO  
**Vreme:** 2h  
**Fajlovi:**

- `client/src/App.jsx` (UPDATE)

**Akcije:**

1. Implementirati React.lazy() za sve route komponente
2. Dodati Suspense sa Netflix-style loading skeleton
3. Implementirati preload strategiju za sledeće stranice
4. Dodati error boundaries po route-u
5. Meriti bundle size improvement

**Definicija Završetka:**

- [ ] Sve routes su lazy loaded
- [ ] Initial bundle < 200KB
- [ ] Loading states su smooth
- [ ] Preload radi na hover (desktop)
- [ ] Build size smanjen za 40%+

---

### ✅ Task 2.2: External Store Pattern za Context API

**Prioritet:** 🟡 VAŽNO  
**Vreme:** 3h  
**Fajlovi:**

- `client/src/contexts/ServerSessionContext.jsx` (REWRITE)
- `client/src/contexts/SyncContext.jsx` (REWRITE)
- `client/src/stores/sessionStore.js` (NOVI)
- `client/src/stores/syncStore.js` (NOVI)

**Akcije:**

1. Implementirati useSyncExternalStore pattern
2. Kreirati granularne selektore (useSessionAuth, useSessionToken, itd.)
3. Eliminisati nepotrebne re-renders
4. Dodati dev tools za state inspection
5. Benchmark performance improvement

**Definicija Završetka:**

- [ ] External store implementiran
- [ ] Selektori rade
- [ ] Re-renders smanjeni za 60%+
- [ ] Dev tools funkcionalni
- [ ] Passing all tests

---

### ✅ Task 2.3: HomePage Optimization

**Prioritet:** 🟡 VAŽNO  
**Vreme:** 4h  
**Fajlovi:**

- `client/src/pages/HomePage.jsx` (REWRITE)
- `client/src/components/NetflixCard.jsx` (NOVI - extract)
- `client/src/components/NetflixRow.jsx` (NOVI - extract)
- `client/src/hooks/useIntersectionObserver.js` (NOVI)

**Akcije:**

1. Memoizirati NetflixCard i NetflixRow komponente
2. Implementirati Intersection Observer za lazy image loading
3. Ukloniti setInterval spam (koristiti CSS scroll-snap)
4. Dodati skeleton loaders
5. Implementirati virtualizaciju za dugačke liste (react-window)
6. Dodati retry logiku za failed API calls
7. Optimize scroll performance (passive event listeners)

**Definicija Završetka:**

- [ ] FPS stabilan na 60 tokom scrollovanja
- [ ] Images se lazy loaduju
- [ ] Nema setInterval-a
- [ ] Skeleton loaders smooth
- [ ] Virtualizacija radi za 100+ items
- [ ] API errors se retryuju

---

### ✅ Task 2.4: VideoPlayer Desktop Optimizations

**Prioritet:** 🟡 VAŽNO  
**Vreme:** 5h  
**Fajlovi:**

- `client/src/components/VideoPlayer.jsx` (UPDATE)
- `client/src/hooks/useMediaSession.js` (NOVI)
- `client/src/hooks/useElectronFullscreen.js` (NOVI)

**Akcije:**

1. Implementirati Electron-specific fullscreen API
2. Dodati Media Session API za system media controls
3. Implementirati desktop notifications (playback završen, greška)
4. Dodati GPU acceleration hints
5. Optimizovati mobile detection (exclude Electron)
6. Implementirati Picture-in-Picture optimizacije
7. Dodati keyboard shortcuts za desktop (Space, K, Arrow keys)
8. Fix buffer visualization za instant streaming

**Definicija Završetka:**

- [ ] Electron fullscreen radi
- [ ] Media controls u OS notification centeru
- [ ] Desktop notifikacije rade
- [ ] GPU acceleration aktivan
- [ ] PiP mode optimizovan
- [ ] Keyboard shortcuts potpuno funkcionalni
- [ ] Smooth playback na 4K

---

## 🎨 FAZA 3: UX & ACCESSIBILITY (2-3 dana)

### ✅ Task 3.1: Navigation Accessibility Overhaul

**Prioritet:** 🔴 KRITIČNO  
**Vreme:** 4h  
**Fajlovi:**

- `client/src/components/Navigation.jsx` (REWRITE)
- `client/src/hooks/useKeyboardNav.js` (NOVI)
- `client/src/hooks/useFocusTrap.js` (NOVI)

**Akcije:**

1. Dodati ARIA labels na sve interaktivne elemente
2. Implementirati keyboard navigation (Arrow keys, Tab, Escape)
3. Dodati focus trap za dropdown/modal
4. Fix React Router navigation (ne koristiti window.location)
5. Implementirati focus management (focus na search input kad se otvori)
6. Dodati aria-expanded, aria-haspopup, role attributes
7. Screen reader testiranje

**Definicija Završetka:**

- [ ] Sve prolazi WCAG 2.1 AA standard
- [ ] Keyboard navigation potpuno funkcionalna
- [ ] Screen reader friendly
- [ ] Focus vidljiv i logičan
- [ ] No accessibility warnings u axe DevTools

---

### ✅ Task 3.2: Responsive Design - Desktop First

**Prioritet:** 🟢 MEDIUM  
**Vreme:** 3h  
**Fajlovi:**

- `client/src/styles/design-system.css` (UPDATE)
- `client/src/styles/components.css` (UPDATE)
- `client/src/styles/navigation.css` (UPDATE)

**Akcije:**

1. Definisati breakpoints za desktop/laptop (1920px, 1440px, 1280px, 1024px)
2. Optimizovati grid layouts za large screens
3. Implementirati adaptive font scaling
4. Fix spacing za wide monitors (21:9, 32:9)
5. Test na multi-monitor setups
6. Dodati high DPI (Retina) optimizacije

**Definicija Završetka:**

- [ ] Izgleda savršeno na 1920x1080
- [ ] Izgleda savršeno na 2560x1440
- [ ] Izgleda savršeno na 3840x2160 (4K)
- [ ] Adaptive na ultrawide monitors
- [ ] Retina displays optimizovani

---

### ✅ Task 3.3: Dark/Light Theme System

**Prioritet:** 🟢 MEDIUM  
**Vreme:** 3h  
**Fajlovi:**

- `client/src/contexts/ThemeContext.jsx` (NOVI)
- `client/src/styles/themes/dark.css` (NOVI)
- `client/src/styles/themes/light.css` (NOVI)
- `electron-main.js` (UPDATE)

**Akcije:**

1. Kreirati ThemeContext sa system/dark/light/auto opcijama
2. Sync sa OS theme preference (nativeTheme.shouldUseDarkColors)
3. Persist user preference u localStorage
4. Smooth transitions između tema
5. Dodati theme toggle u settings
6. Testirati svi UI elementi u obe teme

**Definicija Završetka:**

- [ ] Theme switcher radi
- [ ] Auto sync sa OS
- [ ] Preference se pamti
- [ ] Smooth transitions
- [ ] Svi elementi readable u obe teme

---

## 🔧 FAZA 4: DESKTOP FEATURES (3-4 dana)

### ✅ Task 4.1: Auto-Updater Implementation

**Prioritet:** 🔴 KRITIČNO  
**Vreme:** 4h  
**Fajlovi:**

- `electron-main.js` (UPDATE)
- `electron-updater.js` (NOVI)
- `client/src/components/UpdateNotification.jsx` (NOVI)

**Akcije:**

1. Instalirati electron-updater
2. Konfiguracija update servera (GitHub Releases ili S3)
3. Implementirati update check on startup
4. Implementirati background updates
5. UI notifikacije za update available/downloaded
6. Implementirati restart & install
7. Version changelog display

**Definicija Završetka:**

- [ ] Auto-update radi
- [ ] Update notifications prikazuju se
- [ ] Background download funkcioniše
- [ ] Changelog se prikazuje
- [ ] Rollback mehanizam postoji

---

### ✅ Task 4.2: System Tray & Menu Bar

**Prioritet:** 🟡 VAŽNO  
**Vreme:** 3h  
**Fajlovi:**

- `electron-main.js` (UPDATE)
- `electron-tray.js` (NOVI)
- `public/tray-icon.png` (NOVI)
- `public/tray-icon-template.png` (NOVI - macOS)

**Akcije:**

1. Kreirati tray icon (16x16, 32x32)
2. Implementirati tray menu (Show, Hide, Quit)
3. Minimize to tray opcija
4. Badge notifications na ikoni
5. macOS dock menu
6. Windows taskbar progress
7. Quick actions u tray menu

**Definicija Završetka:**

- [ ] Tray icon prikazuje se
- [ ] Menu funkcionalan
- [ ] Minimize to tray radi
- [ ] Badge pokazuje active downloads
- [ ] macOS/Windows specifics rade

---

### ✅ Task 4.3: Global Keyboard Shortcuts

**Prioritet:** 🟢 MEDIUM  
**Vreme:** 2h  
**Fajlovi:**

- `electron-main.js` (UPDATE)
- `electron-shortcuts.js` (NOVI)

**Akcije:**

1. Registrovati global shortcuts (Play/Pause, Next, Previous)
2. Implementirati Media Key support
3. Configurable shortcuts u settings
4. Keyboard shortcut conflict resolution
5. Display shortcuts u help overlay

**Definicija Završetka:**

- [ ] Media keys rade (Play, Pause, Next, Prev)
- [ ] Custom shortcuts konfigurabilni
- [ ] No conflicts sa OS shortcuts
- [ ] Help overlay prikazuje sve shortcuts

---

### ✅ Task 4.4: Native File Dialogs

**Prioritet:** 🟢 MEDIUM  
**Vreme:** 2h  
**Fajlovi:**

- `electron-main.js` (UPDATE)
- `client/src/components/VideoPlayer.jsx` (UPDATE)
- `client/src/components/TorrentList.jsx` (UPDATE)

**Akcije:**

1. Implementirati native open dialog za .torrent fajlove
2. Implementirati native open dialog za subtitle fajlove
3. Implementirati native save dialog za downloads
4. Drag & drop support za .torrent i subtitle fajlove
5. File associations (.torrent files open sa StreamVault)

**Definicija Završetka:**

- [ ] Native dialogs rade
- [ ] Drag & drop funkcionalan
- [ ] File associations registrovane
- [ ] Multi-file selection radi

---

### ✅ Task 4.5: Deep Links & Protocol Handler

**Prioritet:** 🟢 MEDIUM  
**Vreme:** 2h  
**Fajlovi:**

- `electron-main.js` (UPDATE)
- `package.json` (UPDATE - build config)

**Akcije:**

1. Registrovati `streamvault://` protocol
2. Implementirati magnet link handler (`magnet:`)
3. Implementirati deep link routing (streamvault://play/torrent-hash)
4. OS registration (Windows Registry, macOS Info.plist)
5. Security validation za deep links

**Definicija Završetka:**

- [ ] streamvault:// links rade
- [ ] magnet: links otvaraju StreamVault
- [ ] Deep link routing funkcionalan
- [ ] Security validacija implementirana

---

## 🏗️ FAZA 5: BUILD & BUNDLING OPTIMIZACIJE (1-2 dana)

### ✅ Task 5.1: Vite Configuration Overhaul

**Prioritet:** 🟡 VAŽNO  
**Vreme:** 3h  
**Fajlovi:**

- `client/vite.config.js` (REWRITE)
- `client/package.json` (UPDATE)

**Akcije:**

1. Update target na `esnext`
2. Implementirati PWA plugin za caching
3. Dodati SRI (Subresource Integrity)
4. Optimizovati chunk splitting strategiju
5. Dodati preload directives
6. Implementirati React Compiler (babel-plugin-react-compiler)
7. Dodati bundle analyzer
8. Konfiguracija za production sourcemaps (opciono)

**Definicija Završetka:**

- [ ] Build vreme < 30s
- [ ] Bundle size < 500KB (gzipped)
- [ ] Lighthouse score > 95
- [ ] PWA caching radi
- [ ] Bundle analyzer report generisan

---

### ✅ Task 5.2: Electron Builder Optimization

**Prioritet:** 🟡 VAŽNO  
**Vreme:** 3h  
**Fajlovi:**

- `package.json` (UPDATE - build config)
- `electron-builder.yml` (NOVI)
- `build/` (NOVI - build resources)

**Akcije:**

1. Optimizovati asar packaging
2. Implementirati code signing (Windows, macOS)
3. Kreirati installer sa custom branding
4. Multi-platform builds (Windows, macOS, Linux)
5. Dodati NSIS installer opcije (install location, shortcuts)
6. AppImage/deb/rpm za Linux
7. DMG sa branded background za macOS
8. Portable verzija za Windows

**Definicija Završetka:**

- [ ] Windows installer radi (NSIS)
- [ ] Windows portable verzija radi
- [ ] macOS DMG kreiran
- [ ] Linux AppImage/deb/rpm kreirani
- [ ] Code signing funkcionalan
- [ ] Installer size optimizovan

---

### ✅ Task 5.3: ESLint & Prettier Strict Config

**Prioritet:** 🟢 MEDIUM  
**Vreme:** 2h  
**Fajlovi:**

- `client/eslint.config.js` (REWRITE)
- `.prettierrc` (NOVI)
- `.prettierignore` (NOVI)

**Akcije:**

1. Dodati eslint-plugin-jsx-a11y
2. Dodati eslint-plugin-import
3. Dodati eslint-plugin-security
4. Konfiguracija Prettier-a
5. Setup pre-commit hooks (husky + lint-staged)
6. Fix svih postojećih linting errors
7. CI/CD integration

**Definicija Završetka:**

- [ ] 0 linting errors
- [ ] 0 accessibility warnings
- [ ] Prettier format automatski
- [ ] Pre-commit hooks rade
- [ ] CI fails na lint errors

---

## 🔒 FAZA 6: SECURITY & BACKEND HARDENING (2 dana)

### ✅ Task 6.1: Move API Keys to Backend

**Prioritet:** 🔴 KRITIČNO  
**Vreme:** 3h  
**Fajlovi:**

- `server/routes/tmdb.js` (NOVI)
- `server/routes/omdb.js` (NOVI)
- `client/src/pages/HomePage.jsx` (UPDATE)
- `client/src/services/tmdbService.js` (UPDATE)

**Akcije:**

1. Kreirati backend proxy za TMDB API
2. Kreirati backend proxy za OMDb API
3. Ukloniti API keys iz frontend koda
4. Implementirati rate limiting na proxy endpoints
5. Dodati caching za API responses
6. Error handling i retry logic

**Definicija Završetka:**

- [ ] Nema API keys u client kodu
- [ ] TMDB proxy radi
- [ ] OMDb proxy radi
- [ ] Rate limiting implementiran
- [ ] Caching radi

---

### ✅ Task 6.2: CSRF Token Implementation Audit

**Prioritet:** 🟡 VAŽNO  
**Vreme:** 2h  
**Fajlovi:**

- `server/middleware/csrf.ts` (VERIFY)
- `client/src/utils/fetchWithTimeout.js` (VERIFY)

**Akcije:**

1. Verifikovati CSRF token generation
2. Verifikovati CSRF token validation
3. Testirati CSRF protection na svim POST/PUT/DELETE endpoints
4. Implementirati token rotation
5. Double-submit cookie pattern

**Definicija Završetka:**

- [ ] CSRF testiran na svim endpoints
- [ ] Token rotation radi
- [ ] Security audit passing

---

### ✅ Task 6.3: Rate Limiting Enhancement

**Prioritet:** 🟡 VAŽNO  
**Vreme:** 2h  
**Fajlovi:**

- `server/middleware/rateLimiting.ts` (UPDATE)

**Akcije:**

1. Implementirati adaptive rate limiting (po user-u)
2. Whitelist za localhost/Electron app
3. Sliding window algoritam
4. Rate limit headers (X-RateLimit-\*)
5. Graceful degradation responses

**Definicija Završetka:**

- [ ] Adaptive limiting radi
- [ ] Headers postavljeni
- [ ] Electron app whitelisted
- [ ] Graceful error messages

---

## 📊 FAZA 7: MONITORING & ANALYTICS (1-2 dana)

### ✅ Task 7.1: Performance Monitoring Dashboard

**Prioritet:** 🟢 MEDIUM  
**Vreme:** 4h  
**Fajlovi:**

- `client/src/pages/PerformancePage.jsx` (NOVI)
- `client/src/hooks/usePerformanceMetrics.js` (UPDATE)
- `client/src/services/performanceService.js` (NOVI)

**Akcije:**

1. Implementirati Performance Observer API
2. Track LCP, FID, CLS, TTFB metrics
3. Electron-specific metrics (memory, CPU)
4. Bundle size tracking
5. Real-time performance dashboard
6. Export metrics to JSON

**Definicija Završetka:**

- [ ] Dashboard prikazuje metrics
- [ ] Real-time updates
- [ ] Export radi
- [ ] Desktop metrics included

---

### ✅ Task 7.2: Error Tracking & Crash Reports

**Prioritet:** 🟡 VAŽNO  
**Vreme:** 3h  
**Fajlovi:**

- `client/src/utils/errorTracking.js` (UPDATE)
- `server/services/errorService.ts` (NOVI)
- `electron-crash-reporter.js` (NOVI)

**Akcije:**

1. Implementirati structured error logging
2. Electron crashReporter integration
3. Automatic error reporting (opt-in)
4. Error grouping i deduplication
5. Privacy-safe error data
6. Error dashboard

**Definicija Završetka:**

- [ ] Crash reporting radi
- [ ] Errors logovani sa kontekstom
- [ ] User privacy zaštićen
- [ ] Dashboard funkcionalan

---

## 🧪 FAZA 8: TESTING & QA (2-3 dana)

### ✅ Task 8.1: Unit Testing Setup

**Prioritet:** 🟡 VAŽNO  
**Vreme:** 4h  
**Fajlovi:**

- `client/vitest.config.js` (UPDATE)
- `client/src/**/__tests__/*.test.jsx` (UPDATE)

**Akcije:**

1. Konfiguracija Vitest 4.0
2. Testing utilities za React 19
3. Mock Electron API-ja
4. Component testing (React Testing Library)
5. Hook testing
6. Snapshot testing
7. Coverage reporting (>80% target)

**Definicija Završetka:**

- [ ] > 80% code coverage
- [ ] Svi core components testirani
- [ ] Svi custom hooks testirani
- [ ] CI integration

---

### ✅ Task 8.2: E2E Testing (Playwright)

**Prioritet:** 🟢 MEDIUM  
**Vreme:** 5h  
**Fajlovi:**

- `client/playwright.config.ts` (UPDATE)
- `client/tests/e2e/**/*.spec.ts` (NOVI)

**Akcije:**

1. Konfiguracija Playwright za Electron
2. Critical user flows testing:
   - Add torrent → Stream video
   - Search → Play
   - Subtitle upload → Apply
   - Settings → Save
3. Cross-platform testing (Windows, macOS, Linux)
4. Visual regression testing
5. Performance testing

**Definicija Završetka:**

- [ ] 10+ critical flows testirani
- [ ] Cross-platform CI passing
- [ ] Visual regressions detektovane
- [ ] Performance benchmarks postavljeni

---

### ✅ Task 8.3: Manual QA Checklist

**Prioritet:** 🟡 VAŽNO  
**Vreme:** 8h (distributed)

**Akcije:**

1. Windows 10/11 testing (različite rezolucije)
2. macOS testing (Intel + Apple Silicon)
3. Linux testing (Ubuntu, Fedora, Arch)
4. Multi-monitor testing
5. High DPI (4K, Retina) testing
6. Accessibility testing (screen reader, keyboard-only)
7. Performance testing (low-end hardware)
8. Network conditions testing (slow connection)

**Definicija Završetka:**

- [ ] Sve platforme testirane
- [ ] Bug lista kreirana i prioritizovana
- [ ] Critical bugs fixovani
- [ ] QA sign-off

---

## 📦 FAZA 9: DISTRIBUTION & RELEASE (1 dan)

### ✅ Task 9.1: Release Pipeline Setup

**Prioritet:** 🟡 VAŽNO  
**Vreme:** 3h  
**Fajlovi:**

- `.github/workflows/release.yml` (NOVI)
- `scripts/release.sh` (NOVI)

**Akcije:**

1. Setup GitHub Actions for releases
2. Automatic version bumping
3. Changelog generation
4. Build artifacts upload
5. GitHub Releases creation
6. Update server notification

**Definicija Završetka:**

- [ ] Release pipeline radi
- [ ] Artifacts uploaded
- [ ] Changelog auto-generated
- [ ] Version bumping automatic

---

### ✅ Task 9.2: Documentation

**Prioritet:** 🟢 MEDIUM  
**Vreme:** 4h  
**Fajlovi:**

- `README.md` (UPDATE)
- `INSTALLATION.md` (NOVI)
- `CONTRIBUTING.md` (NOVI)
- `ARCHITECTURE.md` (NOVI)
- `docs/` (NOVI folder)

**Akcije:**

1. Update README sa desktop features
2. Installation guide za sve platforme
3. Contributing guidelines
4. Architecture dokumentacija
5. API dokumentacija
6. User manual
7. Troubleshooting guide

**Definicija Završetka:**

- [ ] README comprehensive
- [ ] Installation guide za sve OS
- [ ] Architecture dokumentovan
- [ ] Troubleshooting guide complete

---

## 📈 SUCCESS METRICS

### Performance Targets:

- ✅ Initial load time: < 2s
- ✅ Time to interactive: < 3s
- ✅ Bundle size (gzipped): < 500KB
- ✅ Memory usage (idle): < 150MB
- ✅ Memory usage (4K playback): < 400MB
- ✅ FPS during scroll: 60fps
- ✅ Video playback start: < 1s (buffered)

### Quality Targets:

- ✅ Lighthouse score: > 95
- ✅ Code coverage: > 80%
- ✅ Accessibility (axe): 0 violations
- ✅ 0 critical security vulnerabilities
- ✅ ESLint: 0 errors, < 10 warnings

### User Experience:

- ✅ Startup time: < 3s
- ✅ Crash rate: < 0.1%
- ✅ Auto-update success rate: > 99%
- ✅ Cross-platform consistency: 100%

---

## 🎯 PRIORITIZACIJA (Po fazama)

### URGENT (1-3 dana):

1. **FAZA 1** - Bezbednost i Stabilnost
2. **FAZA 6.1** - API Keys to Backend

### HIGH PRIORITY (4-7 dana):

3. **FAZA 2** - Performance Optimizacije
4. **FAZA 3.1** - Accessibility
5. **FAZA 4.1** - Auto-Updater

### MEDIUM PRIORITY (8-14 dana):

6. **FAZA 4** - Desktop Features
7. **FAZA 5** - Build Optimizacije
8. **FAZA 7** - Monitoring

### LOW PRIORITY (15-21 dana):

9. **FAZA 3.2-3.3** - Theme & Responsive
10. **FAZA 8** - Testing
11. **FAZA 9** - Distribution & Docs

---

## 📅 TIMELINE ESTIMATE

- **Sprint 1 (Week 1):** FAZA 1 + FAZA 2 + FAZA 6.1
- **Sprint 2 (Week 2):** FAZA 3 + FAZA 4.1-4.2
- **Sprint 3 (Week 3):** FAZA 4.3-4.5 + FAZA 5
- **Sprint 4 (Week 4):** FAZA 7 + FAZA 8 + FAZA 9

**Total Time:** ~4 nedelje (1 mjesec) za full implementation

---

## 🚀 QUICK START

```bash
# 1. Startuj sa FAZA 1 - Task 1.1
cd d:\ProjektiApp\filmovi
code electron-preload.js  # Kreiraj novi fajl

# 2. Follow checklist
# 3. Test svaki task pre prelaska na sledeći
# 4. Commit after each completed task
```

---

## 📝 NOTES

- **Sve promjene moraju biti backward compatible**
- **Testirati nakon svakog taska**
- **Commit early, commit often**
- **Performance benchmark prije i poslije**
- **Security audit na kraju svake faze**

---

**Autor:** GitHub Copilot + Tim  
**Datum:** 25. Oktobar 2025  
**Status:** 🟡 IN PROGRESS

---

## 🎉 NA KRAJU

Kada završiš SVE taskove, imaćeš:

✅ **Najbržu** desktop streaming aplikaciju  
✅ **Najbezbedniju** arhitekturu  
✅ **Najlepši** UX/UI  
✅ **Najbolje** developer experience  
✅ **Production-ready** za sve platforme

**LET'S BUILD! 🚀**
