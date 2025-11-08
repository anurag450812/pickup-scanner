# Pickup Scanner - Netlify Deployment

This directory contains the production build ready for Netlify deployment.

## Quick Deploy Options

### Option 1: Drag & Drop (Fastest)
1. Zip the `dist` folder
2. Go to [Netlify](https://netlify.com)
3. Drag the zip file to deploy

### Option 2: Git Integration (Recommended)
1. Initialize git repository
2. Push to GitHub
3. Connect to Netlify for auto-deploy

### Option 3: Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

## Testing on Mobile
Once deployed, you'll get a URL like: `https://your-app-name.netlify.app`
This HTTPS URL will enable camera access on mobile devices.

## PWA Installation
After deployment, users can:
- Install the app from browser menu
- Add to home screen on mobile
- Use offline functionality