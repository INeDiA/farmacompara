

## Piano: Aggiungere parametri UTM ai link in uscita

### Cosa cambia

**File: `src/components/ResultsTable.tsx`**

1. Aggiungere una funzione helper `addUtmParams(url, activeIngredient)` che appende i parametri UTM:
   - `utm_source=farmacompara`
   - `utm_medium=referral`
   - `utm_campaign=confronto_prezzi`
   - `utm_content={activeIngredient}` (codificato con `encodeURIComponent`)

2. Applicarla ai due link `<a href=...>` esistenti (mobile ~riga 104, desktop ~riga 176), sostituendo `p.product_url` con `addUtmParams(p.product_url, p.active_ingredient)`.

Nessuna modifica ad altri file.

