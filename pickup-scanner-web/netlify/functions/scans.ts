import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

interface Scan {
  id?: string | number;
  tracking: string;
  timestamp: number;
  deviceName: string;
  checked: boolean;
}

export default async (req: Request, context: Context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  try {
    const store = getStore({
      name: 'scans',
      consistency: 'strong',
      siteID: context.site.id,
    });
    
    const method = req.method;

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

      return new Response(JSON.stringify({ scans: allScans }), {
        status: 200,
        headers,
      });
    }

    // POST: Add a new scan
    if (method === 'POST') {
      const body = await req.text();
      if (!body) {
        return new Response(JSON.stringify({ error: 'Missing request body' }), {
          status: 400,
          headers,
        });
      }

      const scan: Scan = JSON.parse(body);
      
      // Generate unique ID using timestamp + random string
      const id = `${scan.timestamp}_${Math.random().toString(36).substr(2, 9)}`;
      const scanWithId = { ...scan, id };

      // Store the scan using the ID as the key
      await store.set(id, JSON.stringify(scanWithId));

      return new Response(JSON.stringify({ success: true, scan: scanWithId }), {
        status: 201,
        headers,
      });
    }

    // PUT: Update an existing scan (e.g., toggle checked status)
    if (method === 'PUT') {
      const body = await req.text();
      if (!body) {
        return new Response(JSON.stringify({ error: 'Missing request body' }), {
          status: 400,
          headers,
        });
      }

      const { id, updates } = JSON.parse(body);
      
      // Get existing scan
      const existingScan = await store.get(id, { type: 'json' });
      
      if (!existingScan) {
        return new Response(JSON.stringify({ error: 'Scan not found' }), {
          status: 404,
          headers,
        });
      }

      // Merge updates
      const updatedScan = { ...existingScan, ...updates };
      
      // Save updated scan
      await store.set(id, JSON.stringify(updatedScan));

      return new Response(JSON.stringify({ success: true, scan: updatedScan }), {
        status: 200,
        headers,
      });
    }

    // DELETE: Delete scan(s)
    if (method === 'DELETE') {
      const body = await req.text();
      if (!body) {
        return new Response(JSON.stringify({ error: 'Missing request body' }), {
          status: 400,
          headers,
        });
      }

      const { ids } = JSON.parse(body);
      
      if (!Array.isArray(ids)) {
        return new Response(JSON.stringify({ error: 'ids must be an array' }), {
          status: 400,
          headers,
        });
      }

      // Delete each scan
      for (const id of ids) {
        await store.delete(id);
      }

      return new Response(JSON.stringify({ success: true, deleted: ids.length }), {
        status: 200,
        headers,
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers,
    });
  }
};
