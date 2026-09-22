import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qayra.in';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api',
          '/api/',
          '/account',
          '/account/',
          '/checkout',
          '/checkout/',
          '/orders',
          '/orders/',
        ],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'Google-Extended',
          'PerplexityBot',
          'ClaudeBot',
          'Applebot-Extended',
        ],
        allow: ['/', '/products', '/llms.txt'],
        disallow: [
          '/admin',
          '/admin/',
          '/api',
          '/api/',
          '/account',
          '/account/',
          '/checkout',
          '/checkout/',
          '/orders',
          '/orders/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
