import { useState, FormEvent } from "react";
import { Search, Pill } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TOP_PRINCIPI_ATTIVI, toSlug } from "@/lib/principiAttivi";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  initialQuery?: string;
  showSuggestions?: boolean;
}

export function SearchBar({ onSearch, loading, initialQuery = "", showSuggestions = true }: SearchBarProps) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) onSearch(query.trim());
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca principio attivo o farmaco..."
            className="pl-12 pr-28 h-14 text-base rounded-2xl border-2 border-border bg-card shadow-lg focus-visible:ring-primary/30 focus-visible:border-primary transition-all"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || query.trim().length < 2}
            className="absolute right-2 h-10 px-6 rounded-xl font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                Cerco...
              </span>
            ) : (
              "Cerca"
            )}
          </Button>
        </div>
      </form>

      {showSuggestions && (
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {TOP_PRINCIPI_ATTIVI.map((s) => (
            <Link
              key={s}
              to={`/cerca/${toSlug(s)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Pill className="h-3.5 w-3.5" />
              {s}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
