-- ============================================
-- WHATSAPP CONVERSATIONS
-- ============================================
-- Tracks per-phone conversation state for the WhatsApp bot.
-- State determines which handler processes incoming messages.

CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  state TEXT NOT NULL DEFAULT 'idle',
  context JSONB DEFAULT '{}',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wa_conv_phone ON whatsapp_conversations(phone);
CREATE INDEX idx_wa_conv_user ON whatsapp_conversations(user_id);

-- ============================================
-- VOICE NOTE QUEUE
-- ============================================
-- Stores voice notes sent by mechanics for manual transcription.
-- AI auto-transcription is feature-flagged for future.

CREATE TABLE voice_note_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  media_url TEXT NOT NULL,
  media_id TEXT,
  transcription TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  order_id UUID REFERENCES orders(id),
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vnq_status ON voice_note_queue(status);
CREATE INDEX idx_vnq_phone ON voice_note_queue(phone);
CREATE INDEX idx_vnq_created ON voice_note_queue(created_at);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_note_queue ENABLE ROW LEVEL SECURITY;

-- WhatsApp conversations: only admins can view via dashboard.
-- All programmatic access goes through the service role client which bypasses RLS.
CREATE POLICY "Admins can view all conversations" ON whatsapp_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

-- Voice note queue: admins can view and update
CREATE POLICY "Admins can view voice notes" ON voice_note_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update voice notes" ON voice_note_queue
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.user_type = 'admin'
    )
  );
