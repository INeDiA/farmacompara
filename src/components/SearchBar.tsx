import { useState, FormEvent } from "react";
import { Search, Pill } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
}

const suggestions = [
  "Paracetamolo",
  "Ibuprofene",
  "Tachipirina",
  "Aspirina",
  "Moment",
  "OKi",
];

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState("");

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
            placeholder="Cerca un principio attivo o farmaco..."
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

      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => {
              setQuery(s);
              onSearch(s);
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
          >
            <Pill className="h-3.5 w-3.5" />
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
