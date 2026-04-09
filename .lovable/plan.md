

## Piano: Escludere i parametri UTM per Farmacia Guacci

### Problema
Gli URL di Farmacia Guacci (basati su OpenCart) non gestiscono bene i parametri UTM aggiunti in coda, causando problemi di navigazione.

### Soluzione

**File: `src/components/ResultsTable.tsx`**

Modificare la funzione `addUtmParams` per escludere gli URL che contengono `farmaciaguacci.it`, restituendo l'URL originale senza modifiche:

```typescript
function addUtmParams(url: string, activeIngredient: string): string {
  // Guacci non gestisce bene parametri extra
  if (url.includes("farmaciaguacci.it")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}utm_source=farmacompara&utm_medium=referral&utm_campaign=confronto_prezzi&utm_content=${encodeURIComponent(activeIngredient)}`;
}
```

Una sola riga aggiunta, nessun altro file modificato.

