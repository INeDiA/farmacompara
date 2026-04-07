

# Modifiche a FarmaCompare

## Problema 1: Unità di misura inconsistente
Attualmente `formatPricePerMg` mostra €/mg o €/g a seconda del valore, rendendo il confronto visivo difficile. Fisseremo l'unità a **€/g** (prezzo al grammo) per tutti i prodotti.

## Problema 2: Suggerimenti con nomi commerciali
I suggerimenti attuali includono "Tachipirina", "Aspirina", "Moment", "OKi" che sono marchi. Verranno sostituiti con soli principi attivi.

---

## Modifiche

### 1. `src/components/ResultsTable.tsx`
- Cambiare `formatPricePerMg` per convertire sempre in €/g: `price_per_mg * 1000` e mostrare sempre `€X.XXXX/g`
- Aggiornare le intestazioni da "€/mg" a "€/g"

### 2. `src/components/SearchBar.tsx`
- Sostituire l'array `suggestions` con soli principi attivi:
  `["Paracetamolo", "Ibuprofene", "Ketoprofene", "Acido acetilsalicilico", "Diclofenac", "Nimesulide"]`

### 3. Edge Function `farma-search`
- Il campo `price_per_mg` nel database resta invariato (è il dato grezzo). La conversione in €/g avviene solo nel frontend per la visualizzazione.

