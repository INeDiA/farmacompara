

# Protezione endpoint `clear_cache=all`

## Approccio
Usare un **secret condiviso** (un token admin) salvato come secret nella Edge Function e passato dal frontend come header. Solo chi conosce il token può svuotare la cache.

## Modifiche

### 1. Aggiungere un secret `ADMIN_TOKEN`
- Generare un token casuale (es. UUID) e salvarlo con il tool `add_secret`
- La Edge Function lo legge da `Deno.env.get("ADMIN_TOKEN")`

### 2. `supabase/functions/farma-search/index.ts`
- All'inizio del handler, se `clear_cache=all` è presente:
  - Verificare l'header `Authorization: Bearer <ADMIN_TOKEN>`
  - Se il token non corrisponde → risposta 403
  - Se corrisponde → eseguire DELETE su `search_cache` e `products`, restituire conferma

### 3. `src/pages/Index.tsx`
- Bottone fisso in basso a destra, visibile solo su `lovable.app`
- Al click, chiama la Edge Function con `?clear_cache=all` e header `Authorization: Bearer <token>`
- Il token è hardcoded nel frontend (accettabile perché il bottone è visibile solo in preview e il token protegge comunque l'endpoint in produzione)
- Toast di conferma/errore

### Alternativa più sicura (senza token nel frontend)
Invece di hardcodare il token, il bottone può chiedere all'utente di inserire il token in un prompt. Così anche se qualcuno ispeziona il JS della preview, non trova il token.

## Raccomandazione
Uso il **prompt di input** al primo click: il bottone chiede il token admin, lo salva in sessionStorage per la sessione corrente. Più sicuro senza complicare l'UX.

