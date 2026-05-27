import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Award, Truck, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductWithPharmacy } from "@/hooks/useFarmaSearch";
import { productSlug } from "@/lib/productSlug";
import { toSlug } from "@/lib/principiAttivi";

interface ResultsTableProps {
  products: ProductWithPharmacy[];
  fromCache: boolean;
}

// ---------- Helpers ----------

function formatPricePerG(value: number | null): string {
  if (value == null) return "N/D";
  return `€${(value * 1000).toFixed(2)}/g`;
}

function formatPrice(value: number): string {
  return `€${value.toFixed(2)}`;
}

function shippingCostFor(p: ProductWithPharmacy): number {
  const threshold = p.pharmacies.free_shipping_threshold;
  if (threshold != null && p.price >= threshold) return 0;
  return p.pharmacies.shipping_cost ?? 0;
}

function effectivePrice(p: ProductWithPharmacy): number {
  return p.price + shippingCostFor(p);
}

function formatShipping(pharmacy: ProductWithPharmacy["pharmacies"]): string {
  if (pharmacy.free_shipping_threshold) {
    return `${formatPrice(pharmacy.shipping_cost)} (gratis da ${formatPrice(pharmacy.free_shipping_threshold)})`;
  }
  return formatPrice(pharmacy.shipping_cost);
}

function isSafeUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function stripSearchParam(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("search");
    return u.toString();
  } catch {
    return url;
  }
}

function safeOutboundUrl(url: string, activeIngredient: string): string | null {
  if (!isSafeUrl(url)) return null;
  const cleaned = stripSearchParam(url);
  const separator = cleaned.includes("?") ? "&" : "?";
  return `${cleaned}${separator}utm_source=farmacompara&utm_medium=referral&utm_campaign=confronto_prezzi&utm_content=${encodeURIComponent(activeIngredient)}`;
}

// Forme farmaceutiche riconoscibili dal nome prodotto
const FORM_PATTERNS: Array<{ key: string; label: string; regex: RegExp }> = [
  { key: "compresse", label: "Compresse", regex: /\b(compresse|cpr|cp\.?|com\.{0,2}|tablets|tabs)\b/i },
  { key: "capsule", label: "Capsule", regex: /\b(capsule|cps|cap\.?|caps\.?)\b/i },
  { key: "bustine", label: "Bustine", regex: /\b(bustine|bust\.?|buste|sachets)\b/i },
  { key: "sciroppo", label: "Sciroppo", regex: /\b(sciroppo|sciropp|syrup)\b/i },
  { key: "gel", label: "Gel/Crema", regex: /\b(gel|crema|cream|emulgel|pomata|unguento)\b/i },
  { key: "spray", label: "Spray", regex: /\b(spray|aerosol)\b/i },
  { key: "cerotti", label: "Cerotti", regex: /\b(cerott[oi]|cer\.?\s*med|patch|patches)\b/i },
  { key: "gocce", label: "Gocce", regex: /\b(gocce|drops|gtt)\b/i },
  { key: "supposte", label: "Supposte", regex: /\b(supposte|supp\.?)\b/i },
  { key: "fiale", label: "Fiale", regex: /\b(fiale|fl\.?|flaconi|ovuli)\b/i },
];

function detectForm(name: string): string | null {
  for (const f of FORM_PATTERNS) {
    if (f.regex.test(name)) return f.key;
  }
  return null;
}

// ---------- Component ----------

export function ResultsTable({ products, fromCache }: ResultsTableProps) {
  const [formFilter, setFormFilter] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [freeShippingOnly, setFreeShippingOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Forme disponibili nei risultati correnti
  const availableForms = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const f = detectForm(p.name);
      if (f) set.add(f);
    }
    return FORM_PATTERNS.filter((fp) => set.has(fp.key));
  }, [products]);

  // Applica filtri
  const filtered = useMemo(() => {
    const max = parseFloat(maxPrice.replace(",", "."));
    return products.filter((p) => {
      if (formFilter !== "all" && detectForm(p.name) !== formFilter) return false;
      if (!Number.isNaN(max) && max > 0 && effectivePrice(p) > max) return false;
      if (freeShippingOnly && shippingCostFor(p) > 0) return false;
      return true;
    });
  }, [products, formFilter, maxPrice, freeShippingOnly]);

  const activeFilterCount =
    (formFilter !== "all" ? 1 : 0) +
    (maxPrice.trim() !== "" ? 1 : 0) +
    (freeShippingOnly ? 1 : 0);

  const resetFilters = () => {
    setFormFilter("all");
    setMaxPrice("");
    setFreeShippingOnly(false);
  };

  const isPreview = typeof window !== "undefined" &&
    (window.location.hostname.includes("lovable.dev") || window.location.hostname.includes("lovableproject.com"));

  if (products.length === 0) {
    return (
      <Card className="mt-8">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-lg">
            Nessun prodotto trovato. Prova con un altro principio attivo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold">
          {filtered.length} di {products.length} prodott{products.length === 1 ? "o" : "i"}
        </h2>
        <div className="flex items-center gap-2">
          {fromCache && isPreview && (
            <Badge variant="secondary" className="text-xs">
              📦 Cache
            </Badge>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtri{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="form-filter" className="text-xs">Forma farmaceutica</Label>
              <Select value={formFilter} onValueChange={setFormFilter}>
                <SelectTrigger id="form-filter">
                  <SelectValue placeholder="Tutte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  {availableForms.map((f) => (
                    <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-price" className="text-xs">Prezzo max (incl. spedizione)</Label>
              <Input
                id="max-price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="€"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Spedizione</Label>
              <label className="flex items-center gap-2 h-10 cursor-pointer">
                <Checkbox
                  checked={freeShippingOnly}
                  onCheckedChange={(v) => setFreeShippingOnly(v === true)}
                />
                <span className="text-sm">Solo spedizione gratis</span>
              </label>
            </div>

            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="sm:col-span-3 justify-self-start gap-1"
              >
                <X className="h-3.5 w-3.5" /> Reimposta filtri
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nessun prodotto rispetta i filtri selezionati.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="block md:hidden space-y-3">
            {filtered.map((p, i) => {
              const total = effectivePrice(p);
              const ship = shippingCostFor(p);
              return (
                <Card
                  key={p.id}
                  className={`relative overflow-hidden ${i === 0 ? "border-primary border-2 shadow-md" : ""}`}
                >
                  {i === 0 && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 rounded-bl-lg text-xs font-semibold flex items-center gap-1">
                      <Award className="h-3 w-3" /> Più conveniente
                    </div>
                  )}
                  <CardContent className="p-4 space-y-2">
                    <Link
                      to={`/prodotto/${toSlug(p.active_ingredient)}/${productSlug(p.name, p.pharmacies.name)}`}
                      className="block font-semibold text-sm pr-24 leading-tight hover:text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{p.pharmacies.name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Prezzo</p>
                        <p className="font-semibold">{formatPrice(p.price)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Dosaggio</p>
                        <p className="font-medium">
                          {p.dosage_mg ? `${p.dosage_mg}mg` : "N/D"}
                          {p.quantity ? ` × ${p.quantity}` : ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">€/g</p>
                        <p className={`font-bold ${i === 0 ? "text-primary" : ""}`}>
                          {formatPricePerG(p.price_per_mg)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t">
                      <div>
                        <p className="text-muted-foreground">Totale (con spedizione)</p>
                        <p className={`font-semibold text-sm ${i === 0 ? "text-primary" : "text-foreground"}`}>
                          {formatPrice(total)}
                          {ship === 0 && (
                            <span className="ml-1 text-[10px] font-medium text-green-600 dark:text-green-400">
                              spedizione gratis
                            </span>
                          )}
                        </p>
                      </div>
                      {(() => {
                        const safeHref = p.product_url ? safeOutboundUrl(p.product_url, p.active_ingredient) : null;
                        return safeHref ? (
                          <a
                            href={safeHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            Vai <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null;
                      })()}
                    </div>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Truck className="h-3 w-3" />
                      {formatShipping(p.pharmacies)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Prodotto</TableHead>
                  <TableHead>Farmacia</TableHead>
                  <TableHead className="text-right">Prezzo</TableHead>
                  <TableHead className="text-right">Dosaggio</TableHead>
                  <TableHead className="text-right">Qtà</TableHead>
                  <TableHead className="text-right font-bold">€/g</TableHead>
                  <TableHead className="text-right">Totale</TableHead>
                  <TableHead>Spedizione</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p, i) => {
                  const total = effectivePrice(p);
                  const ship = shippingCostFor(p);
                  return (
                    <TableRow
                      key={p.id}
                      className={i === 0 ? "bg-primary/5 font-medium" : ""}
                    >
                      <TableCell>
                        {i === 0 ? (
                          <Award className="h-5 w-5 text-primary" />
                        ) : (
                          <span className="text-muted-foreground">{i + 1}</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        <span className="line-clamp-2 text-sm">{p.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{p.pharmacies.name}</span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPrice(p.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.dosage_mg ? `${p.dosage_mg}mg` : "N/D"}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.quantity || "N/D"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${i === 0 ? "text-primary" : ""}`}
                      >
                        {formatPricePerG(p.price_per_mg)}
                      </TableCell>
                      <TableCell className={`text-right ${i === 0 ? "font-semibold text-primary" : "font-medium"}`}>
                        <div className="flex flex-col items-end leading-tight">
                          <span>{formatPrice(total)}</span>
                          {ship === 0 && (
                            <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
                              sped. gratis
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Truck className="h-3 w-3 shrink-0" />
                          <span>{formatShipping(p.pharmacies)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const safeHref = p.product_url ? safeOutboundUrl(p.product_url, p.active_ingredient) : null;
                          return safeHref ? (
                            <a
                              href={safeHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Vai al sito della farmacia ${p.pharmacies.name} per ${p.name}`}
                              className="text-primary hover:text-primary/80"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ) : null;
                        })()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
