# Pickup Scanner PWA

A production-ready, installable Progressive Web App for scanning parcel tracking numbers and verifying "missing" parcels. Built with React, TypeScript, and designed for offline-first usage.

## 🚀 Features

- **📱 PWA Support**: Installable on mobile and desktop devices
- **📷 Barcode Scanning**: Native BarcodeDetector API with ZXing fallback
- **🔍 Smart Search**: Instant substring search and bulk verification
- **💾 Offline-First**: IndexedDB storage with Dexie for offline functionality
- **📊 Import/Export**: CSV and JSON data backup and restore
- **🌓 Dark Mode**: Automatic and manual dark mode support
- **♿ Accessibility**: Keyboard shortcuts and screen reader friendly
- **📱 Mobile Optimized**: Touch-friendly interface with haptic feedback

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS with dark mode support
- **Routing**: React Router DOM
- **State Management**: React Query for async state + local state
- **Database**: IndexedDB with Dexie ORM
- **PWA**: vite-plugin-pwa with service worker
- **Barcode Scanning**: 
  - Primary: Web BarcodeDetector API (Chrome/Edge)
  - Fallback: @zxing/browser (Cross-browser)
- **Import/Export**: PapaParse for CSV processing
- **UI Components**: Lucide React icons + Sonner for toasts

## 🏗️ Project Structure

```
pickup-scanner-web/
├── src/
│   ├── components/          # Reusable UI components
│   ├── db/
│   │   └── dexie.ts        # Database schema and operations
│   ├── lib/
│   │   ├── normalize.ts    # Utility functions
│   │   ├── export.ts       # Export utilities
│   │   └── import.ts       # Import utilities
│   ├── pages/
│   │   ├── Home.tsx        # Dashboard
│   │   ├── Scan.tsx        # Camera scanning
│   │   ├── List.tsx        # Scan list management
│   │   ├── Search.tsx      # Search and bulk verify
│   │   ├── ImportExport.tsx # Data backup/restore
│   │   └── Settings.tsx    # App configuration
│   ├── App.tsx             # Main app with routing
│   └── main.tsx            # App entry point
├── public/
│   └── manifest.webmanifest # PWA manifest
├── tailwind.config.js      # TailwindCSS configuration
├── vite.config.ts          # Vite + PWA configuration
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Modern browser with ES2022 support

### Installation

1. **Clone or create the project**
   ```bash
   # If cloning
   git clone <repository-url>
   cd pickup-scanner-web

   # Or create new Vite project
   npm create vite@latest pickup-scanner-web -- --template react-ts
   cd pickup-scanner-web
   ```

2. **Install dependencies**
   ```bash
   npm install dexie @zxing/browser papaparse react-router-dom @tanstack/react-query tailwindcss postcss autoprefixer class-variance-authority clsx lucide-react sonner
   ```

3. **Install dev dependencies**
   ```bash
   npm install -D vite-plugin-pwa @types/papaparse @tailwindcss/postcss
   ```

4. **Configure TailwindCSS** (if not already done)
   ```bash
   # These files should already exist in the project
   # tailwind.config.js
   # postcss.config.js
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   - Navigate to `http://localhost:5173`
   - For camera functionality on mobile, use HTTPS or localhost

### Build for Production

```bash
npm run build
npm run preview  # Test production build locally
```

## 📱 Usage Guide

### Core Features

1. **Home Dashboard**
   - View scan statistics and recent activity
   - Quick navigation to all features
   - Keyboard shortcuts: `S` for scan, `/` for search

2. **Scanning Barcodes**
   - Camera-based scanning with auto-detection
   - Manual input fallback
   - Duplicate detection with override option
   - Haptic feedback and audio confirmation

3. **Managing Scans**
   - View all scans grouped by date
   - Multi-select for batch operations
   - Mark items as checked/unchecked
   - Search and filter capabilities

4. **Search & Verification**
   - Instant substring search as you type
   - Bulk paste verification from clipboard
   - Shows found/not found with suggestions
   - Export search results

5. **Data Management**
   - Export all data as CSV or JSON
   - Import data from previous exports
   - Merge handling with duplicate detection
   - Database management tools

### Keyboard Shortcuts

- **Global**:
  - `S`: Quick scan
  - `/`: Quick search
  - `Ctrl+K`: Focus search
- **Camera**:
  - `Space`: Toggle camera
  - `F`: Toggle flashlight
  - `Escape`: Stop scanning

### Offline Functionality

- All data stored locally in IndexedDB
- Works completely offline after initial load
- PWA caching for app shell and assets
- Sync data when back online (future feature)

## 🔧 Configuration

### Environment Variables

Create `.env.local` for customization:

```env
# App Configuration
VITE_APP_NAME="Pickup Scanner"
VITE_DEFAULT_DEVICE_NAME="Auto Device"

# Features
VITE_ENABLE_LOGS=true
VITE_MAX_EXPORT_SIZE=100000
```

### PWA Configuration

Modify `vite.config.ts` to customize PWA settings:

```typescript
VitePWA({
  manifest: {
    name: 'Your App Name',
    theme_color: '#your-color',
    // ... other options
  }
})
```

## 🚀 Deployment

### Recommended Platforms

1. **Vercel** (Recommended)
   ```bash
   npm install -g vercel
   vercel --prod
   ```

2. **Netlify**
   ```bash
   npm run build
   # Upload dist/ folder to Netlify
   ```

3. **GitHub Pages**
   ```bash
   npm run build
   # Configure GitHub Pages to serve from dist/
   ```

### Important Notes

- **HTTPS Required**: Camera access requires HTTPS in production
- **PWA Installation**: Users can install the app from browser menu
- **iOS Safari**: May require user gesture for camera access
- **Performance**: Consider code splitting for large deployments

### Build Optimization

The app includes several optimizations:

- **Tree Shaking**: Unused code elimination
- **Code Splitting**: Lazy loading of routes (can be added)
- **Asset Optimization**: Image and CSS optimization
- **Service Worker**: Offline caching strategy
- **Bundle Analysis**: Use `npm run build -- --analyze` to analyze

## 🧪 Testing

### Manual Testing Checklist

- [ ] **Camera Scanning**
  - [ ] Test on different devices/browsers
  - [ ] Verify fallback to ZXing when BarcodeDetector unavailable
  - [ ] Test flashlight functionality
  
- [ ] **Data Persistence**
  - [ ] Add scans and verify storage
  - [ ] Test offline functionality
  - [ ] Verify data persists across browser restarts
  
- [ ] **Import/Export**
  - [ ] Export data as CSV and JSON
  - [ ] Import exported data successfully
  - [ ] Test duplicate handling
  
- [ ] **PWA Features**
  - [ ] Install as PWA on mobile/desktop
  - [ ] Test offline functionality
  - [ ] Verify service worker caching

### Device Testing

- **Mobile**: Android Chrome, iOS Safari
- **Desktop**: Chrome, Edge, Firefox
- **Features**: Camera, PWA install, offline mode

## 🐛 Troubleshooting

### Common Issues

1. **Camera Not Working**
   - Ensure HTTPS (required for camera in production)
   - Check browser permissions
   - Verify device has camera
   - Try manual input as fallback

2. **PWA Not Installing**
   - Verify HTTPS connection
   - Check manifest.webmanifest accessibility
   - Ensure service worker registration

3. **Import/Export Issues**
   - Verify file format (CSV/JSON)
   - Check file size limits (10MB)
   - Ensure proper CSV headers

4. **Performance Issues**
   - Clear IndexedDB if corrupted
   - Check browser console for errors
   - Verify sufficient device storage

### Browser Compatibility

- **Chrome/Edge**: Full support including native barcode detection
- **Firefox**: ZXing fallback for barcode scanning
- **Safari**: Camera requires HTTPS, limited PWA features
- **Mobile browsers**: Best experience on Chrome/Safari

## 📊 Data Schema

### Scan Object
```typescript
interface Scan {
  id?: number;           // Auto-increment primary key
  tracking: string;      // Normalized tracking number
  timestamp: number;     // Unix timestamp
  deviceName: string;    // Device identifier
  checked: boolean;      // Verification status
}
```

### Export Formats

**CSV Headers**: `tracking,timestamp,date,time,checked,deviceName`

**JSON Structure**:
```json
{
  "exportDate": "2024-11-07T...",
  "totalScans": 123,
  "scans": [...]
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines

- Use TypeScript strictly
- Follow React best practices
- Maintain PWA compatibility
- Test on multiple devices
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Vite](https://vitejs.dev/) - Build tool
- [React](https://reactjs.org/) - UI framework
- [Dexie](https://dexie.org/) - IndexedDB wrapper
- [ZXing](https://github.com/zxing-js/browser) - Barcode scanning
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [Lucide](https://lucide.dev/) - Icons

---

**Made with ❤️ for package tracking efficiency**