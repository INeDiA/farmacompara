import { ExternalLink, Award, Truck, TruckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductWithPharmacy } from "@/hooks/useFarmaSearch";

interface ResultsTableProps {
  products: ProductWithPharmacy[];
  fromCache: boolean;
}

function formatPricePerG(value: number | null): string {
  if (!value) return "N/D";
  return `€${(value * 1000).toFixed(2)}/g`;
}

function formatPrice(value: number): string {
  return `€${value.toFixed(2)}`;
}

function formatShipping(pharmacy: ProductWithPharmacy["pharmacies"]): string {
  if (pharmacy.free_shipping_threshold) {
    return `${formatPrice(pharmacy.shipping_cost)} (gratis da ${formatPrice(pharmacy.free_shipping_threshold)})`;
  }
  return formatPrice(pharmacy.shipping_cost);
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

function addUtmParams(url: string, activeIngredient: string): string {
  const cleaned = stripSearchParam(url);
  const separator = cleaned.includes("?") ? "&" : "?";
  return `${cleaned}${separator}utm_source=farmacompara&utm_medium=referral&utm_campaign=confronto_prezzi&utm_content=${encodeURIComponent(activeIngredient)}`;
}

export function ResultsTable({ products, fromCache }: ResultsTableProps) {
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {products.length} prodott{products.length === 1 ? "o" : "i"} trovat{products.length === 1 ? "o" : "i"}
        </h2>
        {fromCache && (typeof window !== "undefined" && (window.location.hostname.includes("lovable.dev") || window.location.hostname.includes("lovableproject.com"))) && (
          <Badge variant="secondary" className="text-xs">
            📦 Risultati dalla cache
          </Badge>
        )}
      </div>

      {/* Mobile cards */}
      <div className="block md:hidden space-y-3">
        {products.map((p, i) => (
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
              <p className="font-semibold text-sm pr-24 leading-tight">{p.name}</p>
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
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                <span className="flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  {formatShipping(p.pharmacies)}
                </span>
                {p.product_url && (
                  <a
                    href={addUtmParams(p.product_url, p.active_ingredient)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    Vai <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
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
              <TableHead>Spedizione</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p, i) => (
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
                <TableCell className="text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Truck className="h-3 w-3 shrink-0" />
                    <span>{formatShipping(p.pharmacies)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {p.product_url && (
                    <a
                      href={addUtmParams(p.product_url, p.active_ingredient)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Vai al sito della farmacia ${p.pharmacies.name} per ${p.name}`}
                      className="text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
