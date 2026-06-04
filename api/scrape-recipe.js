import dns from 'dns/promises';
import net from 'net';
import admin from 'firebase-admin';

// ── Firebase Admin singleton (Vercel re-uses the module across warm invocations) ──
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    if (Object.keys(serviceAccount).length > 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || 'cream-and-crust',
      });
    }
  } catch (e) {
    console.error('Firebase Admin init error in scraper:', e.message);
  }
}

/** Verify Firebase ID token from Authorization header. Throws on failure. */
async function verifyFirebaseToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw Object.assign(new Error('Missing or invalid Authorization header'), { status: 401 });
  }
  if (!admin.apps.length) {
    throw Object.assign(new Error('Firebase Admin not initialized'), { status: 500 });
  }
  const idToken = authHeader.split('Bearer ')[1];
  return admin.auth().verifyIdToken(idToken);
}

function isPrivateIP(ip) {
  return (
    net.isIP(ip) &&
    (ip.startsWith('10.') ||
     ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') ||
     ip.startsWith('172.19.') || ip.startsWith('172.20.') || ip.startsWith('172.21.') ||
     ip.startsWith('172.22.') || ip.startsWith('172.23.') || ip.startsWith('172.24.') ||
     ip.startsWith('172.25.') || ip.startsWith('172.26.') || ip.startsWith('172.27.') ||
     ip.startsWith('172.28.') || ip.startsWith('172.29.') || ip.startsWith('172.30.') ||
     ip.startsWith('172.31.') ||
     ip.startsWith('192.168.') ||
     ip.startsWith('127.') ||
     ip === '0.0.0.0' ||
     ip.startsWith('169.254.') ||
     ip === '::1' ||
     ip.startsWith('fc00:') || ip.startsWith('fd00:') ||
     ip.startsWith('fe80:'))
  );
}

async function validateUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed');
  }

  const addresses = await dns.resolve4(parsed.hostname).catch(() => []);
  const addresses6 = await dns.resolve6(parsed.hostname).catch(() => []);
  const allAddresses = [...addresses, ...addresses6];

  if (allAddresses.length === 0) {
    throw new Error('Could not resolve hostname');
  }

  for (const addr of allAddresses) {
    if (isPrivateIP(addr)) {
      throw new Error('URL resolves to a private/internal IP address');
    }
  }

  return parsed;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ── Auth guard ───────────────────────────────────────────────
  try {
    await verifyFirebaseToken(req);
  } catch (authErr) {
    return res.status(authErr.status || 401).json({ error: authErr.message || 'Unauthorized' });
  }
  // ─────────────────────────────────────────────────────────────

  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    // SSRF protection: validate URL
    await validateUrl(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (!response.ok) throw new Error('Failed to fetch the URL');

    // Limit response size
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      throw new Error('Response too large');
    }
    
    const html = await response.text();
    
    const jsonLdRegex = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let recipeData = null;

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
        for (const item of items) {
          if (item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
            recipeData = item;
            break;
          }
        }
        if (recipeData) break;
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    if (!recipeData) {
      return res.status(404).json({ error: 'No standard recipe data (Schema.org JSON-LD) found on this page.' });
    }

    const name = recipeData.name || '';
    const ingredientsRaw = recipeData.recipeIngredient || [];
    
    const ingredients = ingredientsRaw.map(ing => {
      const parts = ing.split(' ');
      const qty = parseFloat(parts[0]) ? parts[0] : '1';
      return { name: ing, qty, unit: 'unit', cost: 0 };
    });

    const stepsRaw = recipeData.recipeInstructions || [];
    let steps = [];
    if (typeof stepsRaw === 'string') {
      steps = [{ title: 'Instructions', desc: stepsRaw }];
    } else {
      steps = stepsRaw.map(s => ({
        title: s.name || 'Step',
        desc: s.text || s
      }));
    }

    let imageUrl = '';
    if (recipeData.image) {
      if (typeof recipeData.image === 'string') imageUrl = recipeData.image;
      else if (Array.isArray(recipeData.image)) imageUrl = recipeData.image[0];
      else if (recipeData.image.url) imageUrl = recipeData.image.url;
    }

    res.status(200).json({
      success: true,
      data: {
        name,
        imageUrl,
        prepTime: recipeData.prepTime ? recipeData.prepTime.replace('PT', '') : '',
        bakeTime: recipeData.cookTime ? recipeData.cookTime.replace('PT', '') : '',
        yield: recipeData.recipeYield || '1 batch',
        ingredients,
        steps,
        category: recipeData.recipeCategory || 'Other',
        status: 'Draft'
      }
    });

  } catch (error) {
    console.error('Recipe scrape error:', error.message);
    if (error.message.includes('private') || error.message.includes('HTTPS') || error.message.includes('Invalid URL')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error scraping recipe' });
  }
}
