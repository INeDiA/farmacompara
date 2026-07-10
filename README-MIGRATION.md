# Migrazione da Lovable a GitHub Pages + Supabase indipendente

Checklist operativa per uscire da Lovable Hosting / Lovable Cloud. Riferimento pieno: piano in
`~/.claude/plans/analizza-il-sito-farmacompara-it-hashed-umbrella.md`. Qui solo i comandi e le
scoperte concrete emerse durante la preparazione.

Nuovo progetto Supabase: **`seffjzfrekergzdwvhrb`** (https://seffjzfrekergzdwvhrb.supabase.co).

Fatto finora in questo repo locale (`~/Sites/farmacompara`) — non ancora **committato/pushato**
su GitHub, in attesa di conferma:
- `.env` rimosso dal tracking git, aggiunto a `.gitignore`, creato `.env.example` come riferimento.
- `supabase/seed.sql` con i dati reali delle farmacie, estratti dal dump di produzione.
- Supabase CLI installata come devDependency (`npx supabase ...`).
- Progetto collegato (`supabase link`), `supabase/config.toml` aggiornato al nuovo `project_id`,
  `supabase/.temp` (cache locale del CLI, contiene URL/pooler interni) aggiunto a `.gitignore`.
- `.env` locale aggiornato con URL/anon key del nuovo progetto.
- `eFarma` e `Farmacia Uno` rimosse da `scrapers[]` in `farma-search/index.ts` e dal DB —
  scelta deliberata, vedi "Scoperte" sotto. **8 farmacie attive**, tutte con integrazioni stabili.
- Hosting deciso: **GitHub Pages** invece di Vercel. Aggiunto `public/404.html` +
  script inline in `index.html` (redirect trick per le route client-side di react-router),
  `public/CNAME` con `farmacompara.it`, workflow `.github/workflows/deploy-pages.yml`
  (build + deploy automatico ad ogni push su `main`).

## Scoperte utili durante la preparazione

- **Farmaeurope è defunto come fonte separata**: `farmaeurope.eu` oggi reindirizza a `farmae.it`
  (i due brand si sono fusi). Lo scraper `scrapeFarmaeurope` in `farma-search/index.ts` punta
  ancora al vecchio endpoint `searchautocomplete/ajax/suggest` — quasi certamente non restituisce
  più nulla di utile e duplica (nella migliore delle ipotesi) risultati già coperti da Farmae.
  Valutare se rimuoverlo dalla lista `scrapers[]` o lasciarlo com'è (fallisce in modo silenzioso,
  non rompe nulla, solo spreca una chiamata HTTP ad ogni ricerca).
- **eFarma, discrepanza sulla spedizione**: la riga di produzione nel dump dice €3,99 / gratuita
  da €19,90; la loro pagina di supporto ufficiale oggi dichiara €5,00 / gratuita da €29,90. O il
  valore in DB è rimasto indietro rispetto a una policy cambiata nel frattempo, o non è mai stato
  accurato. `seed.sql` usa il valore del dump (replica esatta del comportamento attuale); valuta
  se aggiornarlo a 5.00/29.90.
- **Le chiavi Algolia (eFarma, 1000Farmacie) non erano "tue"**: la spiegazione di Lovable sul
  meccanismo di `add_secret` (form protetto, incolli un valore) era corretta ma non implica che
  esistesse un tuo account Algolia — quelle application (`70OAFALOKQ` per eFarma, `HW3T8WVS73` per
  1000Farmacie) appartengono alle farmacie stesse. Le chiavi *search-only* di Algolia sono però
  progettate da Algolia per stare esposte lato client — è così che i due siti le usano davvero per
  il proprio autocomplete di ricerca (non per la pagina risultati completa, che su entrambi è
  ricerca nativa server-side — verificato sul traffico di rete reale).
  - `FARMACIE_1000_ALGOLIA_KEY`: trovata semplicemente leggendo l'URL di una richiesta di rete
    normale mentre si digitava nella barra di ricerca di 1000farmacie.it — Algolia la passa come
    query param, non è nascosta. È una chiave standard (non "secured"), nessuna scadenza
    incorporata — **impostata come secret, resta attiva**.
  - `EFARMA_ALGOLIA_KEY`: recuperata da `window.algoliaConfig.apiKey` nella console del browser
    sul sito efarma.com — ma è una "secured API key" Algolia con scadenza incorporata (`validUntil`
    codificato nel valore stesso, base64), valida solo ~24-27 ore dalla generazione. Non esiste una
    versione permanente ottenibile da quel canale pubblico — è così che eFarma ha progettato la
    propria integrazione, spiega perché nel progetto originale scadeva periodicamente. **Deciso di
    non tenerla**: avrebbe richiesto rigenerarla a mano ogni giorno o due.
  - **Seken (Farmacia Uno)**: non è una chiave "pubblica per design" come Algolia, è un servizio
    SaaS a pagamento senza equivalente self-service — mai recuperata. **Deciso di non inseguirla**.
- **eFarma e Farmacia Uno rimosse** (2026-07-10): per i motivi sopra, tolte da `scrapers[]` in
  `farma-search/index.ts` (funzioni `scrapeEfarma`/`scrapeFarmaciaUno` e le relative costanti
  `EFARMA_ALGOLIA_KEY`/`SEKEN_API_KEY` eliminate), edge function ridistribuita, righe rimosse dal
  DB live e da `seed.sql`. Secret `EFARMA_ALGOLIA_KEY` rimosso (`SEKEN_API_KEY` non era mai stato
  impostato). Verificato con una chiamata reale alla function: `pharmacies_scraped: 8`, risultati
  regolari. **8 farmacie finali, tutte a manutenzione zero.**
- Il dump conteneva anche due farmacie **orfane**, "Farmacia Loreto" e "Dr. Max": righe presenti
  nel DB ma senza alcun corrispondente in `scrapers[]` dentro `farma-search/index.ts` — sorgenti
  di un'iterazione precedente, mai rimosse dal DB. Escluse dal nuovo `seed.sql`, nessun impatto.
- `pharmacies` ha ricevuto più insert nel tempo per la stessa farmacia (con `search_url_template`
  diverso man mano che lo scraper veniva raffinato) — niente UNIQUE su `name`, quindi
  `pharmacyIdMap` nell'edge function (senza `ORDER BY`) finisce per usare l'ultima riga inserita
  per ciascun nome. `seed.sql` contiene solo quella riga "attiva" per ognuna delle 10 farmacie.
- **GitHub Pages è hosting statico puro, senza rewrite lato server**: aprire un URL profondo
  (`/cerca/paracetamolo`) direttamente darebbe 404 senza il redirect trick di `404.html`. Ha anche
  una conseguenza sulla sequenza di verifica: con `public/CNAME` presente, il dominio custom viene
  associato al repo fin dal primo deploy, quindi non c'è un URL di anteprima isolato come su
  Vercel — la verifica reale va fatta sul dominio `farmacompara.it` **dopo** aver spostato il DNS
  (passi 8 e 9 invertiti rispetto a un hosting con preview deployments).

## 0. Dump da Lovable — fatto ✓

Recuperato `~/Downloads/farmacompara_260709.backup` (pg_dump formato custom, compresso zstd).
Per leggerlo su questo Mac è servito un `pg_restore` più recente di quello di sistema (assente):
```bash
brew install libpq        # prima prova, senza supporto zstd — non basta
brew install postgresql@17  # pg_restore con zstd, in /opt/homebrew/Cellar/postgresql@17/*/bin
/opt/homebrew/Cellar/postgresql@17/*/bin/pg_restore --data-only --schema=public \
  --table=pharmacies -f pharmacies.sql ~/Downloads/farmacompara_260709.backup
```
I valori reali sono già in `supabase/seed.sql`. `products` (~1050 righe) e `search_cache`
(~55 righe) sono stati controllati ma **non** portati: pura cache, si rigenera da sola alla prima
ricerca post-migrazione.

I secret della Edge Function non erano nel dump, come atteso — vivono nel secret store delle Edge
Function, non nel database Postgres (`vault.secrets` esiste ma è cifrato con una chiave che resta
lato infrastruttura Supabase/Lovable, non recuperabile da un pg_dump).

## 1. Nuovo progetto Supabase — fatto ✓

Progetto creato: `seffjzfrekergzdwvhrb`. Collegato con:
```bash
npx supabase login --token <personal-access-token-da-supabase.com/dashboard/account/tokens>
npx supabase link --project-ref seffjzfrekergzdwvhrb
```

## 2. Applicare le migration — fatto ✓

```bash
npx supabase db push --linked
```
Tutte e 6 le migration applicate senza errori (schema identico a produzione: pharmacies, products,
search_cache con TTL 48h, rate_limits, RLS).

## 3. Seminare le farmacie — fatto ✓

```bash
npx supabase db query --linked --file supabase/seed.sql
```
Verificato con una query di lettura: le righe sono presenti con i valori attesi (10 inizialmente,
poi ridotte a 8 — vedi "Scoperte" sopra).

## 4. Deploy della Edge Function — fatto ✓

```bash
npx supabase functions deploy farma-search --use-api
```
(`--use-api` bundla server-side, evita di dover avere Docker installato per il bundling locale.)

## 5. Secrets della Edge Function — fatto ✓

```bash
npx supabase secrets set ADMIN_TOKEN=<generato, salvato al di fuori di questo repo>
npx supabase secrets set FARMACIE_1000_ALGOLIA_KEY=<recuperata dal traffico di rete pubblico>
```
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/anon key sono automatici. `EFARMA_ALGOLIA_KEY` e
`SEKEN_API_KEY` non servono più — le farmacie corrispondenti sono state rimosse (vedi "Scoperte").

## 6. Env var frontend — fatto ✓

`.env` locale aggiornato con `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY` del nuovo progetto (chiave in formato nuovo `sb_publishable_...`).
Le stesse tre vanno replicate come **secret di GitHub Actions** al passo 7 (Settings → Secrets and
variables → Actions sul repo, non env var Vercel).

## 7. Deploy su GitHub Pages — file pronti, manca abilitare Pages + push

Preparato in questo repo:
- `public/404.html` + script inline in `index.html`: redirect trick per le route client-side.
- `public/CNAME` con `farmacompara.it`.
- `.github/workflows/deploy-pages.yml`: build (`npm ci && npm run build`) e deploy automatico
  ad ogni push su `main`, via le action ufficiali `actions/upload-pages-artifact` +
  `actions/deploy-pages`.

Passi manuali che restano (serve il tuo repo GitHub, non posso farli da qui):
1. Settings → Secrets and variables → Actions → aggiungi `VITE_SUPABASE_PROJECT_ID`,
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (valori dal passo 6).
2. Settings → Pages → Source: **GitHub Actions** (non "Deploy from a branch").
3. Push su `main` (o Actions → "Deploy to GitHub Pages" → Run workflow manualmente).

## 8. Dominio

Il file `public/CNAME` già associa `farmacompara.it` al repo al primo deploy. Aggiorna i record
DNS presso il tuo registrar (attualmente puntano a Lovable) verso GitHub Pages: un record `A` per
l'apex verso gli IP di GitHub Pages, o un `CNAME` se usi un sottodominio — istruzioni precise in
Settings → Pages una volta che la sezione "Custom domain" è attiva.

## 9. Verifica dopo il cutover DNS

A differenza di Vercel, GitHub Pages con un `CNAME` presente non offre un URL di anteprima isolato
prima di spostare il DNS — la verifica va fatta direttamente su `farmacompara.it` una volta che il
DNS ha propagato (i vecchi resolver continueranno a servire Lovable per un po', è normale):
- Cerca "paracetamolo": prima ricerca più lenta (scraping live), seconda istantanea (cache hit).
- Un URL profondo diretto, es. `farmacompara.it/cerca/ibuprofene` da una tab nuova (non navigato
  dal sito) — deve funzionare grazie al redirect trick, non dare 404.
- Verifica risultati da farmacie non-Shopify (Guacci, Del Corso, Igea, Gaudiana).
- Raffica di richieste dallo stesso IP → deve arrivare un 429 con header `Retry-After`.
- `/principi-attivi`, una pagina `/prodotto/:active/:slug`, link "Vai" con UTM.
- `GET /functions/v1/farma-search?clear_cache=all` con `Authorization: Bearer <ADMIN_TOKEN>`.

Il backend è già verificato a livello di edge function (chiamata diretta, `pharmacies_scraped: 8`,
risultati regolari) — questo passo copre solo il frontend + l'integrazione end-to-end.

## 10. Cutover

Solo dopo la verifica: disattiva Lovable (hosting e progetto Supabase gestito da loro).
