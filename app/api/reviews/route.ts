import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clearProductsCache } from '@/lib/products';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId parameter is required' }, { status: 400 });
    }

    const reviews = await prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, authorName, rating, title, comment } = body;

    if (!productId || !authorName || !rating || !title || !comment) {
      return NextResponse.json(
        { error: 'All review fields (productId, authorName, rating, title, comment) are required' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Create review in database
    const newReview = await prisma.review.create({
      data: {
        productId,
        authorName,
        rating: Number(rating),
        title,
        comment,
        isVerified: true,
      },
    });

    // Re-calculate new average rating and review count
    const allProductReviews = await prisma.review.findMany({
      where: { productId },
      select: { rating: true },
    });

    const totalReviewsCount = allProductReviews.length;
    const avgRating =
      allProductReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount;

    // Update Product record in DB
    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: Number(avgRating.toFixed(2)),
        reviewsCount: totalReviewsCount,
      },
    });

    clearProductsCache();

    return NextResponse.json({
      success: true,
      review: newReview,
      newRating: Number(avgRating.toFixed(2)),
      newReviewsCount: totalReviewsCount,
    });
  } catch (error) {
    console.error('Error submitting customer review:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
