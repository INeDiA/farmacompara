-- Lock down search_cache: only service_role (edge functions) should access it.
DROP POLICY IF EXISTS "Search cache is publicly readable" ON public.search_cache;
REVOKE ALL ON public.search_cache FROM anon, authenticated;
GRANT ALL ON public.search_cache TO service_role;

-- Lock down rate_limits explicitly: only service_role.
REVOKE ALL ON public.rate_limits FROM anon, authenticated;
GRANT ALL ON public.rate_limits TO service_role;