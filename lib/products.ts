import { prisma } from '@/lib/db';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL
const memoryCache = new Map<string, CacheEntry<any>>();

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
