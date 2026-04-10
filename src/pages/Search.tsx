import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Pill, TrendingDown, Shield, Truck } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { ResultsTable } from "@/components/ResultsTable";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useFarmaSearch } from "@/hooks/useFarmaSearch";
import { fromSlug } from "@/lib/principiAttivi";

const Search = () => {
  const { query: rawQuery } = useParams<{ query: string }>();
  const navigate = useNavigate();
  const query = rawQuery ? fromSlug(rawQuery) : "";
  const { results, loading, error, search, reset } = useFarmaSearch();
  const [hasSearched, setHasSearched] = useState(false);

  // Set document title and meta
  useEffect(() => {
    if (query) {
      const capitalized = query.charAt(0).toUpperCase() + query.slice(1);
      document.title = `${capitalized} — Confronta prezzi farmaci online | FarmaCompara`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute("content", `Confronta il prezzo per grammo di ${capitalized} tra diverse farmacie online italiane. Trova la confezione più conveniente.`);
      }
    }
    return () => {
      document.title = "FarmaCompara";
    };
  }, [query]);

  // Auto-search on mount
  useEffect(() => {
    if (query && !hasSearched) {
      setHasSearched(true);
      search(query);
    }
  }, [query, hasSearched, search]);

  const handleSearch = (q: string) => {
    navigate(`/cerca/${encodeURIComponent(q.toLowerCase())}`, { replace: true });
    search(q);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Pill className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">FarmaCompara</h1>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <SearchBar onSearch={handleSearch} loading={loading} initialQuery={query} />

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-1">Riprova tra qualche secondo</p>
          </div>
        )}

        {loading && <LoadingSkeleton />}

        {results && !loading && (
          <ResultsTable products={results.products} fromCache={results.from_cache} />
        )}
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-xs text-muted-foreground space-y-1">
          <p>FarmaCompara — confronto prezzi farmaci online italiani</p>
          <p>I prezzi mostrati sono indicativi e aggiornati ogni 24 ore. Verifica sempre sul sito della farmacia prima dell'acquisto.</p>
          <Link to="/principi-attivi" className="text-primary hover:underline">
            Tutti i principi attivi
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Search;
