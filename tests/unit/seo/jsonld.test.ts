import { describe, it, expect } from 'vitest';
import {
  buildProductLd,
  buildBundleLd,
  buildOrgLd,
  buildBreadcrumbLd,
} from '../../../src/lib/seo/jsonld';

const SITE = 'https://qayra.in';

describe('buildProductLd', () => {
  it('emits required Product schema keys', () => {
    const scent = {
      slug: 'azeziya',
      name: 'Azeziya',
      description: 'A deep musk',
      image_urls: ['https://cdn/azeziya-1.jpg'],
      stock_qty: 12,
      product: { base_price: 89900 },
    };
    const ld = buildProductLd(scent as any, SITE);
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('Product');
    expect(ld.name).toBe('Azeziya');
    expect(ld.image).toEqual(['https://cdn/azeziya-1.jpg']);
    expect(ld.description).toBe('A deep musk');
    expect(ld.brand).toEqual({ '@type': 'Brand', name: 'qayra' });
    expect(ld.offers['@type']).toBe('Offer');
    expect(ld.offers.priceCurrency).toBe('INR');
    expect(ld.offers.price).toBe('899.00');
    expect(ld.offers.availability).toBe('https://schema.org/InStock');
    expect(ld.offers.url).toBe(`${SITE}/scent/azeziya`);
  });

  it('uses OutOfStock when stock_qty === 0', () => {
    const scent = {
      slug: 'sold-out',
      name: 'Sold Out',
      description: 'gone',
      image_urls: [],
      stock_qty: 0,
      product: { base_price: 50000 },
    };
    const ld = buildProductLd(scent as any, SITE);
    expect(ld.offers.availability).toBe('https://schema.org/OutOfStock');
  });
});

describe('buildBundleLd', () => {
  it('emits Product schema for a bundle', () => {
    const bundle = {
      slug: 'starter-set',
      name: 'The Starter Set',
      description: 'four scents',
      image_url: 'https://cdn/starter.jpg',
      price: 99900,
    };
    const ld = buildBundleLd(bundle as any, SITE);
    expect(ld['@type']).toBe('Product');
    expect(ld.offers.price).toBe('999.00');
    expect(ld.offers.url).toBe(`${SITE}/bundles/starter-set`);
  });
});

describe('buildOrgLd', () => {
  it('emits Organization schema for the brand', () => {
    const ld = buildOrgLd(SITE);
    expect(ld['@type']).toBe('Organization');
    expect(ld.name).toBe('qayra');
    expect(ld.url).toBe(SITE);
  });
});

describe('buildBreadcrumbLd', () => {
  it('emits BreadcrumbList with sequential positions', () => {
    const ld = buildBreadcrumbLd([
      { name: 'Home', url: 'https://qayra.in/' },
      { name: 'Scents', url: 'https://qayra.in/scents' },
      { name: 'Azeziya', url: 'https://qayra.in/scent/azeziya' },
    ]);
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement).toHaveLength(3);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[2].name).toBe('Azeziya');
  });
});
