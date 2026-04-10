

## Placeholder troncato su mobile

Il placeholder "Cerca principio attivo o farmaco..." è troppo lungo per lo spazio disponibile su mobile (390px) perché il bottone "Cerca" occupa parte dell'input.

### Opzioni

1. **Accorciare il placeholder**: usare "Cerca farmaco o principio attivo..." → comunque lungo. Meglio: **"Cerca farmaco..."** su mobile, testo completo su desktop.
2. **Placeholder responsive**: non è possibile con un semplice attributo HTML, ma si può usare il hook `useIsMobile()` già presente nel progetto per scegliere il testo.

### Soluzione proposta

In `SearchBar.tsx`, usare `useIsMobile()` per impostare:
- **Mobile**: `"Cerca farmaco..."`
- **Desktop**: `"Cerca principio attivo o farmaco..."`

### File da modificare

| File | Modifica |
|------|----------|
| `src/components/SearchBar.tsx` | Import `useIsMobile`, placeholder condizionale |

Una modifica di 3 righe.

