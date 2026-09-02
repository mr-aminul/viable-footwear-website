export type CategoryId =
  | 'crocs'
  | 'foam-runners'
  | 'slides'
  | 'sneakers'
  | 'flip-flops'
  | 'lifestyle'

export interface Product {
  id: string
  name: string
  slug: string
  category: CategoryId
  categoryLabel: string
  price: number
  compareAt?: number
  rating: number
  reviews: number
  image: string
  colors: string[]
  sizes: number[]
  badge?: 'New' | 'Sale' | 'Bestseller'
  description: string
  featured?: boolean
}

export interface Category {
  id: CategoryId
  name: string
  image: string
  count: number
}

export const BRAND = {
  name: 'Viable',
  tagline: 'Everyday feet. Elevated.',
  phone: '01805-215181',
  whatsapp: '+8801805215181',
  email: 'viable.bd@gmail.com',
  instagram: 'https://www.instagram.com/viable.bd',
  facebook: 'https://www.facebook.com/viabledhaka',
  followers: '22K',
  recommend: '96%',
  city: 'Dhaka, Bangladesh',
} as const

export const categories: Category[] = [
  {
    id: 'crocs',
    name: 'Crocs',
    image: '/images/categories/cat-tile-crocs.png',
    count: 18,
  },
  {
    id: 'foam-runners',
    name: 'Foam Runners',
    image: '/images/categories/cat-tile-foam-runners.png',
    count: 12,
  },
  {
    id: 'slides',
    name: 'Slides',
    image: '/images/categories/cat-tile-slides.png',
    count: 14,
  },
  {
    id: 'sneakers',
    name: 'Sneakers',
    image: '/images/categories/cat-tile-sneakers.png',
    count: 22,
  },
  {
    id: 'flip-flops',
    name: 'Flip-flops',
    image: '/images/categories/cat-tile-flip-flops.png',
    count: 14,
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    image: '/images/categories/cat-tile-lifestyle.png',
    count: 10,
  },
]

export const products: Product[] = [
  {
    id: '1',
    name: 'Ridge Foam Croc',
    slug: 'ridge-foam-croc',
    category: 'crocs',
    categoryLabel: "Unisex Crocs",
    price: 2890,
    rating: 4.9,
    reviews: 128,
    image: '/images/products/product-foam-cream.png',
    colors: ['#E8E0D5', '#1A3668', '#2F3A2E'],
    sizes: [36, 37, 38, 39, 40, 41, 42, 43, 44],
    badge: 'Bestseller',
    featured: true,
    description:
      'Sculptural foam Croc with organic ridge texture. Feather-light for all-day Dhaka walks, rain or shine.',
  },
  {
    id: '2',
    name: 'Vista Chunky Sneaker',
    slug: 'vista-chunky-sneaker',
    category: 'sneakers',
    categoryLabel: "Men's Sneakers",
    price: 4490,
    rating: 4.8,
    reviews: 86,
    image: '/images/products/product-sneaker-olive.png',
    colors: ['#6B7A4E', '#1A1A1A', '#C4B59A'],
    sizes: [39, 40, 41, 42, 43, 44, 45],
    badge: 'New',
    featured: true,
    description:
      'Street-ready chunky silhouette in earthy olive. Thick sole, soft upper — built for city streets.',
  },
  {
    id: '3',
    name: 'Noir Cloud Slide',
    slug: 'noir-cloud-slide',
    category: 'slides',
    categoryLabel: 'Unisex Slides',
    price: 1990,
    rating: 4.7,
    reviews: 204,
    image: '/images/products/product-slide-charcoal.png',
    colors: ['#2B2B2B', '#E8E0D5', '#1A3668'],
    sizes: [36, 37, 38, 39, 40, 41, 42, 43, 44],
    badge: 'Bestseller',
    featured: true,
    description:
      'Cloud-soft foam slides in charcoal. Slip on, step out — your everyday essential.',
  },
  {
    id: '4',
    name: 'Skyform Croc',
    slug: 'skyform-croc',
    category: 'crocs',
    categoryLabel: "Women's Crocs",
    price: 2690,
    compareAt: 3190,
    rating: 4.6,
    reviews: 61,
    image: '/images/products/product-croc-blue.png',
    colors: ['#A8C5D4', '#F5E6D3', '#E8E0D5'],
    sizes: [36, 37, 38, 39, 40, 41, 42],
    badge: 'Sale',
    featured: true,
    description:
      'Pastel sky foam Croc with breathable sculptural vents. Soft, playful, unmistakably Viable.',
  },
  {
    id: '5',
    name: 'Pulse Mustard Kick',
    slug: 'pulse-mustard-kick',
    category: 'sneakers',
    categoryLabel: "Unisex Sneakers",
    price: 3990,
    rating: 4.8,
    reviews: 47,
    image: '/images/products/product-sneaker-mustard.png',
    colors: ['#C9A227', '#FFFFFF', '#1A3668'],
    sizes: [38, 39, 40, 41, 42, 43, 44],
    badge: 'New',
    featured: true,
    description:
      'Bold mustard dad sneaker with a chunky white sole. Made to be seen on campus and café streets.',
  },
  {
    id: '6',
    name: 'Moss Foam Runner',
    slug: 'moss-foam-runner',
    category: 'foam-runners',
    categoryLabel: 'Unisex Foam Runners',
    price: 3290,
    rating: 4.9,
    reviews: 152,
    image: '/images/products/product-foam-sage.png',
    colors: ['#8A9A7B', '#E8E0D5', '#2B2B2B'],
    sizes: [38, 39, 40, 41, 42, 43, 44, 45],
    badge: 'Bestseller',
    featured: true,
    description:
      'Sage green foam runner with organic aperture pattern. Ultra-light, ultra-now.',
  },
  {
    id: '7',
    name: 'Harbor Canvas Low',
    slug: 'harbor-canvas-low',
    category: 'lifestyle',
    categoryLabel: "Men's Lifestyle",
    price: 2790,
    rating: 4.4,
    reviews: 38,
    image: '/images/products/product-canvas-navy.png',
    colors: ['#1A3668', '#FFFFFF', '#C4B59A'],
    sizes: [39, 40, 41, 42, 43, 44, 45],
    featured: true,
    description:
      'Classic navy canvas low-top with rubber toe cap. Clean lines for everyday Viable energy.',
  },
  {
    id: '8',
    name: 'Midnight Runner',
    slug: 'midnight-runner',
    category: 'sneakers',
    categoryLabel: "Men's Sneakers",
    price: 4290,
    compareAt: 4990,
    rating: 4.7,
    reviews: 74,
    image: '/images/products/product-sneaker-navy.png',
    colors: ['#1A3668', '#0C0C0C', '#E8E0D5'],
    sizes: [39, 40, 41, 42, 43, 44, 45],
    badge: 'Sale',
    description:
      'Deep navy performance-casual runner. Soft knit upper, cushioned midsole for long Dhaka days.',
  },
  {
    id: '9',
    name: 'Drift Cream Flip',
    slug: 'drift-cream-flip',
    category: 'flip-flops',
    categoryLabel: 'Unisex Flip-flops',
    price: 1790,
    rating: 4.6,
    reviews: 88,
    image: '/images/products/product-flipflop-cream.png',
    colors: ['#E8E0D5', '#1A1A1A', '#1A3668'],
    sizes: [36, 37, 38, 39, 40, 41, 42, 43, 44],
    badge: 'New',
    featured: true,
    description:
      'Cloud-soft cream foam flip-flops with nubby footbed grip. Lightweight everyday essential for Dhaka heat.',
  },
]

export function formatPrice(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}

export function getProductsByCategory(category?: string): Product[] {
  if (!category || category === 'all') return products
  return products.filter((p) => p.category === category)
}
