import { useState, useEffect, useMemo, useRef, FormEvent, KeyboardEvent } from "react";
import { Search, Pill, Tag } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TOP_PRINCIPI_ATTIVI, ALL_PRINCIPI_ATTIVI, toSlug } from "@/lib/principiAttivi";
import { BRAND_TO_ACTIVE } from "@/lib/brandToActive";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  initialQuery?: string;
  showSuggestions?: boolean;
}

type Suggestion = {
  label: string;
  kind: "principio" | "brand";
  active?: string;
  slug: string;
};

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Pre-build index once
const PRINCIPI_INDEX: Suggestion[] = ALL_PRINCIPI_ATTIVI.map((p) => ({
  label: p,
  kind: "principio" as const,
  slug: toSlug(p),
}));

const BRAND_INDEX: Suggestion[] = Object.entries(BRAND_TO_ACTIVE).map(
  ([brand, active]) => ({
    label: brand,
    kind: "brand" as const,
    active,
    slug: toSlug(brand),
  })
);

function computeSuggestions(q: string): Suggestion[] {
  const nq = norm(q);
  if (nq.length < 2) return [];
  const scored: { s: Suggestion; score: number }[] = [];
  for (const s of PRINCIPI_INDEX) {
    const nl = norm(s.label);
    if (nl === nq) scored.push({ s, score: 0 });
    else if (nl.startsWith(nq)) scored.push({ s, score: 1 });
    else if (nl.includes(nq)) scored.push({ s, score: 3 });
  }
  for (const s of BRAND_INDEX) {
    const nl = norm(s.label);
    if (nl === nq) scored.push({ s, score: 0 });
    else if (nl.startsWith(nq)) scored.push({ s, score: 2 });
    else if (nl.includes(nq)) scored.push({ s, score: 4 });
  }
  scored.sort((a, b) => a.score - b.score || a.s.label.length - b.s.label.length);
  // Dedup by label
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const { s } of scored) {
    const k = s.kind + ":" + norm(s.label);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= 8) break;
  }
  return out;
}

export function SearchBar({ onSearch, loading, initialQuery = "", showSuggestions = true }: SearchBarProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const suggestions = useMemo(() => computeSuggestions(query), [query]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectSuggestion = (s: Suggestion) => {
    setOpen(false);
    setQuery(s.label);
    navigate(`/cerca/${s.slug}`);
    onSearch(s.label);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (open && suggestions[highlight]) {
      selectSuggestion(suggestions[highlight]);
      return;
    }
    if (query.trim().length >= 2) {
      setOpen(false);
      onSearch(query.trim());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = open && suggestions.length > 0;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative" ref={wrapRef}>
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={isMobile ? "Cerca farmaco..." : "Cerca principio attivo o farmaco..."}
            aria-label="Cerca principio attivo o nome commerciale del farmaco"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            role="combobox"
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

        {showDropdown && (
          <ul
            role="listbox"
            className="absolute z-50 left-0 right-0 top-full mt-2 max-h-80 overflow-auto rounded-xl border border-border bg-popover shadow-xl py-1"
          >
            {suggestions.map((s, i) => (
              <li
                key={s.kind + s.label}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(s);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex items-center gap-2 px-4 py-2 cursor-pointer text-sm ${
                  i === highlight ? "bg-accent text-accent-foreground" : "text-foreground"
                }`}
              >
                {s.kind === "principio" ? (
                  <Pill className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Tag className="h-4 w-4 text-primary shrink-0" />
                )}
                <span className="font-medium capitalize">{s.label}</span>
                {s.kind === "brand" && s.active && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {s.active}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
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
