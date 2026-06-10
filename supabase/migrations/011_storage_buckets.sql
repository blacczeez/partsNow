-- Storage buckets for runner QC and rider delivery photos (client uploads via anon + auth).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'qc-photos',
    'qc-photos',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
  ),
  (
    'delivery-photos',
    'delivery-photos',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
  )
ON CONFLICT (id) DO NOTHING;

-- Public read (buckets are public)
CREATE POLICY "Public read qc photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'qc-photos');

CREATE POLICY "Public read delivery photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'delivery-photos');

-- Runners/riders/admins upload while logged in
CREATE POLICY "Authenticated upload qc photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'qc-photos');

CREATE POLICY "Authenticated upload delivery photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'delivery-photos');

-- Allow users to update/replace their own uploads (same path prefix = user id optional; keep simple)
CREATE POLICY "Authenticated update qc photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'qc-photos')
  WITH CHECK (bucket_id = 'qc-photos');

CREATE POLICY "Authenticated update delivery photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'delivery-photos')
  WITH CHECK (bucket_id = 'delivery-photos');
