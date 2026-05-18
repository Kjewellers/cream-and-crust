export const TEMPLATES = [
  {
    id: 'luxury-minimal',
    name: 'Luxury Minimal',
    category: 'Minimal',
    badge: 'PREMIUM',
    vibe: 'Elegant • Sophisticated',
    description: 'Timeless elegance with high-contrast typography and generous whitespace.',
    heroImage: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?auto=format&fit=crop&q=80&w=2070',
    previewColors: ['#FFFFFF', '#8C7851', '#4A4036'],
    styles: {
      bg: '#FFFFFF',
      accent: '#8C7851',
      secondary: '#F5F5F7',
      text: '#1A1A1A',
      cardBg: '#FFFFFF',
      font: "'Playfair Display', serif",
      bodyFont: "'Inter', sans-serif",
      radius: '0px',
      button: 'square',
      shadow: '0 10px 40px rgba(0,0,0,0.05)',
      animation: 'fade-up'
    },
    sections: ['hero', 'featured', 'about', 'gallery', 'contact'],
    mockProducts: [
      { name: 'Pure Vanilla Bean', basePrice: 1200, category: 'Cakes', img: 'https://images.unsplash.com/photo-1464349153735-7db50ed83c84?auto=format&fit=crop&q=80&w=600' },
      { name: 'Artisan Sourdough', basePrice: 450, category: 'Breads', img: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&q=80&w=600' }
    ]
  },
  {
    id: 'modern-dark',
    name: 'Modern Dark',
    category: 'Modern',
    badge: 'CINEMATIC',
    vibe: 'Bold • Cinematic',
    description: 'Deep charcoal tones with gold accents and glowing UI elements.',
    heroImage: 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?auto=format&fit=crop&q=80&w=2070',
    previewColors: ['#0F0F0F', '#F59E0B', '#1A1A1A'],
    styles: {
      bg: '#0F0F0F',
      accent: '#F59E0B',
      secondary: '#1A1A1A',
      text: '#FFFFFF',
      cardBg: '#1A1A1A',
      font: "'Inter', sans-serif",
      bodyFont: "'Inter', sans-serif",
      radius: '16px',
      button: 'rounded',
      shadow: '0 20px 40px rgba(0,0,0,0.4)',
      animation: 'slide-in'
    },
    sections: ['hero', 'catalog', 'stats', 'testimonials', 'contact'],
    mockProducts: [
      { name: 'Midnight Truffle', basePrice: 1800, category: 'Truffles', img: 'https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?auto=format&fit=crop&q=80&w=600' },
      { name: 'Gold Leaf Brownie', basePrice: 250, category: 'Brownies', img: 'https://images.unsplash.com/photo-1582176604447-aa5144675a69?auto=format&fit=crop&q=80&w=600' }
    ]
  },
  {
    id: 'insta-creator',
    name: 'Instagram Creator',
    category: 'Social',
    badge: 'TRENDING',
    vibe: 'Trendy • Dynamic',
    description: 'Mobile-first design with story highlights and social grid aesthetics.',
    heroImage: 'https://images.unsplash.com/photo-1535141192574-5d4897c826a0?auto=format&fit=crop&q=80&w=2070',
    previewColors: ['#FFFFFF', '#FF4D6D', '#FFF0F3'],
    styles: {
      bg: '#FFFFFF',
      accent: '#FF4D6D',
      secondary: '#FFF0F3',
      text: '#000000',
      cardBg: '#FFFFFF',
      font: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      radius: '24px',
      button: 'pill',
      shadow: '0 15px 35px rgba(255,77,109,0.1)',
      animation: 'pop-in'
    },
    sections: ['stories', 'grid', 'reels', 'testimonials', 'links'],
    mockProducts: [
      { name: 'Berry Bento Box', basePrice: 850, category: 'Bento', img: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&q=80&w=600' },
      { name: 'Pastel Macarons', basePrice: 600, category: 'Macarons', img: 'https://images.unsplash.com/photo-1558326567-98ae2d27f79a?auto=format&fit=crop&q=80&w=600' }
    ]
  },
  {
    id: 'wedding-premium',
    name: 'Wedding Cakes',
    category: 'Luxury',
    badge: 'BESPOKE',
    vibe: 'Romantic • Artisan',
    description: 'Soft palettes and delicate typography for high-end wedding studios.',
    heroImage: 'https://images.unsplash.com/photo-1535254973040-607b474cb80d?auto=format&fit=crop&q=80&w=2070',
    previewColors: ['#FFFCF9', '#C5A059', '#4A4036'],
    styles: {
      bg: '#FFFCF9',
      accent: '#C5A059',
      secondary: '#FFFFFF',
      text: '#4A4036',
      cardBg: '#FFFFFF',
      font: "'Cormorant Garamond', serif",
      bodyFont: "'Inter', sans-serif",
      radius: '4px',
      button: 'square',
      shadow: '0 20px 60px rgba(74,64,54,0.05)',
      animation: 'fade'
    },
    sections: ['hero', 'about', 'gallery', 'inquiry', 'contact'],
    mockProducts: [
      { name: 'Floral Tiered Bliss', basePrice: 15000, category: 'Wedding', img: 'https://images.unsplash.com/photo-1522767131594-6b7e96848fba?auto=format&fit=crop&q=80&w=600' },
      { name: 'Royal Velvet Wedding', basePrice: 8500, category: 'Wedding', img: 'https://images.unsplash.com/photo-1535254973040-607b474cb80d?auto=format&fit=crop&q=80&w=600' }
    ]
  },
  {
    id: 'playful-modern',
    name: 'Playful Modern',
    category: 'Playful',
    badge: 'JOYFUL',
    vibe: 'Fun • Youthful',
    description: 'Vibrant gradients, organic shapes, and bounce interactions.',
    heroImage: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&q=80&w=2070',
    previewColors: ['#FDF6ED', '#FF8B6B', '#3498DB'],
    styles: {
      bg: '#FDF6ED',
      accent: '#FF8B6B',
      secondary: '#3498DB',
      text: '#2D3436',
      cardBg: '#FFFFFF',
      font: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      radius: '32px',
      button: 'pill',
      shadow: '0 10px 30px rgba(0,0,0,0.1)',
      animation: 'spring'
    },
    sections: ['hero', 'treats', 'reviews', 'footer'],
    mockProducts: [
      { name: 'Rainbow Donuts', basePrice: 150, category: 'Donuts', img: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=600' },
      { name: 'Confetti Cupcake', basePrice: 120, category: 'Cupcakes', img: 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?auto=format&fit=crop&q=80&w=600' }
    ]
  },
  {
    id: 'business-pro',
    name: 'Business Pro',
    category: 'Business',
    badge: 'CORPORATE',
    vibe: 'Clean • Professional',
    description: 'Trust-focused layout with detailed catalog and business stats.',
    heroImage: 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&q=80&w=2070',
    previewColors: ['#F8FAFC', '#2563EB', '#0F172A'],
    styles: {
      bg: '#F8FAFC',
      accent: '#2563EB',
      secondary: '#E2E8F0',
      text: '#0F172A',
      cardBg: '#FFFFFF',
      font: "'Inter', sans-serif",
      bodyFont: "'Inter', sans-serif",
      radius: '12px',
      button: 'rounded',
      shadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      animation: 'fade-in'
    },
    sections: ['hero', 'bestsellers', 'stats', 'reviews', 'map', 'footer'],
    mockProducts: [
      { name: 'Corporate Gift Hamper', basePrice: 2500, category: 'Corporate', img: 'https://images.unsplash.com/photo-1549462184-b09ad0a4af60?auto=format&fit=crop&q=80&w=600' },
      { name: 'Bulk Artisan Pack', basePrice: 1200, category: 'Bulk', img: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?auto=format&fit=crop&q=80&w=600' }
    ]
  },
  {
    id: 'french-joy',
    name: 'French Joy',
    category: 'Thematic',
    badge: 'AUTHENTIC',
    vibe: 'Cheeky • Chic',
    description: 'Playful French-American aesthetic with sun-drenched colors and hand-drawn warmth.',
    heroImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=2070',
    previewColors: ['#FFFBF5', '#FF6B35', '#FFD166'],
    styles: {
      bg: '#FFFBF5',
      accent: '#FF6B35',
      secondary: '#FFD166',
      text: '#2D3047',
      cardBg: '#FFFFFF',
      font: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      radius: '40px',
      button: 'pill',
      shadow: '0 20px 40px rgba(255,107,53,0.1)',
      animation: 'spring'
    },
    sections: ['hero', 'why-us', 'joy-gallery', 'story', 'footer'],
    mockProducts: [
      { name: 'Classic Crêpes', basePrice: 499, category: 'French', img: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?auto=format&fit=crop&q=80&w=600' },
      { name: 'Brioche Loaf', basePrice: 299, category: 'Breads', img: 'https://images.unsplash.com/photo-1609156476313-1a2214157070?auto=format&fit=crop&q=80&w=600' }
    ]
  },
  {
    id: 'bakerly-artisan',
    name: 'French Artisan',
    category: 'Thematic',
    badge: 'AUTHENTIC',
    vibe: 'Joyful • Wholesome • Premium',
    description: 'A tribute to authentic French-American baking. Features lowercase headers, warm cream tones, navy blue typography, and playful "joyful" interactions.',
    heroImage: 'https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?auto=format&fit=crop&q=80&w=2070',
    previewColors: ['#FCF7F0', '#004B8D', '#E31837'],
    styles: {
      bg: '#FCF7F0',
      accent: '#004B8D',
      secondary: '#E31837',
      tertiary: '#00A9E0',
      text: '#2D2926',
      cardBg: '#FFFFFF',
      font: "'Fredoka', sans-serif",
      bodyFont: "'Quicksand', sans-serif",
      radius: '28px',
      button: 'pill',
      shadow: '0 12px 40px rgba(0,75,141,0.1)',
      animation: 'pop-in',
      isLowercase: true,
      hasDoodles: true,
      hasStars: true
    },
    sections: ['hero', 'categories', 'featured', 'story', 'trust', 'footer'],
    mockProducts: [
      { name: 'Brioche Feuilletée', basePrice: 450, category: 'French', img: 'https://images.unsplash.com/photo-1609156476313-1a2214157070?auto=format&fit=crop&q=80&w=600', isNew: true, rating: 5 },
      { name: 'Chocolate Lover Crêpes', basePrice: 299, category: 'Treats', img: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?auto=format&fit=crop&q=80&w=600', onSale: true, rating: 5 }
    ]
  },
  {
    id: 'sweet-whimsy',
    name: 'Sweet Whimsy',
    category: 'Playful',
    badge: 'PLAYFUL',
    vibe: 'Bouncy • Pastel • Fun',
    description: 'A deeply playful design with overlapping pastel blocks, bouncy animations, and rounded typography.',
    heroImage: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&q=80&w=2070',
    previewColors: ['#FFFAF0', '#FF9A8B', '#FF6A88'],
    styles: {
      bg: '#FFFAF0',
      accent: '#FF9A8B',
      secondary: '#FF6A88',
      text: '#4A4A4A',
      cardBg: '#FFFFFF',
      font: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      radius: '36px',
      button: 'rounded',
      shadow: '0 15px 35px rgba(255,154,139,0.2)',
      animation: 'spring',
      isLowercase: false,
      hasDoodles: false,
      hasStars: true
    },
    sections: ['hero', 'bestsellers', 'about', 'gallery', 'footer'],
    mockProducts: [
      { name: 'Strawberry Cloud Cake', basePrice: 1200, category: 'Cakes', img: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&q=80&w=600', rating: 5 },
      { name: 'Unicorn Macarons', basePrice: 600, category: 'Macarons', img: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?auto=format&fit=crop&q=80&w=600', rating: 4 }
    ]
  },
  {
    id: 'modern-editorial',
    name: 'Modern Editorial',
    category: 'Modern',
    badge: 'VOGUE',
    vibe: 'Editorial • Sleek • Clean',
    description: 'A clean, high-contrast template with cinematic typography, acting like a fashion magazine for your bakery.',
    heroImage: 'https://images.unsplash.com/photo-1509365465994-3e8e6348f69c?auto=format&fit=crop&q=80&w=2070',
    previewColors: ['#FFFFFF', '#000000', '#F5F5F5'],
    styles: {
      bg: '#FFFFFF',
      accent: '#000000',
      secondary: '#F5F5F5',
      text: '#111111',
      cardBg: '#FFFFFF',
      font: "'Playfair Display', serif",
      bodyFont: "'Inter', sans-serif",
      radius: '0px',
      button: 'square',
      shadow: 'none',
      animation: 'fade-up',
      isLowercase: false,
      hasDoodles: false,
      hasStars: false
    },
    sections: ['hero', 'featured', 'collection', 'footer'],
    mockProducts: [
      { name: 'Noir Chocolate Tart', basePrice: 850, category: 'Tarts', img: 'https://images.unsplash.com/photo-1515037893149-de7f840978e2?auto=format&fit=crop&q=80&w=600' },
      { name: 'Minimalist Croissant', basePrice: 350, category: 'Pastries', img: 'https://images.unsplash.com/photo-1555507036-ab1f40ce88f4?auto=format&fit=crop&q=80&w=600' }
    ]
  }
];

