# Netlify Integration

This application now stores all scanned barcode data to Netlify using serverless functions and Netlify Blobs.

## Architecture

### Local Storage (Dexie/IndexedDB)
- Primary data store for offline-first functionality
- Immediate writes for fast performance
- Automatic sync to Netlify in the background

### Netlify Storage (Blobs)
- Cloud backup of all scans
- Persistent storage across devices
- Accessible via serverless functions

## How It Works

### 1. Scanning a Barcode
When a barcode is scanned:
1. Data is saved to **local IndexedDB** first (instant)
2. Simultaneously synced to **Netlify Blobs** in the background
3. Netlify ID is stored locally for future updates

### 2. Updating Scans
When marking a scan as checked/unchecked:
1. Local database is updated immediately
2. Change synced to Netlify using the stored Netlify ID

### 3. Deleting Scans
When deleting scans:
1. Local database deletes first
2. Netlify is updated to remove the same records

## API Endpoints

### GET `/.netlify/functions/scans`
Retrieves all scans from Netlify storage.

**Response:**
```json
{
  "scans": [
    {
      "id": "1699999999999_abc123",
      "tracking": "1234567890",
      "timestamp": 1699999999999,
      "deviceName": "Device 1",
      "checked": false
    }
  ]
}
```

### POST `/.netlify/functions/scans`
Saves a new scan to Netlify.

**Request:**
```json
{
  "tracking": "1234567890",
  "timestamp": 1699999999999,
  "deviceName": "Device 1",
  "checked": false
}
```

**Response:**
```json
{
  "success": true,
  "scan": {
    "id": "1699999999999_abc123",
    "tracking": "1234567890",
    "timestamp": 1699999999999,
    "deviceName": "Device 1",
    "checked": false
  }
}
```

### PUT `/.netlify/functions/scans`
Updates an existing scan on Netlify.

**Request:**
```json
{
  "id": "1699999999999_abc123",
  "updates": {
    "checked": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "scan": {
    "id": "1699999999999_abc123",
    "tracking": "1234567890",
    "timestamp": 1699999999999,
    "deviceName": "Device 1",
    "checked": true
  }
}
```

### DELETE `/.netlify/functions/scans`
Deletes scans from Netlify.

**Request:**
```json
{
  "ids": ["1699999999999_abc123", "1699999999998_def456"]
}
```

**Response:**
```json
{
  "success": true,
  "deleted": 2
}
```

## Environment Setup

### Required Netlify Configuration

The application requires Netlify Blobs to be enabled. This is automatically available for all Netlify sites.

### Deployment

1. **Push to GitHub**: All changes are committed to the repository
2. **Auto-Deploy**: Netlify automatically deploys on push to main branch
3. **Functions Deploy**: Serverless functions are deployed from `netlify/functions/`
4. **Blobs Storage**: Automatically configured for the site

## Files Modified

- **`src/db/dexie.ts`**: Added Netlify sync to all CRUD operations
- **`src/lib/api.ts`**: API service layer for Netlify functions
- **`netlify/functions/scans.ts`**: Serverless function for data operations
- **`netlify.toml`**: Added functions configuration

## Benefits

✅ **Offline-First**: Works without internet, syncs when online  
✅ **Data Backup**: All scans automatically backed up to cloud  
✅ **Multi-Device**: Can sync data across devices in future  
✅ **No Extra Cost**: Uses Netlify's built-in Blobs storage  
✅ **Fast Performance**: Local writes are instant  
✅ **Automatic Sync**: No user action needed  

## Testing

### Local Development
```bash
npm run dev
```
Functions will be available at `/.netlify/functions/scans`

### Production
After deployment to Netlify, all scans will automatically sync to cloud storage.

## Monitoring

Check Netlify Functions logs in the Netlify dashboard:
1. Go to your site in Netlify
2. Click "Functions" in the navigation
3. Select the `scans` function
4. View logs and invocations

## Future Enhancements

- Batch sync for better performance
- Conflict resolution for multi-device usage
- Manual sync trigger in settings
- Sync status indicator in UI
- Download all cloud data option
