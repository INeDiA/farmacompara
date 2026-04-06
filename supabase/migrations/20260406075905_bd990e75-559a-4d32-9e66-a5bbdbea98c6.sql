
-- Tabella farmacie con info spedizione
CREATE TABLE public.pharmacies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  search_url_template TEXT NOT NULL,
  shipping_cost NUMERIC(6,2) NOT NULL DEFAULT 0,
  free_shipping_threshold NUMERIC(8,2),
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella prodotti trovati
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active_ingredient TEXT NOT NULL,
  dosage_mg NUMERIC(10,2),
  quantity INTEGER,
  total_mg NUMERIC(12,2),
  price NUMERIC(8,2) NOT NULL,
  price_per_mg NUMERIC(12,8),
  product_url TEXT,
  image_url TEXT,
  last_scraped TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cache ricerche
CREATE TABLE public.search_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  last_scraped TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  result_count INTEGER DEFAULT 0
);

-- Indici
CREATE INDEX idx_products_active_ingredient ON public.products(active_ingredient);
CREATE INDEX idx_products_pharmacy ON public.products(pharmacy_id);
CREATE INDEX idx_search_cache_query ON public.search_cache(query);
CREATE INDEX idx_products_price_per_mg ON public.products(price_per_mg);

-- RLS: dati pubblici in lettura
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacies are publicly readable" ON public.pharmacies FOR SELECT USING (true);
CREATE POLICY "Products are publicly readable" ON public.products FOR SELECT USING (true);
CREATE POLICY "Search cache is publicly readable" ON public.search_cache FOR SELECT USING (true);

-- Service role can manage all data (edge functions use service role)
CREATE POLICY "Service role manages pharmacies" ON public.pharmacies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages search_cache" ON public.search_cache FOR ALL USING (true) WITH CHECK (true);
