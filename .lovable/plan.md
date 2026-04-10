

## Piano: Fix navigazione tra principi attivi

### Problema

Quando si clicca un suggerimento (es. da Ketoprofene a Ibuprofene), il parametro URL cambia ma la ricerca non parte. Il flag `hasSearched` resta `true` dalla ricerca precedente e blocca il `useEffect` di auto-search.

### Soluzione

**`src/pages/Search.tsx`** — una modifica:

Resettare `hasSearched` quando cambia `query`. Sostituire il `useEffect` di auto-search (righe 149-155) con una versione che reagisce direttamente al cambio di `query`:

```typescript
useEffect(() => {
  if (query) {
    search(query);
  }
}, [query]);
```

Rimuovere lo state `hasSearched` (non più necessario). Questo garantisce che ogni cambio di URL (e quindi di `query`) lanci una nuova ricerca.

Un file modificato, una logica semplificata.

