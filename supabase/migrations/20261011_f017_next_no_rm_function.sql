-- Migration: F-017 Penomoran Otomatis RM Berkelanjutan
-- Returns the next canonical 9-digit medical record number (format: [jk 2][desa 2][seq 5])
-- seamlessly continuing from the highest global sequence in public.patients.

CREATE OR REPLACE FUNCTION public.get_next_no_rm(p_jenis_kelamin text, p_desa text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix text;
  v_max_seq integer;
  v_next_seq integer;
BEGIN
  -- 1. Compute 4-digit prefix ([gender 2][village 2])
  v_prefix := public.rm_prefix(p_jenis_kelamin, p_desa);

  -- 2. Extract highest global sequence from all valid 9-digit RM numbers (last 5 digits)
  SELECT coalesce(max(substring(no_rm from 5 for 5)::integer), 0)
  INTO v_max_seq
  FROM public.patients
  WHERE no_rm ~ '^[0-9]{9}$';

  -- 3. Determine next sequence (at least 3741 or max + 1)
  v_next_seq := greatest(v_max_seq + 1, 3741);

  -- 4. Combine into canonical 9-digit string
  RETURN v_prefix || lpad(v_next_seq::text, 5, '0');
END;
$$;

-- Grant execution permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.get_next_no_rm(text, text) TO anon, authenticated, service_role;
