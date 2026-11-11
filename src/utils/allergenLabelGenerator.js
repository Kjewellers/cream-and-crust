/**
 * allergenLabelGenerator.js
 *
 * Automated allergen identification and regulatory food labeling engine
 * compliant with FSSAI (Food Safety and Standards Authority of India) and international standards.
 */

export const ALLERGEN_RULES = [
  {
    key: 'gluten',
    label: 'Gluten (Wheat)',
    keywords: ['flour', 'maida', 'atta', 'wheat', 'bread', 'semolina', 'sooji', 'suji', 'rye', 'barley', 'oats'],
  },
  {
    key: 'dairy',
    label: 'Milk & Dairy',
    keywords: ['milk', 'butter', 'cream', 'cheese', 'mascarpone', 'ghee', 'yogurt', 'curd', 'whey', 'condensed milk', 'khoya', 'paneer'],
  },
  {
    key: 'eggs',
    label: 'Eggs',
    keywords: ['egg', 'eggs', 'egg white', 'egg yolk', 'albumen', 'meringue'],
  },
  {
    key: 'nuts',
    label: 'Tree Nuts & Peanuts',
    keywords: [
      'nut', 'nuts', 'almond', 'almonds', 'badam', 'cashew', 'cashews', 'kaju',
      'walnut', 'walnuts', 'akhrot', 'pistachio', 'pistachios', 'pista',
      'peanut', 'peanuts', 'hazelnut', 'hazelnuts', 'pecan', 'pecans',
    ],
  },
  {
    key: 'soy',
    label: 'Soybeans',
    keywords: ['soy', 'soya', 'soy lecithin', 'tofu'],
  },
  {
    key: 'sesame',
    label: 'Sesame',
    keywords: ['sesame', 'til', 'tahini'],
  },
];

/**
 * Scan ingredients string or array to detect known allergens
 * @param {string|string[]} ingredients
 */
export function detectAllergens(ingredients = []) {
  const text = Array.isArray(ingredients) ? ingredients.join(' ').toLowerCase() : String(ingredients || '').toLowerCase();
  const detected = [];

  ALLERGEN_RULES.forEach((rule) => {
    const matched = rule.keywords.some((kw) => {
      // Regex word boundary matching
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(text);
    });
    if (matched) {
      detected.push(rule.label);
    }
  });

  const containsEgg = detected.includes('Eggs') || /\begg\b|\beggs\b/i.test(text);

  return {
    allergens: detected,
    isEggless: !containsEgg,
    hasAllergens: detected.length > 0,
    advisoryStatement:
      detected.length > 0
        ? `Contains: ${detected.join(', ')}. Manufactured in an atelier that processes nuts, wheat, and dairy.`
        : 'Allergen Advisory: Manufactured in an atelier handling nuts, wheat, and dairy.',
  };
}

/**
 * Generate full compliant regulatory label metadata
 */
export function generateLabelData({
  productName = 'Artisan Bake',
  bakeryName = 'Cream & Crust Bakery Atelier',
  fssaiNumber = '',
  netWeight = '500g',
  ingredients = [],
  mfgDate = new Date(),
  shelfLifeDays = 3,
  batchCode = '',
  storageTemp = 'Store in a cool, dry place below 20°C. Once opened, keep refrigerated.',
}) {
  const allergenInfo = detectAllergens(ingredients);
  const mfg = new Date(mfgDate);
  const bestBefore = new Date(mfg.getTime() + shelfLifeDays * 86400000);

  const batch = batchCode || `CC-${mfg.getFullYear()}${(mfg.getMonth() + 1).toString().padStart(2, '0')}${mfg.getDate().toString().padStart(2, '0')}-01`;

  const formatDateStr = (d) =>
    `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

  return {
    productName,
    bakeryName,
    fssaiNumber: fssaiNumber || 'FSSAI Lic. No. Pending',
    netWeight,
    isEggless: allergenInfo.isEggless,
    allergens: allergenInfo.allergens,
    advisoryStatement: allergenInfo.advisoryStatement,
    batchCode: batch,
    mfgDateStr: formatDateStr(mfg),
    bestBeforeDateStr: formatDateStr(bestBefore),
    shelfLifeDays,
    storageInstructions: storageTemp,
    // ESC/POS raw thermal print text formatting
    thermalText: [
      `================================`,
      `    ${bakeryName.toUpperCase()}    `,
      `================================`,
      `ITEM: ${productName}`,
      `TYPE: ${allergenInfo.isEggless ? '[GREEN DOT - 100% VEG/EGGLESS]' : '[BROWN DOT - CONTAINS EGG]'}`,
      `NET WT: ${netWeight}`,
      `BATCH: ${batch}`,
      `MFG: ${formatDateStr(mfg)}`,
      `BEST BEFORE: ${formatDateStr(bestBefore)}`,
      `--------------------------------`,
      `${allergenInfo.advisoryStatement}`,
      `STORAGE: ${storageTemp}`,
      fssaiNumber ? `FSSAI: ${fssaiNumber}` : '',
      `================================`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
