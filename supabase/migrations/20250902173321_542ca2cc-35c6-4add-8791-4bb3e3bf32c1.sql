-- Fix remaining function search path issues
-- Update the update_recon_results_updated_at function
CREATE OR REPLACE FUNCTION public.update_recon_results_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;