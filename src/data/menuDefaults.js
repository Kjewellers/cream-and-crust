export const MENU_TEMPLATE_ASSETS = {
  truffle: '/assets/templates/product_truffle_1778776334868.png',
  redVelvet: '/assets/templates/product_red_velvet_1778776354239.png',
  butterscotch: '/assets/templates/playful_modern_hero_1778776279319.png',
  bento: '/assets/templates/product_bento_1778776389537.png',
  cheesecake: '/assets/templates/product_cheesecake_1778776370456.png',
  custom: '/assets/templates/wedding_premium_hero_1778776255942.png',
  darkHero: '/assets/templates/modern_dark_hero_1778776217862.png',
  luxuryHero: '/assets/templates/luxury_minimal_hero_1778776200555.png',
};

export const DEFAULT_MENU_CATEGORIES = [
  { id: 'cakes', name: 'Cakes', image: MENU_TEMPLATE_ASSETS.redVelvet, visible: true },
  { id: 'bento-cakes', name: 'Bento Cakes', image: MENU_TEMPLATE_ASSETS.bento, visible: true },
  { id: 'brownies', name: 'Brownies', image: MENU_TEMPLATE_ASSETS.darkHero, visible: true },
  { id: 'cupcakes', name: 'Cupcakes', image: MENU_TEMPLATE_ASSETS.redVelvet, visible: true },
  { id: 'desserts', name: 'Desserts', image: MENU_TEMPLATE_ASSETS.cheesecake, visible: true },
  { id: 'custom-cakes', name: 'Custom Cakes', image: MENU_TEMPLATE_ASSETS.custom, visible: true },
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
    template: 'classic',
    primaryColor: '#8f4229',
    secondaryColor: '#dc704b',
    font: 'Playfair Display',
    cardRadius: 10,
    buttonStyle: 'pill',
    spacingDensity: 'comfortable',
    animationIntensity: 'subtle',
    sectionOrder: ['hero', 'categories', 'bestsellers', 'products', 'custom', 'trust', 'footer'],
  },
  published: false,
  updatedAt: null,
};

export const normalizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const dedupeRepeatedName = (value) => {
  const name = String(value || '').trim();
  const midpoint = name.length / 2;
  return name.length % 2 === 0 && name.slice(0, midpoint) === name.slice(midpoint)
    ? name.slice(0, midpoint).trim()
    : name;
};

const isRenderableLogo = (val) =>
  typeof val === 'string' &&
  (val.startsWith('data:image') || val.startsWith('http://') || val.startsWith('https://'));

const businessLogo = (b = {}) => {
  if (isRenderableLogo(b.logoUrl)) return b.logoUrl;
  if (isRenderableLogo(b.logo)) return b.logo;
  return '';
};

export const mergeMenuSettings = (business = {}, settings = {}) => {
  const safeBusiness = business || {};
  const safeSettings = settings || {};

  // ── Profile is the single source of truth for IDENTITY + CONTACT ──
  // The menu builder no longer asks for these; it reads them from the
  // business profile so the user never types them twice. Legacy menu
  // settings (typed before this change) are kept as a fallback only.
  const rawName = safeBusiness.name || safeSettings.bakeryName || DEFAULT_MENU_SETTINGS.bakeryName;
  const bakeryName = dedupeRepeatedName(rawName);
  const deliveryAreasFromProfile = Array.isArray(safeBusiness.deliveryAreas)
    ? safeBusiness.deliveryAreas.join(', ')
    : safeBusiness.deliveryAreas || '';

  return {
    ...DEFAULT_MENU_SETTINGS,
    ...safeSettings,
    // Synced from profile (business-first):
    bakeryName,
    tagline: safeBusiness.tagline || safeSettings.tagline || DEFAULT_MENU_SETTINGS.tagline,
    whatsapp:
      safeBusiness.whatsapp ||
      safeBusiness.phone ||
      safeSettings.whatsapp ||
      DEFAULT_MENU_SETTINGS.whatsapp,
    phone: safeBusiness.phone || safeBusiness.whatsapp || safeSettings.phone || '',
    instagram: safeBusiness.instagram || safeSettings.instagram || DEFAULT_MENU_SETTINGS.instagram,
    website: safeBusiness.website || safeBusiness.portfolioLink || safeSettings.website || '',
    email: safeBusiness.email || safeSettings.email || '',
    city: safeBusiness.city || safeSettings.city || DEFAULT_MENU_SETTINGS.city,
    logoUrl: businessLogo(safeBusiness) || safeSettings.logoUrl || DEFAULT_MENU_SETTINGS.logoUrl,
    // Menu-only fields keep settings-first (these are NOT in the profile):
    deliveryLocations:
      safeSettings.deliveryLocations ||
      deliveryAreasFromProfile ||
      DEFAULT_MENU_SETTINGS.deliveryLocations,
    categories: safeSettings.categories?.length ? safeSettings.categories : DEFAULT_MENU_CATEGORIES,
    theme: {
      ...DEFAULT_MENU_SETTINGS.theme,
      ...(safeSettings.theme || {}),
    },
  };
};

export const menuImageForProduct = (product, index = 0) =>
  product?.imageUrl ||
  product?.img ||
  [
    MENU_TEMPLATE_ASSETS.truffle,
    MENU_TEMPLATE_ASSETS.redVelvet,
    MENU_TEMPLATE_ASSETS.butterscotch,
    MENU_TEMPLATE_ASSETS.cheesecake,
  ][index % 4];

export const normalizeMenuProducts = (products = []) =>
  products
    .filter((product) => product?.name && product.menuHidden !== true && product.visible !== false)
    // Respect the baker's drag-sorted menu order; products without an
    // explicit menuOrder fall to the end in their natural order.
    .map((product, naturalIndex) => ({ product, naturalIndex }))
    .sort((a, b) => {
      const oa = Number.isFinite(a.product.menuOrder) ? a.product.menuOrder : a.naturalIndex + 1000;
      const ob = Number.isFinite(b.product.menuOrder) ? b.product.menuOrder : b.naturalIndex + 1000;
      return oa - ob;
    })
    .map(({ product }, index) => ({
      id: product.id || `${product.name}-${index}`,
      name: product.name,
      description:
        product.description || product.flavors || 'Freshly baked with premium ingredients',
      price: Number(product.basePrice || product.price || 0),
      startingPrice: product.startingPrice !== false,
      image: menuImageForProduct(product, index),
      category: product.menuCategory || product.category || 'Cakes',
      bestseller: Boolean(product.bestseller || product.isBestseller),
      eggless: Boolean(product.eggless),
      weight: product.weight || product.variants || '',
      featured: product.featured !== false,
    }));
