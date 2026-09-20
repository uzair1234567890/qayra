import type { MetadataRoute } from 'next';
import { prisma } from '../lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qayra.in';

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });

    if (products && products.length > 0) {
      productRoutes = products.map((product) => ({
        url: `${baseUrl}/products/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.9,
      }));
    } else {
      throw new Error('No DB products returned');
    }
  } catch (e) {
    // Fallback static product routes if DB is not reachable during build
    productRoutes = [
      { url: `${baseUrl}/products/shadow-elixir`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
      { url: `${baseUrl}/products/velvet-midnight`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
      { url: `${baseUrl}/products/smoked-vanilla-bourbon`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
      { url: `${baseUrl}/products/obsidian-mist`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
      { url: `${baseUrl}/products/sacred-nile`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
    ];
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/return-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/llms.txt`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];

  return [...staticRoutes, ...productRoutes];
}
