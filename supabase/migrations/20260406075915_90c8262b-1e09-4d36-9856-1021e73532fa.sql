
-- Drop overly permissive policies
DROP POLICY "Service role manages pharmacies" ON public.pharmacies;
DROP POLICY "Service role manages products" ON public.products;
DROP POLICY "Service role manages search_cache" ON public.search_cache;

-- Service role insert/update/delete (service_role bypasses RLS anyway, 
-- so no anon/authenticated write policies means writes are blocked for regular users)
