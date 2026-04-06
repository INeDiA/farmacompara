import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProductWithPharmacy {
  id: string;
  name: string;
  active_ingredient: string;
  dosage_mg: number | null;
  quantity: number | null;
  total_mg: number | null;
  price: number;
  price_per_mg: number | null;
  product_url: string | null;
  image_url: string | null;
  last_scraped: string;
  pharmacies: {
    id: string;
    name: string;
    base_url: string;
    shipping_cost: number;
    free_shipping_threshold: number | null;
  };
}

export interface SearchResult {
  products: ProductWithPharmacy[];
  from_cache: boolean;
  cached_at?: string;
  expires_at?: string;
  pharmacies_scraped?: number;
  products_found?: number;
}

export function useFarmaSearch() {
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: string) => {
    if (!query || query.trim().length < 2) return;
    
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "farma-search",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          body: undefined,
        }
      );

      // supabase.functions.invoke doesn't support query params easily,
      // so let's use fetch directly
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/farma-search?q=${encodeURIComponent(query.trim())}`,
        {
          headers: {
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
          },
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Errore nella ricerca");
      }

      const data2: SearchResult = await response.json();
      setResults(data2);
    } catch (err: any) {
      setError(err.message || "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, error, search };
}
