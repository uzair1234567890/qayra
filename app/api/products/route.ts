import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getAuthenticatedAdmin } from '@/lib/auth';
import { clearProductsCache } from '@/lib/products';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const family = searchParams.get('family');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort');
    const adminMode = searchParams.get('admin') === 'true';

    const where: any = {};

    if (!adminMode) {
      where.isActive = true;
    }

    if (family && family !== 'All') {
      where.scentFamily = family;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { scentFamily: { contains: search } },
        { topNotes: { contains: search } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };

    if (sort === 'price-asc') orderBy = { price: 'asc' };
    if (sort === 'price-desc') orderBy = { price: 'desc' };
    if (sort === 'rating') orderBy = { rating: 'desc' };

    const products = await prisma.product.findMany({
      where,
      orderBy,
    });

    // Parse JSON images string safely
    const formattedProducts = products.map((prod) => {
      let parsedImages = [];
      try {
        parsedImages = JSON.parse(prod.images);
      } catch (e) {
        parsedImages = [prod.images];
      }
      return {
        ...prod,
        images: parsedImages,
      };
    });

    return NextResponse.json({ products: formattedProducts });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      subtitle,
      description,
      scentFamily,
      topNotes,
      heartNotes,
      baseNotes,
      intensity,
      longevity,
      price,
      originalPrice,
      images,
      stock,
      isActive,
      isFeatured,
    } = body;

    if (!name || !description || !scentFamily || !price) {
      return NextResponse.json(
        { error: 'Missing required product fields (name, description, scentFamily, price)' },
        { status: 400 }
      );
    }

    // Generate unique slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const imagesJson = Array.isArray(images) ? JSON.stringify(images) : JSON.stringify([images]);

    const newProduct = await prisma.product.create({
      data: {
        name,
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        subtitle: subtitle || null,
        description,
        scentFamily,
        topNotes: topNotes || 'Warm Cardamom, Pink Pepper',
        heartNotes: heartNotes || 'Smoked Oud, Amber',
        baseNotes: baseNotes || 'Cedarwood, Dark Leather',
        intensity: Number(intensity || 4),
        longevity: longevity || '30 Days',
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : null,
        images: imagesJson,
        stock: Number(stock || 50),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : false,
      },
    });

    clearProductsCache();
    revalidatePath('/');
    revalidatePath('/products');
    revalidatePath(`/products/${newProduct.slug}`);

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
