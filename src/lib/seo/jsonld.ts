// JSON-LD schema.org builders. Output is JSON.stringify-ready for
// <script type="application/ld+json"> tags.
// Prices arrive as integer paise; schema.org wants a decimal string in major
// currency units, hence the /100 + toFixed(2).

interface Scent {
  slug: string;
  name: string;
  description: string | null;
  image_urls: string[] | null;
  stock_qty: number | null;
  // Accept either the joined shape (`product: { base_price }`) or the flat
  // shape used in src/lib/catalog.ts where base_price is hoisted to top-level.
  product?: { base_price: number } | null;
  base_price?: number;
}

interface Bundle {
  slug: string;
  name: string;
  description: string | null;
  image_urls: string[];
  price: number;
  // Caller passes this when constituent-scent stock is known (bundles have no
  // own stock_qty). Omit/null defaults to InStock for backward compatibility.
  in_stock?: boolean | null;
}

interface Crumb {
  name: string;
  url: string;
}

function paiseToInr(paise: number): string {
  return (paise / 100).toFixed(2);
}

function availability(stockQty: number | null): string {
  return (stockQty ?? 0) > 0
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
}

export function buildProductLd(scent: Scent, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: scent.name,
    image: scent.image_urls ?? [],
    description: scent.description ?? '',
    brand: { '@type': 'Brand', name: 'qayra' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: paiseToInr(scent.product?.base_price ?? scent.base_price ?? 0),
      availability: availability(scent.stock_qty),
      url: `${siteUrl}/product/${scent.slug}`,
    },
  };
}

export function buildBundleLd(bundle: Bundle, siteUrl: string) {
  // Default to InStock when caller doesn't supply a signal — matches legacy
  // behavior; opt-in to OutOfStock by passing in_stock: false explicitly.
  const inStockUrl =
    bundle.in_stock === false
      ? 'https://schema.org/OutOfStock'
      : 'https://schema.org/InStock';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: bundle.name,
    image: bundle.image_urls && bundle.image_urls.length ? bundle.image_urls : [],
    description: bundle.description ?? '',
    brand: { '@type': 'Brand', name: 'qayra' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: paiseToInr(bundle.price),
      availability: inStockUrl,
      url: `${siteUrl}/bundles/${bundle.slug}`,
    },
  };
}

export function buildScentListLd(
  scents: Array<{ slug: string; name: string }>,
  siteUrl: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: scents.map((s, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: s.name,
      url: `${siteUrl}/product/${s.slug}`,
    })),
  };
}

export function buildOrgLd(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'qayra',
    url: siteUrl,
    logo: `${siteUrl}/favicon.svg`,
  };
}

export function buildBreadcrumbLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: c.name,
      item: c.url,
    })),
  };
}
