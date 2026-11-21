-- Fix: "new row violates row-level security policy" when uploading circumcision photos.
-- storage.objects has RLS on, so an upload is refused unless an INSERT policy matches
-- the medical-photos bucket. This re-creates the bucket row and its policies idempotently.
-- Policies are limited to signed-in users (authenticated) instead of public, because the
-- bucket holds patient photos and every app screen already requires a Supabase login.

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-photos',
  'medical-photos',
  false,
  5242880,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];

DROP POLICY IF EXISTS "Allow public insert to medical-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public select from medical-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update to medical-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from medical-photos" ON storage.objects;
DROP POLICY IF EXISTS "medical-photos insert by staff" ON storage.objects;
DROP POLICY IF EXISTS "medical-photos select by staff" ON storage.objects;
DROP POLICY IF EXISTS "medical-photos update by staff" ON storage.objects;
DROP POLICY IF EXISTS "medical-photos delete by staff" ON storage.objects;

CREATE POLICY "medical-photos insert by staff"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medical-photos');

-- SELECT is also what createSignedUrl needs.
CREATE POLICY "medical-photos select by staff"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'medical-photos');

CREATE POLICY "medical-photos update by staff"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'medical-photos')
WITH CHECK (bucket_id = 'medical-photos');

CREATE POLICY "medical-photos delete by staff"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'medical-photos');

COMMIT;
