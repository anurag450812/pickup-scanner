import { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

interface Scan {
  id?: number;
  tracking: string;
  timestamp: number;
  deviceName: string;
  checked: boolean;
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const store = getStore('scans');
    const method = event.httpMethod;

    // GET: Retrieve all scans
    if (method === 'GET') {
      const scansList = await store.list();
      const allScans: Scan[] = [];

      for await (const blob of scansList.blobs) {
        const data = await store.get(blob.key, { type: 'json' });
        if (data) {
          allScans.push(data as Scan);
        }
      }

      // Sort by timestamp, newest first
      allScans.sort((a, b) => b.timestamp - a.timestamp);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ scans: allScans }),
      };
    }

    // POST: Add a new scan
    if (method === 'POST') {
      if (!event.body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing request body' }),
        };
      }

      const scan: Scan = JSON.parse(event.body);
      
      // Generate unique ID using timestamp + random string
      const id = `${scan.timestamp}_${Math.random().toString(36).substr(2, 9)}`;
      const scanWithId = { ...scan, id };

      // Store the scan using the ID as the key
      await store.set(id, JSON.stringify(scanWithId));

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, scan: scanWithId }),
      };
    }

    // PUT: Update an existing scan (e.g., toggle checked status)
    if (method === 'PUT') {
      if (!event.body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing request body' }),
        };
      }

      const { id, updates } = JSON.parse(event.body);
      
      // Get existing scan
      const existingScan = await store.get(id, { type: 'json' });
      
      if (!existingScan) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Scan not found' }),
        };
      }

      // Merge updates
      const updatedScan = { ...existingScan, ...updates };
      
      // Save updated scan
      await store.set(id, JSON.stringify(updatedScan));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, scan: updatedScan }),
      };
    }

    // DELETE: Delete scan(s)
    if (method === 'DELETE') {
      if (!event.body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing request body' }),
        };
      }

      const { ids } = JSON.parse(event.body);
      
      if (!Array.isArray(ids)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'ids must be an array' }),
        };
      }

      // Delete each scan
      for (const id of ids) {
        await store.delete(id);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, deleted: ids.length }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
