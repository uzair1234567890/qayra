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
      reviewsCount: 38,
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
      reviewsCount: 29,
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
      reviewsCount: 42,
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
      reviewsCount: 19,
    },
    {
      name: 'Imperial Citrus & Bergamot',
      slug: 'imperial-citrus-bergamot',
      subtitle: 'Calabrian Bergamot & Sun-Drenched Vetiver',
      description: 'An invigorating citrus burst anchored by sophisticated vetiver and white amber. Perfect for refreshing daytime commutes with crisp luxury clarity.',
      scentFamily: 'Fresh & Citrus',
      topNotes: 'Calabrian Bergamot, Blood Orange, Grapefruit',
      heartNotes: 'Neroli, Green Tea, Juniper',
      baseNotes: 'Haitian Vetiver, White Amber, Cedarwood',
      intensity: 3,
      longevity: '45 Days',
      price: 1199,
      originalPrice: 1499,
      images: JSON.stringify(['/images/products/oud_nocturne.jpg']),
      stock: 50,
      isActive: true,
      isFeatured: false,
      rating: 4.80,
      reviewsCount: 15,
    },
    {
      name: 'Smoked Vanilla & Bourbon',
      slug: 'smoked-vanilla-bourbon',
      subtitle: 'Madagascar Vanilla & Oak Cask Bourbon',
      description: 'Intoxicatingly rich Madagascar vanilla pod smoked over aged oak casks with toasted praline. A decadent gourmand fragrance for luxury interiors.',
      scentFamily: 'Amber & Spice',
      topNotes: 'Toasted Almond, Cinnamon Bark',
      heartNotes: 'Bourbon Accord, Orchid Blossom',
      baseNotes: 'Madagascar Vanilla Pod, Smoked Oak, Benzoin',
      intensity: 4,
      longevity: '60 Days',
      price: 1399,
      originalPrice: 1799,
      images: JSON.stringify(['/images/products/amber_cedar.jpg']),
      stock: 18,
      isActive: true,
      isFeatured: true,
      rating: 4.90,
      reviewsCount: 31,
    },
  ];

  for (const prod of sampleProducts) {
    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: prod,
      create: prod,
    });
  }

  console.log('Seeded 6 Qayra luxury car perfumes successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
