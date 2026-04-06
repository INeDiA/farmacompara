

# Alternative gratuite a Firecrawl per FarmaCompare

## Analisi delle opzioni

### 1. Fetch diretto dalle Edge Functions (GRATUITO, incluso in Lovable Cloud)

Le Supabase Edge Functions possono fare `fetch()` verso qualsiasi URL e ricevere l'HTML grezzo. Non serve nessun servizio esterno.

```text
Edge Function → fetch(farmacia-url) → HTML grezzo → parsing con regex/DOM parser → dati strutturati
```

**Pro**: Costo zero, nessun connector esterno, nessun limite di crediti.
**Contro**: Non gestisce JavaScript-rendered content (SPA). Funziona solo se le farmacie servono HTML server-side.

**Verifica necessaria**: La maggior parte delle farmacie online italiane (Farmacia Loreto, Dr. Max, eFarma, ecc.) usa piattaforme e-commerce tradizionali (Magento, PrestaShop, WooCommerce) che servono HTML completo lato server. Il fetch diretto dovrebbe funzionare nella maggioranza dei casi.

### 2. Implementazione proposta

Nelle Edge Functions, invece di chiamare Firecrawl:

```ts
// Fetch diretto + parsing HTML
const html = await (await fetch(pharmacyUrl)).text();
// Parsing con regex o libreria DOM (es. deno-dom, linkedom)
```

Per il parsing dell'HTML in Deno (runtime delle Edge Functions), si possono usare:
- **deno-dom**: parser DOM leggero disponibile in Deno
- **Regex**: per estrazioni semplici e mirate (prezzo, dosaggio)

Per la ricerca dei prodotti, invece di usare Firecrawl Search, costruiamo gli URL di ricerca direttamente sulle farmacie target:
```text
https://www.farmacialoreto.it/catalogsearch/result/?q=paracetamolo
https://www.drmax.it/search?q=paracetamolo
```

### 3. Confronto costi

| Approccio | Costo mensile |
|-----------|--------------|
| Firecrawl Hobby | ~$16/mese |
| Fetch diretto da Edge Functions | $0 (incluso in Lovable Cloud) |

### 4. Rischio e mitigazione

- **Anti-bot**: Alcune farmacie potrebbero bloccare richieste senza User-Agent. Soluzione: impostare header realistici nelle fetch.
- **Struttura HTML variabile**: Ogni farmacia ha un layout diverso. Serve un parser specifico per sito (ma lo servirebbe anche con Firecrawl).
- **Rate limiting**: Rispettare tempi tra le richieste per non essere bloccati.

## Raccomandazione

**Usare il fetch diretto** dalle Edge Functions. Elimina completamente il costo di Firecrawl ($16/mese), portando il costo totale del progetto a soli **~$20/mese** (solo Lovable Pro). Il piano aggiornato prevede:

1. **Edge Function `farma-search`**: per ogni farmacia target, costruisce l'URL di ricerca, fa fetch dell'HTML, lo parsa con deno-dom/regex per estrarre prodotti, prezzi e dosaggi
2. **Un modulo parser per farmacia**: funzioni specifiche per estrarre i dati da ciascun sito (selettori CSS/regex dedicati)
3. **Cache su Supabase**: invariata rispetto al piano originale

