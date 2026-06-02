'use client';

import { useState, useEffect, useCallback } from 'react';
import type { VoiceNote } from '@/lib/services/whatsapp/voice-note';

interface UseAdminVoiceNotesOptions {
  status?: string;
  page?: number;
  limit?: number;
}

export function useAdminVoiceNotes(options: UseAdminVoiceNotesOptions = {}) {
  const { status, page = 1, limit = 20 } = options;
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVoiceNotes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const response = await fetch(`/api/admin/voice-notes?${params}`);
      if (!response.ok) throw new Error('Failed to fetch voice notes');

      const data = await response.json();
      setVoiceNotes(data.voiceNotes);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [status, page, limit]);

  useEffect(() => {
    fetchVoiceNotes();
  }, [fetchVoiceNotes]);

  const processVoiceNote = useCallback(
    async (voiceNoteId: string, transcription: string) => {
      const response = await fetch(`/api/admin/voice-notes/${voiceNoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcription }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process voice note');
      }

      // Refresh list
      await fetchVoiceNotes();
      return response.json();
    },
    [fetchVoiceNotes]
  );

  return {
    voiceNotes,
    total,
    loading,
    error,
    refetch: fetchVoiceNotes,
    processVoiceNote,
  };
}
