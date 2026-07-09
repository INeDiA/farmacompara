# Migrazione da Lovable a Vercel + Supabase indipendente

Checklist operativa per uscire da Lovable Hosting / Lovable Cloud. Riferimento pieno: piano in
`~/.claude/plans/analizza-il-sito-farmacompara-it-hashed-umbrella.md`. Qui solo i comandi e le
scoperte concrete emerse durante la preparazione.

Fatto finora in questo repo locale (`~/Sites/farmacompara`):
- `.env` rimosso dal tracking git (restava un anon key pubblico ma è comunque igiene da fare),
  aggiunto a `.gitignore`, creato `.env.example` come riferimento.
- `supabase/seed.sql` con i dati delle 10 farmacie (righe non presenti in nessuna migration
  esistente — vedi sotto per quali valori sono confermati e quali no).
- Supabase CLI installata come devDependency (`npx supabase ...`).

Nessuna di queste modifiche è stata ancora **committata/pushata** su GitHub — sono solo locali,
in attesa di conferma.

## Scoperte utili durante la preparazione

- **Farmaeurope è defunto come fonte separata**: `farmaeurope.eu` oggi reindirizza a `farmae.it`
  (i due brand si sono fusi). Lo scraper `scrapeFarmaeurope` in `farma-search/index.ts` punta
  ancora al vecchio endpoint `searchautocomplete/ajax/suggest` — quasi certamente non restituisce
  più nulla di utile e duplica (nella migliore delle ipotesi) risultati già coperti da Farmae.
  Valutare se rimuoverlo dalla lista `scrapers[]` o lasciarlo com'è (fallisce in modo silenzioso,
  non rompe nulla, solo spreca una chiamata HTTP ad ogni ricerca).
- **eFarma**: spedizione standard (corriere GLS) €5,00, gratuita da €29,90 — confermato dalla loro
  pagina di supporto ufficiale. Già nel seed.
- Per **1000Farmacie, Farmacia Gaudiana, Farmacia Uno** non ho trovato in pochi minuti una pagina
  con costo di spedizione esplicito (Gaudiana e 1000Farmacie rimandano a T&C generiche prive di
  cifre chiare in home). Nel seed sono a `0 / null` come placeholder — vanno verificati a mano
  (checkout con un carrello di prova basta) prima di andare in produzione, altrimenti il
  confronto "Totale con spedizione" per quelle farmacie sarà silenziosamente sbagliato.
- La chiave `EFARMA_ALGOLIA_KEY` secondo `.lovable/plan.md` scadeva "~marzo 2026": oggi (luglio
  2026) è quasi certamente scaduta, quindi lo scraper eFarma probabilmente già non funziona in
  produzione. Da rigenerare comunque.

## 0. Prima di lasciare Lovable: prova a farti dare un dump

Chiedi (in chat a Lovable, finché hai crediti) di eseguire ed esportarti:
```sql
select * from public.pharmacies;
```
Se i valori differiscono da quelli in `supabase/seed.sql`, usa quelli reali (sono la fonte di
verità, più affidabile della mia verifica manuale sui siti). Prova anche a chiedere se i secret
della Edge Function sono visibili da qualche pannello — se non lo sono (probabile: molte
piattaforme li trattano write-only), non è bloccante, si rigenerano al passo 5.

## 1. Nuovo progetto Supabase

Vai su https://supabase.com/dashboard, crea un progetto nuovo (free tier), annota project ref,
URL, anon key.

```bash
cd ~/Sites/farmacompara
npx supabase login
npx supabase link --project-ref <NUOVO_PROJECT_REF>
```

## 2. Applicare le migration esistenti

```bash
npx supabase db push
```
Questo applica in ordine le 6 migration già in `supabase/migrations/` (schema identico a
produzione: pharmacies, products, search_cache con TTL 48h, rate_limits, RLS).

## 3. Seminare le farmacie

Dopo aver eventualmente corretto `supabase/seed.sql` col dump del passo 0:
```bash
npx supabase db execute -f supabase/seed.sql
```
(oppure incollarlo nell'SQL editor della dashboard Supabase). Va eseguito **una sola volta** —
non c'è un vincolo UNIQUE su `pharmacies.name`, quindi rieseguirlo crea duplicati.

## 4. Deploy della Edge Function

```bash
npx supabase functions deploy farma-search
```

## 5. Secrets della Edge Function

```bash
npx supabase secrets set EFARMA_ALGOLIA_KEY=<...>
npx supabase secrets set FARMACIE_1000_ALGOLIA_KEY=<...>
npx supabase secrets set SEKEN_API_KEY=<...>
npx supabase secrets set ADMIN_TOKEN=<genera-una-stringa-random-tua>
```
`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` sono automatici, non serve impostarli.

Se non recuperi le chiavi Algolia da Lovable: sono chiavi "search-only" pensate per uso
client-side, spesso visibili ispezionando le richieste di rete che il sito del partner
(efarma.com, 1000farmacie.it) fa verso `*.algolia.net` dalla propria pagina di ricerca pubblica.
Per Seken (Farmacia Uno) serve invece richiederla direttamente al servizio.

## 6. Env var frontend

Aggiorna il tuo `.env` locale (mai committato) e le env var del progetto Vercel (passo 7) con
`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` del nuovo progetto.

## 7. Deploy su Vercel

Dashboard → New Project → importa `INeDiA/farmacompara` da GitHub. Framework preset: Vite.
Build command: `npm run build`. Output directory: `dist`. Aggiungi le due env var del passo 6
nelle impostazioni del progetto Vercel (Production + Preview).

## 8. Dominio

Nel progetto Vercel: Settings → Domains → aggiungi `farmacompara.it`, segui le istruzioni per
aggiornare i record DNS presso il tuo registrar (attualmente puntano a Lovable).

## 9. Verifica prima del cutover

Sull'URL di preview Vercel (puntato al nuovo Supabase):
- Cerca "paracetamolo": prima ricerca più lenta (scraping live), seconda istantanea (cache hit).
- Verifica risultati da farmacie non-Shopify (Guacci, Del Corso, Igea, Gaudiana).
- Raffica di richieste dallo stesso IP → deve arrivare un 429 con header `Retry-After`.
- `/principi-attivi`, una pagina `/prodotto/:active/:slug`, link "Vai" con UTM.
- `GET /functions/v1/farma-search?clear_cache=all` con `Authorization: Bearer <ADMIN_TOKEN>`.

## 10. Cutover

Solo dopo la verifica: sposta il DNS di produzione su Vercel, poi disattiva Lovable.
