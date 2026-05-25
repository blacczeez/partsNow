'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface RatingFormProps {
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

export function RatingForm({ onSubmit }: RatingFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment);
    } finally {
      setIsSubmitting(false);
    }
  }

  const displayRating = hoverRating || rating;

  return (
    <div className="space-y-4 rounded-card border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-900">Rate your experience</p>

      {/* Stars */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1"
          >
            <Star
              className={cn(
                'h-8 w-8 transition-colors',
                star <= displayRating
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-300'
              )}
            />
          </button>
        ))}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us about your experience (optional)"
        rows={3}
        className="w-full rounded-input border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />

      <Button
        fullWidth
        onClick={handleSubmit}
        disabled={rating === 0}
        isLoading={isSubmitting}
      >
        Submit Rating
      </Button>
    </div>
  );
}
