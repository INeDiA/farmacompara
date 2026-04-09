

# Analisi API farmacie — Risultati

## Riepilogo per sito

| Farmacia | Piattaforma | Metodo trovato | Fattibilità |
|----------|------------|----------------|-------------|
| **Farmacia Gaudiana** | OpenCart (PHP) | HTML scraping: `/index.php?route=product/search&search={q}` | Alta — stesso pattern di Farmacia Igea |
| **Farmacia Soccavo** | PrestaShop + Doofinder | Doofinder API (hashid: `a5e3fb0ed`) | Media — Doofinder richiede token, da verificare se funziona server-side |
| **Farmacia Mazzini** | — | Sito irraggiungibile | Nulla — il sito è offline |
| **Farmacia Guacci** | OpenCart + Doofinder | HTML scraping: OpenCart search oppure Doofinder | Alta — fallback su HTML come Igea/Gaudiana |
| **Farmacia del Corso** | OpenCart + Doofinder | HTML scraping: OpenCart search | Alta — stesso pattern OpenCart |
| **1000Farmacie** | Custom + Algolia | Algolia API pubblica (app: `HW3T8WVS73`, key: `a44069a5...`, index: `Product`) | Alta — stesso approccio di eFarma |
| **Farmacia Uno** | Magento + Seken.ai | Seken.ai API (bearer token pubblico nel JS) | Media — CORS ristretto ma le Edge Functions non usano CORS |
| **Farmaeurope** | Magento | Magento autocomplete: `/searchautocomplete/ajax/suggest/?q={q}` — JSON con nome, prezzo, URL, immagine | Alta — endpoint JSON diretto |
| **Slowfarma** | Shopify? | Cloudflare block | Nulla — completamente bloccato |

## Farmacie integrabili subito (5 su 9)

### 1. Farmacia Gaudiana — HTML scraping OpenCart
- URL: `https://farmaciagaudiana.it/index.php?route=product/search&search={q}`
- Parser: identico a Farmacia Igea (caption blocks, h4 > a, class="price")

### 2. Farmacia Guacci — HTML scraping OpenCart  
- URL: `https://farmaciaguacci.it/index.php?route=product/search&search={q}`
- Parser: identico a Igea/Gaudiana

### 3. Farmacia del Corso — HTML scraping OpenCart
- URL: `https://farmaciadelcorso.net/index.php?route=product/search&search={q}`
- Parser: identico a Igea/Gaudiana/Guacci

### 4. 1000Farmacie — Algolia API
- Endpoint: `https://hw3t8wvs73-dsn.algolia.net/1/indexes/Product/query`
- App ID: `HW3T8WVS73`, API Key: `a44069a5116559934332f93aa82d91d8`
- Risposta JSON con nome, prezzo, URL, immagine

### 5. Farmaeurope — Magento searchautocomplete
- Endpoint: `https://www.farmaeurope.eu/searchautocomplete/ajax/suggest/?q={q}&store_id=4`
- Risposta JSON con `name`, `price` (HTML da parsare per estrarre `data-price-amount`), `url`, `imageUrl`

## Farmacie integrabili con rischio medio (2)

### 6. Farmacia Uno — Seken.ai
- Endpoint: `POST https://open.seken.ai/api/search`
- Bearer token: `b412b9e78e0e28d4ac7935779888de72:5e27deb5ae00268c0bec330e754cb04e`
- Il CORS è ristretto al dominio farmaciauno.it, ma le Edge Functions fanno chiamate server-side (no CORS)
- Rischio: il token potrebbe scadere o essere ruotato

### 7. Farmacia Soccavo — Doofinder
- Il Doofinder API v2 richiede un token di autenticazione oltre al hashid
- Da testare se il token è recuperabile dal JS del sito o se l'API funziona senza

## Farmacie non integrabili (2)
- **Farmacia Mazzini**: sito offline
- **Slowfarma**: Cloudflare block totale

## Piano di implementazione

### Modifiche a `supabase/functions/farma-search/index.ts`

1. **Refactor scraper OpenCart**: generalizzare `scrapeIgea` in una funzione `scrapeOpenCart(baseUrl, query)` riutilizzabile per Igea, Gaudiana, Guacci e del Corso
2. **Aggiungere scraper 1000Farmacie**: chiamata Algolia simile a eFarma, con app ID e key diversi
3. **Aggiungere scraper Farmaeurope**: fetch JSON dall'endpoint Magento, parsing del prezzo da `data-price-amount` nell'HTML del campo price
4. **Aggiungere scraper Farmacia Uno**: POST a Seken.ai con bearer token
5. **Aggiornare il registry `scrapers`**: aggiungere le 5 nuove farmacie

### Migrazione database
- Inserire le nuove farmacie nella tabella `pharmacies`: Farmacia Gaudiana, Farmacia Guacci, Farmacia del Corso, 1000Farmacie, Farmaeurope, Farmacia Uno

### Nessuna modifica al frontend
- Il frontend mostra già dinamicamente tutte le farmacie dai risultati

