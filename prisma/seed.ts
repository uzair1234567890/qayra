import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Qayra luxury car perfume database...');

  // Create default admin user
  const adminEmail = 'admin@qayra.com';
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.admin.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Qayra Admin',
        role: 'ADMIN',
      },
    });
    console.log('Created default admin user: admin@qayra.com / admin123');
  }

  // Create umairuzair admin and customer user
  const umairPasswordHash = await bcrypt.hash('uzairumair99aa@', 10);
  const umairEmails = ['umairuzair', 'umairuzair@qayra.com'];

  for (const email of umairEmails) {
    await prisma.admin.upsert({
      where: { email },
      update: { passwordHash: umairPasswordHash, name: 'Umair Uzair', role: 'ADMIN' },
      create: { email, passwordHash: umairPasswordHash, name: 'Umair Uzair', role: 'ADMIN' },
    });

    await prisma.user.upsert({
      where: { email },
      update: { passwordHash: umairPasswordHash, name: 'Umair Uzair' },
      create: { email, passwordHash: umairPasswordHash, name: 'Umair Uzair' },
    });
  }
  console.log('Created/Updated user: umairuzair / uzairumair99aa@');

  // Seed 4 signature products matching exact uploaded bottle photos
  const sampleProducts = [
    {
      name: 'Qayra - Shadow Elixir',
      slug: 'shadow-elixir',
      subtitle: 'Smoked Cambodian Oud & Royal Amber',
      description: 'An evocative nocturnal composition designed for midnight drives. Rich Cambodian agarwood intertwines with glowing Baltic amber, enveloped in subtle cardamom warmth and dark leather accords.',
      scentFamily: 'Oud & Wood',
      topNotes: 'Golden Saffron, Cinnamon Leaf',
      heartNotes: 'Smoked Oud, Bulgarian Rose, Saffron',
      baseNotes: 'Royal Amber, Vetiver, Dark Leather',
      intensity: 5,
      longevity: '30 Days',
      price: 1499,
      originalPrice: 1799,
      images: JSON.stringify(['/images/products/shadow_elixir.jpg']),
      stock: 45,
      isActive: true,
      isFeatured: true,
      rating: 4.95,
      reviewsCount: 3,
    },
    {
      name: 'Qayra - Velvet Midnight',
      slug: 'velvet-midnight',
      subtitle: 'Golden Baltic Amber & Atlas Cedarwood',
      description: 'A deeply comforting and refined scent profile that fills your vehicle cabin with golden warmth. Blends aged Atlas cedarwood with molten amber, resinous benzoin, and a whisper of clove.',
      scentFamily: 'Amber & Spice',
      topNotes: 'Toasted Almond, Cinnamon Bark',
      heartNotes: 'Resinous Amber, Patchouli, Cashmere Wood',
      baseNotes: 'Atlas Cedarwood, Benzoin, Vanilla Bean',
      intensity: 4,
      longevity: '30 Days',
      price: 1499,
      originalPrice: 1799,
      images: JSON.stringify(['/images/products/velvet_midnight.jpg']),
      stock: 28,
      isActive: true,
      isFeatured: true,
      rating: 4.88,
      reviewsCount: 2,
    },
    {
      name: 'Qayra - Obsidian Mist',
      slug: 'obsidian-mist',
      subtitle: 'Tuscan Leather & Sun-Cured Tobacco Leaf',
      description: 'Sophisticated and commanding, reminiscent of hand-stitched leather upholstery and aged oak accents. Warm tobacco blossom merges with rich leather and earthy oakmoss.',
      scentFamily: 'Leather & Smoke',
      topNotes: 'Clary Sage, Black Pepper, Cypress',
      heartNotes: 'Tuscan Leather, Tobacco Blossom, Iris',
      baseNotes: 'Oakmoss, Smoked Guaiacwood, Tonka Bean',
      intensity: 5,
      longevity: '30 Days',
      price: 1499,
      originalPrice: 2199,
      images: JSON.stringify(['/images/products/obsidian_mist.jpg']),
      stock: 12,
      isActive: true,
      isFeatured: true,
      rating: 4.92,
      reviewsCount: 2,
    },
    {
      name: 'Qayra - Sacred Nile',
      slug: 'sacred-nile',
      subtitle: 'Calabrian Bergamot & Sunlit Citrus Zest',
      description: 'An invigorating, crisp, and sun-drenched olfactory creation. Handcrafted with cold-pressed Italian bergamot, neroli, and sparkling citrus zest that rejuvenates your driving mood.',
      scentFamily: 'Fresh & Citrus',
      topNotes: 'Calabrian Bergamot, Blood Orange, Grapefruit',
      heartNotes: 'Neroli Blossom, White Tea, Jasmine',
      baseNotes: 'Clean Musk, Vetiver Roots, Amberwood',
      intensity: 4,
      longevity: '30 Days',
      price: 1499,
      originalPrice: 1899,
      images: JSON.stringify(['/images/products/sacred_nile.jpg']),
      stock: 40,
      isActive: true,
      isFeatured: true,
      rating: 4.90,
      reviewsCount: 4,
    },
  ];

  for (const prod of sampleProducts) {
    const createdProduct = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: prod,
      create: prod,
    });

    // Seed sample verified buyer reviews if none exist
    const existingReviewsCount = await prisma.review.count({
      where: { productId: createdProduct.id },
    });

    if (existingReviewsCount === 0) {
      await prisma.review.createMany({
        data: [
          {
            productId: createdProduct.id,
            authorName: 'Vikramaditya S.',
            rating: 5,
            title: 'Exquisite vehicle scent — pure luxury',
            comment: 'Transformed my sedan interior completely. The wood cap diffusion is subtle and never overwhelming. Lasts over 30 days without losing its amber depth.',
            isVerified: true,
          },
          {
            productId: createdProduct.id,
            authorName: 'Ananya R.',
            rating: 5,
            title: 'Unmatched longevity and aesthetic',
            comment: 'The hanging vial design looks stunning on the rear view mirror. Everyone who enters the car asks what fragrance I am using.',
            isVerified: true,
          },
          {
            productId: createdProduct.id,
            authorName: 'Rohan K.',
            rating: 4,
            title: 'Refined oud notes without synthetic feel',
            comment: 'Very premium packaging and authentic wood fragrance notes. Highly recommended for long highway drives.',
            isVerified: true,
          },
        ],
      });
    }
  }

  console.log('Seeded 4 signature bottle products successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
