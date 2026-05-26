# FarmaCompara

> Confronto del prezzo al grammo di principio attivo tra farmacie online italiane. Stessa molecola, confezioni diverse: scopri quale conviene davvero.

Sito live: **[farmacompara.it](https://farmacompara.it)**

---

## Funzionalità

### Ricerca intelligente
- **Ricerca per principio attivo o nome commerciale**: scrivendo "Aspirina" il sito mostra automaticamente tutti i prodotti a base di acido acetilsalicilico (generici + altri brand), con possibilità di restringere alla ricerca letterale.
- **Suggerimenti**: 52 principi attivi OTC più usati, con scorciatoie agli 8 più frequenti in homepage.
- **Esclusione farmaci con obbligo di prescrizione** come previsto dalla normativa italiana.

### Confronto prezzi normalizzato
- Il prezzo viene **normalizzato al costo per grammo di principio attivo**, tenendo conto di dosaggio, numero di unità per confezione ed eventuali spese di spedizione.
- Risultati ordinabili, con badge per il prezzo migliore e indicazione della farmacia di provenienza.
- **Spedizione sempre visibile** nel confronto.

### Catalogo principi attivi
- Pagina dedicata `/principi-attivi` con elenco completo delle molecole monitorate, ciascuna con link diretto alla pagina di confronto.

### Farmacie integrate
Dieci farmacie online italiane autorizzate, raccolte via API ufficiali (Algolia/Shopify) o parsing HTML (OpenCart) — inclusa la gestione di cataloghi con varianti, sconti e disponibilità.

### Affidabilità & freschezza dei dati
- **Scraping on-demand** all'arrivo della richiesta utente, con cache di 48 ore.
- **Rate limiting progressivo per IP** lato server per evitare abusi.
- **Outbound link tracciati**: ogni click verso la farmacia partner viene normalizzato (parametri ripuliti, UTM aggiunti).

### Esperienza utente
- **PWA installabile** su mobile e desktop (standalone, senza service worker per evitare problemi di cache).
- Interfaccia minimale, accessibile (heading semantici, aria-label), responsive.
- Header con logo che funge da "reset globale": torna in home, svuota la ricerca, rimonta l'input.

### SEO & discoverability
- Rotte dinamiche `/cerca/:slug` e `/principi-attivi` indicizzabili.
- **Rendering client-side ottimizzato** con meta tag, canonical, Open Graph e JSON-LD (`Organization`, `WebSite`, `CollectionPage`, `ItemList`, `BreadcrumbList`) iniettati dinamicamente.
- `sitemap.xml`, `robots.txt` e `llms.txt` per crawler tradizionali e AI.
- Sitemap registrata in Google Search Console.

---

## Stack tecnico

### Frontend
- **React 18** + **TypeScript 5** + **Vite 5**
- **Tailwind CSS v3** con design system semantico (token HSL in `index.css`, varianti via `class-variance-authority`)
- **shadcn/ui** (Radix UI primitives) per i componenti
- **React Router** per il routing SPA
- **TanStack Query** per il data fetching
- **Lucide** per le icone

### Backend (Lovable Cloud / Supabase)
- **Supabase Postgres** per persistenza prodotti, cache e log di rate limiting
- **Edge Functions Deno** (`supabase/functions/farma-search`) come orchestratore di scraping, parsing prezzi, calcolo prezzo/g e gestione cache
- **Row Level Security** sulle tabelle utente
- **Tabella di rate limiting** con insert prima del count per evitare race condition

### Integrazioni
- API Algolia / Shopify per le farmacie che le espongono
- Parsing HTML server-side per cataloghi OpenCart
- Iubenda per privacy/cookie policy

### Architettura dati
- Slug-based routing per i principi attivi (`/cerca/acido-acetilsalicilico`)
- Mappa **brand → principio attivo** e **principio attivo → brand** (`src/lib/brandToActive.ts`) per espandere automaticamente la ricerca ai nomi commerciali
- Calcolo prezzo unitario lato edge, indipendente dal formato della confezione (parsing dosaggio + quantità)

### DevOps
- Repository sincronizzato con GitHub (two-way sync via Lovable)
- Deploy automatico del frontend su Lovable Hosting
- Edge functions deployate automaticamente al merge
- Custom domain: `farmacompara.it`

---

## Sviluppo locale

```bash
npm install
npm run dev
```

Il progetto richiede le variabili `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (auto-generate da Lovable Cloud in `.env`).

## Disclaimer

I prezzi mostrati sono indicativi e aggiornati ogni 48 ore. Verifica sempre sul sito della farmacia prima dell'acquisto. FarmaCompara non vende farmaci e non sostituisce il parere del medico o del farmacista.
