# Pickup Scanner PWA

[![Netlify Status](https://api.netlify.com/api/v1/badges/4511e39a-ec40-49e2-b16f-6c7496045f44/deploy-status)](https://app.netlify.com/sites/pickupscanner/deploys)

A production-ready Progressive Web App for scanning and tracking parcel pickup operations with offline capabilities.

## 🚀 Live Demo

**[https://pickupscanner.netlify.app](https://pickupscanner.netlify.app)**

## ✨ Features

- **📱 PWA**: Installable app with offline support
- **📷 Barcode Scanning**: Native BarcodeDetector API with ZXing fallback
- **🗃️ Offline Storage**: IndexedDB via Dexie for local data persistence
- **🔍 Search & Verify**: Substring search with bulk verification suggestions
- **📤 Import/Export**: CSV and JSON data portability
- **🌙 Dark Mode**: System-aware theme switching
- **⚡ Fast**: React + Vite with optimized build
- **🎯 Accessible**: Keyboard shortcuts and screen reader support

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Build**: Vite with PWA plugin
- **Database**: Dexie (IndexedDB wrapper)
- **Scanning**: BarcodeDetector API + ZXing browser fallback
- **UI**: Lucide icons, Sonner toasts
- **Deployment**: Netlify with auto-deploy from GitHub

## 🏃‍♂️ Quick Start

```bash
cd pickup-scanner-web
npm install
npm run dev
```

Visit `http://localhost:5173` to see the app.

## 📦 Build & Deploy

```bash
npm run build
npm run preview
```

Automatic deployment via Netlify on push to main branch.

## 🔧 Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📱 PWA Installation

The app can be installed on mobile devices and desktops via browser "Add to Home Screen" or "Install App" prompts.

## 🗂️ Project Structure

```
pickup-scanner-web/
├── src/
│   ├── pages/          # Route components
│   ├── db/             # Dexie database layer
│   ├── lib/            # Utilities and helpers
│   └── assets/         # Static assets
├── public/             # PWA manifest and icons
└── dist/               # Built output
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.