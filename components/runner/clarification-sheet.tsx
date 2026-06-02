'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';

interface ClarificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void>;
}

export function ClarificationSheet({
  isOpen,
  onClose,
  onSubmit,
}: ClarificationSheetProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError('Message is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(message.trim());
      setMessage('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setMessage('');
      setError(null);
      onClose();
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Request Clarification">
      <p className="mb-4 text-sm text-slate-500">
        Ask the customer a question about their order
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What do you need to know?"
            maxLength={1000}
            rows={4}
            className="w-full rounded-button border border-slate-300 px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
        </div>

        <Button type="submit" fullWidth isLoading={isSubmitting}>
          <Send className="mr-2 h-4 w-4" />
          Send Question
        </Button>
      </form>
    </BottomSheet>
  );
}
