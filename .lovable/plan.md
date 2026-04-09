

# Miglioramento parsing dosaggio e quantità

## Problemi identificati

| Problema | Esempio | Causa |
|----------|---------|-------|
| Quantità non riconosciuta da nomi troncati | `PARACETAMOLO 500mg 20 Com..` | Il regex non gestisce abbreviazioni OpenCart (`Com..`, `Cer.Med`, `Cp.`) |
| Dosaggio assente nei nomi commerciali | `VoltadvanceGo Diclofenac 20 Capsule` | Farmae/Amicafarmacia omettono i mg dal titolo |
| Prodotti topici (gel/spray/unguenti) | `Voltaren Emulgel 2% 100g` | Dosaggio espresso come % + volume, non come mg + unità |
| Dosaggio errato per i topici | `DICLOFENAC Gel 1% 50g` → 50.000mg | Il regex `\d+g` cattura il peso del tubo come dosaggio |

## Piano di intervento

### 1. Ampliare i pattern di quantità in `extractQuantity`
Aggiungere abbreviazioni troncate comuni:
- `Com..`, `Cpr`, `Cp.`, `Cp`, `Cap`, `Caps`, `Bust.`, `Cer.Med`, `Fl`, `Supp`
- Pattern numerico prima di abbreviazione: `20Com..` → 20, `5Cer.Med` → 5

### 2. Gestire prodotti topici (gel, creme, spray, unguenti)
Nuova logica: se il nome contiene `gel|crema|spray|unguento|schiuma|emulgel|cerotto`:
- Estrarre la **percentuale** (`2%`, `1%`, `0,16%`)
- Estrarre il **peso/volume** (`100g`, `50ml`, `15ml`)
- Calcolare: principio attivo = percentuale × peso (es. 2% × 100g = 2g = 2000mg)
- Per i cerotti: estrarre mg per cerotto e numero di cerotti

### 3. Migliorare `extractDosageMg` per evitare falsi positivi
- Se il prodotto è un topico, **non** catturare il peso del tubo come dosaggio
- Dare priorità al pattern "percentuale + peso" rispetto al pattern "Xg" generico

### 4. Nessuna modifica al frontend o al database
I campi `dosage_mg`, `quantity`, `total_mg`, `price_per_mg` restano gli stessi — migliora solo la qualità del parsing nella Edge Function.

## File modificato
- `supabase/functions/farma-search/index.ts`: funzioni `extractDosageMg`, `extractQuantity`, e nuova funzione `extractTopicalDosage`

## Impatto stimato
Con queste modifiche, la maggior parte dei prodotti orali troncati e dei prodotti topici dovrebbe ottenere un `price_per_mg` valido, riducendo significativamente i risultati senza costo al grammo.

