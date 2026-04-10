

## Piano SEO per pagine /cerca/

Tre interventi concreti su `src/pages/Search.tsx` e `src/components/ResultsTable.tsx`.

### 1. Canonical tag dinamico

Aggiungere nell'`useEffect` esistente (riga 18-30) la creazione/aggiornamento di un tag `<link rel="canonical">` che punta a `https://farmacompara.lovable.app/cerca/{slug}`. Rimuoverlo al cleanup.

### 2. Title tag ottimizzato + H1 con testo descrittivo

- **Title**: da `"Paracetamolo — Confronta prezzi farmaci online | FarmaCompara"` a `"Paracetamolo: confronta prezzi e trova il più conveniente | FarmaCompara"`
- **H1 visibile**: Aggiungere sopra la tabella risultati un heading `<h1>` con il nome del principio attivo e un breve paragrafo descrittivo statico tipo *"Confronta il prezzo al grammo di Paracetamolo tra le farmacie online italiane e trova la confezione più conveniente."* — evita thin content senza entrare in ambito medico (no E-E-A-T rischioso).

### 3. Dati strutturati Schema.org (ItemList + AggregateOffer)

Quando i risultati sono disponibili, iniettare un `<script type="application/ld+json">` con:
- `@type: ItemList` contenente i prodotti come `ListItem`
- Ogni item con `@type: Product`, `name`, `offers.@type: AggregateOffer`, `lowPrice`, `highPrice`, `priceCurrency: EUR`

Questo viene fatto dinamicamente nell'`useEffect` dopo il caricamento dei risultati.

### File da modificare

| File | Cosa |
|------|------|
| `src/pages/Search.tsx` | Canonical tag, title migliorato, H1 + paragrafo, JSON-LD dinamico |

Un solo file, circa 50 righe aggiunte.

