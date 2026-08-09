'use client';

import React, { useState } from 'react';
import { Star, ShieldCheck, PenTool, CheckCircle2, MessageSquare } from 'lucide-react';

export interface ReviewItem {
  id: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  isVerified: boolean;
  createdAt: string | Date;
}

interface ProductReviewsProps {
  productId: string;
  initialReviews: ReviewItem[];
  initialRating: number;
  initialCount: number;
}

export default function ProductReviews({
  productId,
  initialReviews,
  initialRating,
  initialCount,
}: ProductReviewsProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [ratingStats, setRatingStats] = useState({
    avgRating: initialRating,
    count: Math.max(initialCount, initialReviews.length),
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!authorName || !title || !comment) {
      setErrorMessage('Please complete all review fields.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          authorName,
          rating,
          title,
          comment,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setReviews([data.review, ...reviews]);
      setRatingStats({
        avgRating: data.newRating,
        count: data.newReviewsCount,
      });

      setSuccessMessage('Thank you! Your verified car fragrance review has been published.');
      setAuthorName('');
      setTitle('');
      setComment('');
      setRating(5);
      setIsFormOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while submitting your review.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate rating counts for distribution bars
  const fiveStarsCount = reviews.filter((r) => r.rating === 5).length;
  const fourStarsCount = reviews.filter((r) => r.rating === 4).length;
  const threeStarsCount = reviews.filter((r) => r.rating === 3).length;
  const total = Math.max(1, reviews.length);

  return (
    <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 sm:p-10 space-y-10">
      {/* Header & Rating Breakdown */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#29241F] pb-8 gap-8">
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-semibold">
            Verified Experiences
          </span>
          <h3 className="font-serif text-3xl font-bold text-[#FDFBF7]">
            Customer Fragrance Reviews
          </h3>
          <div className="flex items-center space-x-3 pt-1">
            <div className="flex items-center text-[#D4AF37]">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(ratingStats.avgRating)
                      ? 'fill-[#D4AF37] text-[#D4AF37]'
                      : 'text-[#29241F]'
                  }`}
                />
              ))}
            </div>
            <span className="font-serif text-2xl font-bold text-[#FDFBF7]">
              {ratingStats.avgRating.toFixed(1)}
            </span>
            <span className="text-xs text-[#787063]">
              Based on {ratingStats.count} Discerning Drivers
            </span>
          </div>
        </div>

        {/* Rating Breakdown Bars */}
        <div className="w-full md:w-64 space-y-1.5 text-xs text-[#A0988E]">
          <div className="flex items-center space-x-2">
            <span className="w-8">5 ★</span>
            <div className="flex-1 bg-[#29241F] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#D4AF37] h-full"
                style={{ width: `${(fiveStarsCount / total) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right font-mono">{fiveStarsCount}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-8">4 ★</span>
            <div className="flex-1 bg-[#29241F] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#C5A059] h-full"
                style={{ width: `${(fourStarsCount / total) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right font-mono">{fourStarsCount}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-8">3 ★</span>
            <div className="flex-1 bg-[#29241F] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#A38220] h-full"
                style={{ width: `${(threeStarsCount / total) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right font-mono">{threeStarsCount}</span>
          </div>
        </div>

        {/* Write A Review Trigger Button */}
        <div>
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="px-6 py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-[0.2em] rounded flex items-center space-x-2 hover:brightness-110 transition-all shadow-xl"
          >
            <PenTool className="w-4 h-4" />
            <span>Write A Review</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-[#2A9D8F]/10 border border-[#2A9D8F]/30 text-[#2A9D8F] text-xs rounded font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Write Review Form Collapsible Box */}
      {isFormOpen && (
        <form onSubmit={handleSubmitReview} className="bg-[#1A1815] border border-[#C5A059]/40 rounded-xl p-6 sm:p-8 space-y-6">
          <h4 className="font-serif text-xl font-bold text-[#FDFBF7] uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
            <span>Share Your Fragrance Experience</span>
          </h4>

          {errorMessage && (
            <div className="p-3 bg-[#E63946]/10 border border-[#E63946]/30 text-[#E63946] text-xs rounded">
              {errorMessage}
            </div>
          )}

          <div className="space-y-4 text-xs">
            {/* Rating Star Picker */}
            <div className="space-y-1">
              <label className="text-[#A0988E] font-medium uppercase tracking-wider">Overall Rating *</label>
              <div className="flex items-center space-x-1 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-[#D4AF37] hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= (hoverRating || rating)
                          ? 'fill-[#D4AF37] text-[#D4AF37]'
                          : 'text-[#29241F]'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs text-[#D4AF37] font-bold uppercase ml-2">
                  {rating === 5 ? '5/5 Excellent' : `${rating}/5 Stars`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[#A0988E] font-medium uppercase tracking-wider">Your Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram S."
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full bg-[#141210] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3.5 py-3 rounded focus:outline-none placeholder-[#787063]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#A0988E] font-medium uppercase tracking-wider">Review Headline *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sublime Cambodian Oud aroma..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#141210] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3.5 py-3 rounded focus:outline-none placeholder-[#787063]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#A0988E] font-medium uppercase tracking-wider">Review Details *</label>
              <textarea
                required
                rows={4}
                placeholder="Describe the scent diffusion in your vehicle cabin, longevity, and overall atmosphere..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-[#141210] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3.5 py-3 rounded focus:outline-none placeholder-[#787063]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-5 py-2.5 bg-[#141210] text-[#A0988E] hover:text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-widest rounded shadow-md disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Publish Review'}
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.length === 0 ? (
          <p className="text-xs text-[#787063] py-8 text-center">Be the first to review this Qayra car perfume.</p>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-6 bg-[#1A1815]/60 border border-[#29241F] rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-[#29241F] border border-[#C5A059]/40 flex items-center justify-center font-serif text-sm font-bold text-[#D4AF37]">
                    {rev.authorName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-serif font-bold text-sm text-[#FDFBF7]">
                        {rev.authorName}
                      </span>
                      {rev.isVerified && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#2A9D8F] bg-[#2A9D8F]/10 border border-[#2A9D8F]/30 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                          <ShieldCheck className="w-3 h-3" />
                          Verified Owner
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-[#D4AF37] space-x-1 mt-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= rev.rating ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-[#29241F]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <span className="text-[11px] text-[#787063]">
                  {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <h4 className="font-serif text-base font-bold text-[#FDFBF7] pt-1">
                {rev.title}
              </h4>

              <p className="text-xs text-[#A0988E] leading-relaxed font-light">
                {rev.comment}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
