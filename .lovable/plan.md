

# Fix race condition nel rate limiter

## Problema trovato
Il rate limiter attuale ha una **race condition**: il conteggio e l'insert non sono atomici. Se 100 richieste arrivano nello stesso istante, tutte leggono "0 richieste precedenti" e passano tutte prima che qualsiasi blocco scatti.

## Soluzione
Invertire l'ordine: **prima inserire** la riga in `rate_limits`, **poi contare**. Così anche richieste simultanee vedranno il conteggio crescere. Inoltre, spostare il check del rate limit **prima dello scraping**, così le richieste bloccate non consumano risorse.

### Modifiche in `supabase/functions/farma-search/index.ts`

Nella funzione `checkRateLimit`:

1. **Prima** inserire la riga (`INSERT` con IP + timestamp)
2. **Poi** contare le richieste nell'ultimo minuto e nell'ultima ora
3. Se il conteggio supera le soglie → inserire il `blocked_until` e restituire `blocked: true`

Questo ordine garantisce che richieste concorrenti vedano i reciproci insert e il conteggio sia realistico.

### Nessuna altra modifica
- Il frontend gestisce già il 429
- La tabella `rate_limits` ha già la struttura corretta

