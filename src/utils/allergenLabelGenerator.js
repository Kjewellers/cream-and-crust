/**
 * allergenLabelGenerator.js
 *
 * Automated allergen identification, printer auto-adjustment, and regulatory
 * food labeling engine compliant with FSSAI (Food Safety and Standards Authority of India)
 * and international food labeling guidelines.
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
 * Standard Bakery Printer Formats & Dimensions
 */
export const PRINTER_FORMATS = {
  stickerSquare50: {
    id: 'stickerSquare50',
    name: '2" × 2" Square (50mm × 50mm)',
    shortName: '2" × 2" Square',
    subtitle: 'Standard Cake Box & Cookie Pouch Thermal Sticker',
    widthMm: 50,
    heightMm: 50,
    columns: 32,
    aspectRatio: '1 / 1',
    maxWidthPx: 320,
    printPageSize: '50mm 50mm',
    paperType: 'diecut',
    badge: 'MOST POPULAR',
  },
  stickerRect75x50: {
    id: 'stickerRect75x50',
    name: '3" × 2" Rectangular (75mm × 50mm)',
    shortName: '3" × 2" Box Label',
    subtitle: 'Wider Shipping / Bakery Tub Label Roll',
    widthMm: 75,
    heightMm: 50,
    columns: 42,
    aspectRatio: '3 / 2',
    maxWidthPx: 390,
    printPageSize: '75mm 50mm',
    paperType: 'diecut',
    badge: 'WIDE',
  },
  thermal58: {
    id: 'thermal58',
    name: '58mm Thermal Roll (2 Inch)',
    shortName: '58mm POS Roll',
    subtitle: 'Bluetooth POS & Portable Receipt Printer',
    widthMm: 58,
    heightMm: 'auto',
    columns: 32,
    aspectRatio: '58 / 68',
    maxWidthPx: 300,
    printPageSize: '58mm auto',
    paperType: 'continuous',
    badge: 'POS',
  },
  thermal80: {
    id: 'thermal80',
    name: '80mm Thermal Roll (3 Inch)',
    shortName: '80mm Kitchen Roll',
    subtitle: 'High-Density Kitchen Receipt Printer',
    widthMm: 80,
    heightMm: 'auto',
    columns: 44,
    aspectRatio: '80 / 90',
    maxWidthPx: 380,
    printPageSize: '80mm auto',
    paperType: 'continuous',
    badge: 'KITCHEN',
  },
  stickerJarRound: {
    id: 'stickerJarRound',
    name: '60mm Round (2.4" Circle)',
    shortName: '60mm Round Seal',
    subtitle: 'Jar Lid, Cupcake Pod & Cake Board Seal',
    widthMm: 60,
    heightMm: 60,
    columns: 34,
    aspectRatio: '1 / 1',
    maxWidthPx: 320,
    printPageSize: '60mm 60mm',
    paperType: 'diecut',
    badge: 'ROUND',
  },
  a4SheetGrid: {
    id: 'a4SheetGrid',
    name: 'A4 Sticker Sheet (8 Labels)',
    shortName: 'A4 Sheet (8x)',
    subtitle: 'Print multiple stickers on home/office Inkjet or Laser',
    widthMm: 210,
    heightMm: 297,
    columns: 48,
    aspectRatio: '3 / 2',
    maxWidthPx: 380,
    printPageSize: 'A4 portrait',
    paperType: 'sheet',
    badge: 'INKJET / A4',
  },
};

/**
 * Curated Label Design Templates
 */
export const LABEL_TEMPLATES = {
  classicThermal: {
    id: 'classicThermal',
    name: 'Classic Thermal',
    description: 'High contrast monochrome for 203dpi thermal printers',
    borderStyle: '2px solid #000000',
    bgColor: '#FFFFFF',
    textColor: '#000000',
    accentColor: '#000000',
    headerBorder: '1.5px solid #000000',
    dividerStyle: '1px dashed #000000',
    badgeBg: '#000000',
    badgeColor: '#FFFFFF',
    previewBadge: 'THERMAL',
  },
  artisanMinimal: {
    id: 'artisanMinimal',
    name: 'Artisan Minimalist',
    description: 'Sophisticated hairline borders for boutique pâtisseries',
    borderStyle: '1px solid rgba(0, 0, 0, 0.35)',
    bgColor: '#FCFCFC',
    textColor: '#1A1816',
    accentColor: '#B5606A',
    headerBorder: '1px solid rgba(0, 0, 0, 0.15)',
    dividerStyle: '1px solid rgba(0, 0, 0, 0.08)',
    badgeBg: '#FFF0EE',
    badgeColor: '#B5606A',
    previewBadge: 'MINIMAL',
  },
  luxuryGold: {
    id: 'luxuryGold',
    name: 'Luxury Kraft & Gold',
    description: 'Warm artisanal kraft palette with gold framing',
    borderStyle: '2.5px double #B48C48',
    bgColor: '#FAF7F0',
    textColor: '#2C221A',
    accentColor: '#B48C48',
    headerBorder: '1px solid #D6BC8A',
    dividerStyle: '1px dashed #D6BC8A',
    badgeBg: '#F5EBD7',
    badgeColor: '#8C682A',
    previewBadge: 'LUXURY',
  },
  retailGrid: {
    id: 'retailGrid',
    name: 'Modern Retail Pack',
    description: 'Structured supermarket grid with nutrition facts & barcode',
    borderStyle: '2px solid #1E293B',
    bgColor: '#FFFFFF',
    textColor: '#0F172A',
    accentColor: '#0284C7',
    headerBorder: '2px solid #1E293B',
    dividerStyle: '1px solid #CBD5E1',
    badgeBg: '#E0F2FE',
    badgeColor: '#0369A1',
    previewBadge: 'RETAIL',
  },
  compactJar: {
    id: 'compactJar',
    name: 'Circular Seal',
    description: 'Concentric border badge for jar lids and pastry pods',
    borderStyle: '3px double #1E293B',
    bgColor: '#FFFFFF',
    textColor: '#1E293B',
    accentColor: '#10B981',
    headerBorder: '1px solid rgba(0,0,0,0.15)',
    dividerStyle: '1px dotted rgba(0,0,0,0.2)',
    badgeBg: '#ECFDF5',
    badgeColor: '#059669',
    previewBadge: 'SEAL',
  },
};

/**
 * Curated Brand Typography Options
 */
export const LABEL_FONTS = {
  sans: {
    id: 'sans',
    name: 'Modern Sans',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    sample: 'Ag',
  },
  serif: {
    id: 'serif',
    name: 'Boutique Serif',
    fontFamily: '"Playfair Display", Georgia, "Times New Roman", serif',
    sample: 'Ag',
  },
  mono: {
    id: 'mono',
    name: 'Kitchen Mono',
    fontFamily: '"Space Mono", "Courier New", Courier, monospace',
    sample: 'Ag',
  },
  rounded: {
    id: 'rounded',
    name: 'Artisan Rounded',
    fontFamily: '"Quicksand", "Outfit", system-ui, sans-serif',
    sample: 'Ag',
  },
};

/**
 * Scan ingredients string or array to detect known allergens
 * @param {string|string[]} ingredients
 */
export function detectAllergens(ingredients = []) {
  const text = Array.isArray(ingredients) ? ingredients.join(' ').toLowerCase() : String(ingredients || '').toLowerCase();
  const detected = [];

  ALLERGEN_RULES.forEach((rule) => {
    const matched = rule.keywords.some((kw) => {
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
        : 'Allergen Advisory: Prepared in an atelier handling nuts, wheat, and dairy.',
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
  storageTemp = 'Store in a cool, dry place below 20°C. Keep refrigerated once opened.',
  mrp = '450',
  printerFormat = 'stickerSquare50',
  templateKey = 'classicThermal',
  fontKey = 'sans',
  showNutrition = false,
  showBarcode = true,
  nutrition = {
    energyKcal: 380,
    proteinG: 5.2,
    carbsG: 54.0,
    sugarG: 32.0,
    fatG: 16.5,
    satFatG: 9.8,
  },
}) {
  const allergenInfo = detectAllergens(ingredients);
  const mfg = new Date(mfgDate);
  const bestBefore = new Date(mfg.getTime() + shelfLifeDays * 86400000);

  const formatCfg = PRINTER_FORMATS[printerFormat] || PRINTER_FORMATS.stickerSquare50;
  const templateCfg = LABEL_TEMPLATES[templateKey] || LABEL_TEMPLATES.classicThermal;
  const fontCfg = LABEL_FONTS[fontKey] || LABEL_FONTS.sans;

  const batch = batchCode || `CC-${mfg.getFullYear()}${(mfg.getMonth() + 1).toString().padStart(2, '0')}${mfg.getDate().toString().padStart(2, '0')}-01`;

  const formatDateStr = (d) =>
    `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

  const colWidth = formatCfg.columns || 32;
  const ruleLine = '='.repeat(colWidth);
  const dashLine = '-'.repeat(colWidth);

  // Dynamic ESC/POS thermal text generator tailored to selected printer column width
  const thermalLines = [
    ruleLine,
    bakeryName.toUpperCase().slice(0, colWidth).padStart(Math.floor((colWidth + bakeryName.length) / 2)).padEnd(colWidth),
    ruleLine,
    `ITEM: ${productName}`,
    `TYPE: ${allergenInfo.isEggless ? '[GREEN DOT - 100% VEG/EGGLESS]' : '[BROWN DOT - CONTAINS EGG]'}`,
    `NET WT: ${netWeight}${mrp ? ` | MRP: ₹${mrp}` : ''}`,
    `BATCH: ${batch}`,
    `MFG: ${formatDateStr(mfg)}`,
    `BEST BEFORE: ${formatDateStr(bestBefore)} (${shelfLifeDays} Days)`,
    dashLine,
    allergenInfo.advisoryStatement,
    `STORAGE: ${storageTemp}`,
  ];

  if (showNutrition && nutrition) {
    thermalLines.push(dashLine);
    thermalLines.push(`NUTRITION (per 100g approx):`);
    thermalLines.push(`Energy: ${nutrition.energyKcal} kcal | Protein: ${nutrition.proteinG}g`);
    thermalLines.push(`Carbs: ${nutrition.carbsG}g (Sugar: ${nutrition.sugarG}g) | Fat: ${nutrition.fatG}g`);
  }

  if (fssaiNumber) {
    thermalLines.push(dashLine);
    thermalLines.push(`FSSAI Lic. No: ${fssaiNumber}`);
  }

  thermalLines.push(ruleLine);

  return {
    productName,
    bakeryName,
    fssaiNumber: fssaiNumber || '',
    netWeight,
    mrp: mrp ? `₹${mrp.toString().replace(/[^\d.]/g, '')}` : '',
    isEggless: allergenInfo.isEggless,
    allergens: allergenInfo.allergens,
    advisoryStatement: allergenInfo.advisoryStatement,
    batchCode: batch,
    mfgDateStr: formatDateStr(mfg),
    bestBeforeDateStr: formatDateStr(bestBefore),
    shelfLifeDays,
    storageInstructions: storageTemp,
    printerFormat,
    formatCfg,
    templateKey,
    templateCfg,
    fontKey,
    fontCfg,
    showNutrition,
    showBarcode,
    nutrition,
    thermalText: thermalLines.join('\n'),
  };
}
