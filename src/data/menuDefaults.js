export const MENU_TEMPLATE_ASSETS = {
  truffle: '/assets/templates/product_truffle_1778776334868.png',
  redVelvet: '/assets/templates/product_red_velvet_1778776354239.png',
  butterscotch: '/assets/templates/playful_modern_hero_1778776279319.png',
  bento: '/assets/templates/product_bento_1778776389537.png',
  cheesecake: '/assets/templates/product_cheesecake_1778776370456.png',
  custom: '/assets/templates/wedding_premium_hero_1778776255942.png',
  darkHero: '/assets/templates/modern_dark_hero_1778776217862.png',
  luxuryHero: '/assets/templates/luxury_minimal_hero_1778776200555.png'
};

export const DEFAULT_MENU_CATEGORIES = [
  { id: 'cakes', name: 'Cakes', image: MENU_TEMPLATE_ASSETS.redVelvet, visible: true },
  { id: 'bento-cakes', name: 'Bento Cakes', image: MENU_TEMPLATE_ASSETS.bento, visible: true },
  { id: 'brownies', name: 'Brownies', image: MENU_TEMPLATE_ASSETS.darkHero, visible: true },
  { id: 'cupcakes', name: 'Cupcakes', image: MENU_TEMPLATE_ASSETS.redVelvet, visible: true },
  { id: 'desserts', name: 'Desserts', image: MENU_TEMPLATE_ASSETS.cheesecake, visible: true },
  { id: 'custom-cakes', name: 'Custom Cakes', image: MENU_TEMPLATE_ASSETS.custom, visible: true }
];

export const DEFAULT_MENU_SETTINGS = {
  bakeryName: 'Cream & Crust',
  tagline: 'Made with love',
  heroTitle: 'Sweet Moments,\nMade Special',
  description: 'Homemade cakes & desserts for every occasion',
  whatsapp: '',
  instagram: '',
  timings: '9:00 AM - 9:00 PM (Daily)',
  deliveryLocations: 'Local delivery and pick-up available',
  city: '',
  logoUrl: '/logo.png',
  heroImage: MENU_TEMPLATE_ASSETS.luxuryHero,
  categories: DEFAULT_MENU_CATEGORIES,
  theme: {
    primaryColor: '#8f4229',
    secondaryColor: '#dc704b',
    font: 'Playfair Display',
    cardRadius: 10,
    buttonStyle: 'pill',
    spacingDensity: 'comfortable',
    animationIntensity: 'subtle',
    sectionOrder: ['hero', 'categories', 'bestsellers', 'products', 'custom', 'trust', 'footer']
  },
  published: false,
  updatedAt: null
};

export const normalizeSlug = (value) => (
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
);

const dedupeRepeatedName = (value) => {
  const name = String(value || '').trim();
  const midpoint = name.length / 2;
  return name.length % 2 === 0 && name.slice(0, midpoint) === name.slice(midpoint)
    ? name.slice(0, midpoint).trim()
    : name;
};

export const mergeMenuSettings = (business = {}, settings = {}) => {
  const safeBusiness = business || {};
  const safeSettings = settings || {};
  const bakeryName = dedupeRepeatedName(safeSettings.bakeryName || safeBusiness.name || DEFAULT_MENU_SETTINGS.bakeryName);

  return {
    ...DEFAULT_MENU_SETTINGS,
    ...safeSettings,
    bakeryName,
    whatsapp: safeSettings.whatsapp || safeBusiness.whatsapp || safeBusiness.phone || DEFAULT_MENU_SETTINGS.whatsapp,
    instagram: safeSettings.instagram || safeBusiness.instagram || DEFAULT_MENU_SETTINGS.instagram,
    city: safeSettings.city || safeBusiness.city || DEFAULT_MENU_SETTINGS.city,
    logoUrl: safeSettings.logoUrl || safeBusiness.logoUrl || DEFAULT_MENU_SETTINGS.logoUrl,
    categories: safeSettings.categories?.length ? safeSettings.categories : DEFAULT_MENU_CATEGORIES,
    theme: {
      ...DEFAULT_MENU_SETTINGS.theme,
      ...(safeSettings.theme || {})
    }
  };
};

export const menuImageForProduct = (product, index = 0) => (
  product?.imageUrl || product?.img || [
    MENU_TEMPLATE_ASSETS.truffle,
    MENU_TEMPLATE_ASSETS.redVelvet,
    MENU_TEMPLATE_ASSETS.butterscotch,
    MENU_TEMPLATE_ASSETS.cheesecake
  ][index % 4]
);

export const normalizeMenuProducts = (products = []) => (
  products
    .filter(product => product?.name && product.menuHidden !== true && product.visible !== false)
    .map((product, index) => ({
      id: product.id || `${product.name}-${index}`,
      name: product.name,
      description: product.description || product.flavors || 'Freshly baked with premium ingredients',
      price: Number(product.basePrice || product.price || 0),
      startingPrice: product.startingPrice !== false,
      image: menuImageForProduct(product, index),
      category: product.menuCategory || product.category || 'Cakes',
      bestseller: Boolean(product.bestseller || product.isBestseller),
      eggless: Boolean(product.eggless),
      weight: product.weight || product.variants || '',
      featured: product.featured !== false
    }))
);
