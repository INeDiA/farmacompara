# Implementazione punti 1, 2, 4, 5

## 1 · Fix `filterByQuery` per principi attivi a nome composto

**File**: `supabase/functions/farma-search/index.ts`

Sostituisco l'attuale tokenizzazione (`.split(/\s+/)[0]` che teneva solo la prima parola) con una funzione `significantTokens` che:

- splitta su spazi, trattini, slash
- tiene i token "discriminanti": lunghezza ≥ 6, oppure ≥ 2 se contengono cifre (per "d3", "b12")
- fallback su token ≥ 3 chars se nessuno passa
- richiede che **tutti** i token di almeno una keyword siano presenti nel nome prodotto

Esempi:
- `"acido acetilsalicilico"` → `["acetilsalicilico"]` → non matcha più "Acido folico" ✅
- `"ibuprofen lisina"` → `["ibuprofen", "lisina"]` → entrambi richiesti, non matcha Ibuprofene puro ✅
- `"vitamina d3"` → `["vitamina", "d3"]` → entrambi richiesti, non matcha Vitamina C ✅
- `"diclofenac topico"` → `["diclofenac", "topico"]` → non matcha Diclofenac sistemico ✅

## 2 · Colonna prezzo finale (con spedizione)

**File**: `src/components/ResultsTable.tsx`

Aggiungo helper `effectivePrice(p)`:
```
shipping = (free_shipping_threshold && price >= threshold) ? 0 : pharmacy.shipping_cost
return price + shipping
```

- **Desktop**: nuova colonna "Totale" tra "Prezzo" e "Dosaggio" (o dopo "Spedizione"). Evidenziata sul prodotto più conveniente per €/g.
- **Mobile**: nella card aggiungo una riga `Totale: €X,XX (incl. spedizione)` sotto al prezzo.
- L'ordinamento principale rimane per €/g (logica edge function invariata).

## 4 · Filtri risultati

**File**: `src/components/ResultsTable.tsx` (filtri inline sopra alla lista, per non aggiungere nuovi file).

Tre filtri client-side via `useState`:

1. **Forma farmaceutica** — Select shadcn con opzioni rilevate dinamicamente dai prodotti (regex sui nomi: `compresse|capsule|bustine|sciroppo|gel|crema|spray|cerotti|gocce|supposte|fiale`). Default "Tutte".
2. **Prezzo massimo** — Input number, opzionale. Filtra sul *prezzo effettivo* (con spedizione).
3. **Solo spedizione gratis** — Checkbox. Tiene solo prodotti dove `effectivePrice === price` (cioè soglia gratuità superata o `shipping_cost = 0`).

UI: barra compatta sopra alla tabella, collassabile su mobile dietro a un pulsante "Filtri (N attivi)". Counter prodotti aggiornato. Empty state dedicato se i filtri azzerano i risultati.

## 5 · Esternalizzazione API keys hardcoded

**File**: `supabase/functions/farma-search/index.ts`

Le 3 API key Algolia/Seken inline diventano lette da env var, **con fallback al valore attuale** così nulla si rompe:

```ts
const EFARMA_ALGOLIA_KEY = Deno.env.get("EFARMA_ALGOLIA_KEY") ?? "<current>";
const FARMACIE_1000_ALGOLIA_KEY = Deno.env.get("FARMACIE_1000_ALGOLIA_KEY") ?? "<current>";
const SEKEN_API_KEY = Deno.env.get("SEKEN_API_KEY") ?? "<current>";
```

Quando una chiave scade (eFarma scade ~marzo 2026) basta aggiungere il secret corrispondente senza redeploy del codice. **Non chiedo i secret ora** — i fallback bastano finché le chiavi attuali sono valide. Quando vorrai ruotarle, dimmelo e attivo `add_secret`.

---

## Out of scope (su tua richiesta non implemento ora)

- Punto 3 (storico prezzi) — feature più grossa, richiede nuova tabella + migration
- Tutti gli altri suggerimenti dell'analisi precedente
