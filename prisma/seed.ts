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

  // Seed sample products
  const sampleProducts = [
    {
      name: 'Oud Nocturne',
      slug: 'oud-nocturne',
      subtitle: 'Smoked Cambodian Oud & Royal Amber',
      description: 'An evocative nocturnal composition designed for midnight drives. Rich Cambodian agarwood intertwines with glowing Baltic amber, enveloped in subtle cardamom warmth and dark leather accords.',
      scentFamily: 'Oud & Wood',
      topNotes: 'Cardamom, Bergamot, Pink Pepper',
      heartNotes: 'Smoked Oud, Bulgarian Rose, Saffron',
      baseNotes: 'Royal Amber, Vetiver, Dark Leather',
      intensity: 5,
      longevity: '60 Days',
      price: 1499,
      originalPrice: 1999,
      images: JSON.stringify(['/images/products/oud_nocturne.jpg']),
      stock: 45,
      isActive: true,
      isFeatured: true,
      rating: 4.95,
      reviewsCount: 3,
    },
    {
      name: 'Amber & Smoked Cedar',
      slug: 'amber-smoked-cedar',
      subtitle: 'Warm Golden Amber & Atlas Cedarwood',
      description: 'A deeply comforting and refined scent profile that fills your vehicle cabin with golden warmth. Blends aged Atlas cedarwood with molten amber, resinous benzoin, and a whisper of clove.',
      scentFamily: 'Amber & Spice',
      topNotes: 'Clove Bud, Sweet Orange, Nutmeg',
      heartNotes: 'Resinous Amber, Patchouli, Cashmere Wood',
      baseNotes: 'Atlas Cedarwood, Benzoin, Vanilla Bean',
      intensity: 4,
      longevity: '45-60 Days',
      price: 1299,
      originalPrice: 1699,
      images: JSON.stringify(['/images/products/amber_cedar.jpg']),
      stock: 28,
      isActive: true,
      isFeatured: true,
      rating: 4.88,
      reviewsCount: 2,
    },
    {
      name: 'Velvet Leather & Tobacco',
      slug: 'velvet-leather-tobacco',
      subtitle: 'Tuscan Leather & Sun-Cured Tobacco Leaf',
      description: 'Sophisticated and commanding, reminiscent of hand-stitched leather upholstery and aged oak accents. Warm tobacco blossom merges with rich leather and earthy oakmoss.',
      scentFamily: 'Leather & Smoke',
      topNotes: 'Clary Sage, Black Pepper, Cypress',
      heartNotes: 'Tuscan Leather, Tobacco Blossom, Iris',
      baseNotes: 'Oakmoss, Smoked Guaiacwood, Tonka Bean',
      intensity: 5,
      longevity: '60 Days',
      price: 1599,
      originalPrice: 2199,
      images: JSON.stringify(['/images/products/leather_tobacco.jpg']),
      stock: 12,
      isActive: true,
      isFeatured: true,
      rating: 4.92,
      reviewsCount: 2,
    },
    {
      name: 'Royal Spiced Sandalwood',
      slug: 'royal-spiced-sandalwood',
      subtitle: 'Mysore Sandalwood & Golden Saffron',
      description: 'A serene and creamy wood formulation infused with rare spices. Soft Mysore sandalwood provides a relaxing sanctuary atmosphere for long journeys.',
      scentFamily: 'Oud & Wood',
      topNotes: 'Golden Saffron, Cinnamon Leaf',
      heartNotes: 'Creamy Sandalwood, Cedar Leaf',
      baseNotes: 'White Musk, Golden Amber',
      intensity: 4,
      longevity: '45 Days',
      price: 1399,
      originalPrice: 1799,
      images: JSON.stringify(['/images/products/sandalswood.jpg']),
      stock: 35,
      isActive: true,
      isFeatured: false,
      rating: 4.85,
      reviewsCount: 2,
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
            comment: 'Transformed my sedan interior completely. The wood cap diffusion is subtle and never overwhelming. Lasts over two months without losing its amber depth.',
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

  console.log('Seeded products and verified customer reviews successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
