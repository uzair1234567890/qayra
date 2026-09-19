import { prisma } from '@/lib/db';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL
const memoryCache = new Map<string, CacheEntry<any>>();

export const SIMPLE_PRODUCT_DESCRIPTIONS: Record<string, string> = {
  'shadow-elixir':
    'A rich, royal oud scent made for people who love deep woody fragrances. It blends natural agarwood (oud) with warm amber and a touch of saffron, giving your car a premium, luxurious smell that lasts 30+ days without any harsh chemical odor. Comes in a 10ml glass bottle with a handcrafted beechwood diffuser cap.',
  'velvet-midnight':
    'A warm, sweet amber and cedarwood fragrance that makes your car cabin feel cozy, calm, and welcoming. Blends smooth amber with soft cedarwood and a pinch of warm spices. Perfect for daily driving and evening rides. Comes in a 10ml glass bottle with a handcrafted beechwood diffuser cap.',
  'smoked-vanilla-bourbon':
    'A warm, sweet amber and cedarwood fragrance that makes your car cabin feel cozy, calm, and welcoming. Blends smooth amber with soft cedarwood and a pinch of warm spices. Perfect for daily driving and evening rides. Comes in a 10ml glass bottle with a handcrafted beechwood diffuser cap.',
  'obsidian-mist':
    'A bold, masculine fragrance inspired by luxury car leather upholstery and fine wood. Combines rich leather aroma with earthy oakmoss and a touch of black pepper for a powerful executive vibe. Comes in a 10ml glass bottle with a handcrafted beechwood diffuser cap.',
  'sacred-nile':
    'A crisp, fresh citrus fragrance that instantly lifts your driving mood. Made with zesty Italian bergamot, fresh orange notes, and clean musk to keep your car smelling naturally clean and fresh, even in hot Indian summers. Comes in a 10ml glass bottle with a handcrafted beechwood diffuser cap.',
};

export function getSimpleDescription(slug: string, currentDescription?: string | null): string {
  if (SIMPLE_PRODUCT_DESCRIPTIONS[slug]) {
    return SIMPLE_PRODUCT_DESCRIPTIONS[slug];
  }
  if (currentDescription) {
    if (!currentDescription.toLowerCase().includes('10ml')) {
      return `${currentDescription} Comes in a 10ml glass bottle with a handcrafted beechwood diffuser cap.`;
    }
    return currentDescription;
  }
  return 'Handcrafted 10ml hanging car perfume made with pure, non-alcoholic concentrated oils that gently diffuse for 30+ days through a porous beechwood cap.';
}

export function clearProductsCache() {
  memoryCache.clear();
}

export async function getCachedProducts(where: any = { isActive: true }, orderBy: any = { createdAt: 'desc' }) {
  const cacheKey = `products_${JSON.stringify(where)}_${JSON.stringify(orderBy)}`;
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const products = await prisma.product.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        slug: true,
        subtitle: true,
        scentFamily: true,
        price: true,
        originalPrice: true,
        images: true,
        stock: true,
        rating: true,
        reviewsCount: true,
        topNotes: true,
        createdAt: true,
      },
    });

    const formattedProducts = products.map((prod) => {
      let parsedImages: string[] = [];
      try {
        parsedImages = JSON.parse(prod.images);
      } catch (e) {
        parsedImages = [prod.images];
      }
      return { ...prod, images: parsedImages };
    });

    memoryCache.set(cacheKey, { data: formattedProducts, timestamp: now });
    return formattedProducts;
  } catch (error) {
    console.error('Error fetching cached products:', error);
    if (cached) return cached.data;
    return [];
  }
}

export async function getCachedFeaturedProducts(take: number = 6) {
  const cacheKey = `featured_products_${take}`;
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const featured = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        subtitle: true,
        scentFamily: true,
        price: true,
        originalPrice: true,
        images: true,
        stock: true,
        rating: true,
        reviewsCount: true,
        topNotes: true,
      },
    });

    const formatted = featured.map((prod) => {
      let parsedImages = [];
      try {
        parsedImages = JSON.parse(prod.images);
      } catch (e) {
        parsedImages = [prod.images];
      }
      return { ...prod, images: parsedImages };
    });

    memoryCache.set(cacheKey, { data: formatted, timestamp: now });
    return formatted;
  } catch (error) {
    console.error('Error fetching featured products:', error);
    if (cached) return cached.data;
    return [];
  }
}

export async function getCachedProductBySlug(slug: string) {
  const cacheKey = `product_slug_${slug}`;
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        isActive: true,
      },
      include: {
        reviews: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      memoryCache.set(cacheKey, { data: null, timestamp: now });
      return null;
    }

    let parsedImages: string[] = [];
    try {
      parsedImages = JSON.parse(product.images);
    } catch (e) {
      parsedImages = [product.images];
    }

    const primaryImage = parsedImages[0] || '/images/products/oud_nocturne.jpg';

    // Fetch related products in parallel
    const relatedProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        scentFamily: product.scentFamily,
        id: { not: product.id },
      },
      take: 3,
      select: {
        id: true,
        name: true,
        slug: true,
        scentFamily: true,
        price: true,
        originalPrice: true,
        images: true,
        stock: true,
        rating: true,
        reviewsCount: true,
      },
    });

    const formattedRelated = relatedProducts.map((prod) => {
      let images = [];
      try {
        images = JSON.parse(prod.images);
      } catch (e) {
        images = [prod.images];
      }
      return { ...prod, images };
    });

    const result = {
      product: {
        ...product,
        description: getSimpleDescription(product.slug, product.description),
        images: parsedImages,
      },
      primaryImage,
      relatedProducts: formattedRelated,
    };

    memoryCache.set(cacheKey, { data: result, timestamp: now });
    return result;
  } catch (error) {
    console.error(`Error fetching cached product by slug ${slug}:`, error);
    if (cached) return cached.data;
    return null;
  }
}
