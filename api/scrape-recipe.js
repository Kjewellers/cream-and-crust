export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    // Fetch the HTML of the target URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch the URL');
    
    const html = await response.text();
    
    // Naive regex to extract JSON-LD (Schema.org) blocks
    const jsonLdRegex = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let recipeData = null;

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        // Handle array or object
        const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
        for (const item of items) {
          if (item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
            recipeData = item;
            break;
          }
        }
        if (recipeData) break;
      } catch (e) {
        // Ignore JSON parse errors for invalid scripts
      }
    }

    if (!recipeData) {
      return res.status(404).json({ error: 'No standard recipe data (Schema.org JSON-LD) found on this page.' });
    }

    // Extract standardized data
    const name = recipeData.name || '';
    const ingredientsRaw = recipeData.recipeIngredient || [];
    
    // Parse ingredients to fit our DB schema { name, qty, unit }
    const ingredients = ingredientsRaw.map(ing => {
      // Basic heuristic: first number is qty, second word is unit
      const parts = ing.split(' ');
      const qty = parseFloat(parts[0]) ? parts[0] : '1';
      return {
        name: ing,
        qty,
        unit: 'unit',
        cost: 0
      };
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

    // Handle image URLs (can be string or object/array)
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
    console.error('Recipe scrape error:', error);
    res.status(500).json({ error: 'Internal server error scraping recipe' });
  }
}
