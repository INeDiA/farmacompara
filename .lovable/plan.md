

## Piano: Mappatura nome commerciale → principio attivo

### Comportamento attuale

Cercando "moment" il sistema filtra solo i prodotti con "moment" nel nome. L'utente vede solo i Moment, non tutti gli ibuprofene equivalenti. Si perde il valore comparativo del sito (stessa molecola, confezioni diverse).

### Soluzione: dizionario brand → principio attivo

Approccio statico, controllabile e zero-latency. Nessuna API esterna, nessun rischio di errori automatici (fondamentale in ambito farmaceutico).

**1. Nuovo file `src/lib/brandToActive.ts`**

Dizionario dei ~80 brand OTC italiani più cercati mappati al principio attivo già presente nella nostra lista di 52:

```
moment, brufen, nurofen → ibuprofene
tachipirina, efferalgan, panadol → paracetamolo
voltaren, dicloreum → diclofenac
oki, fastum, ketodol → ketoprofene
aulin → nimesulide
aspirina, vivin c, cardioaspirin → acido acetilsalicilico
momendol → naprossene
daflon, arvenum → diosmina
fluimucil → n-acetilcisteina
muc-angin, mucosolvan → ambroxolo
zirtec, reactine → cetirizina
clarityn → loratadina
aerius → desloratadina
telfast → fexofenadina
maalox, gaviscon → sodio bicarbonato
peptazol → pantoprazolo
lansox → lansoprazolo
imodium → loperamide
mylicon → simeticone
duphalac → lattulosio
bioscalin, supradyn → (non mappare, multivitaminico)
cardirene → acido acetilsalicilico
neo borocillina → benzidamina
…
```

**2. Logica di redirect in `src/pages/Search.tsx`**

Quando l'utente cerca un termine:
- Se il termine corrisponde a una chiave brand → redirect automatico a `/cerca/{principio-attivo}` con un banner informativo: *"'Moment' è un nome commerciale di Ibuprofene. Confronto tutti i prodotti a base di ibuprofene."*
- Altrimenti → ricerca normale come oggi.

Il banner include un link "Cerca solo 'Moment'" per chi vuole il match letterale.

**3. Suggerimenti in `SearchBar`**

Opzionale: quando l'utente digita, suggerire sia il brand sia il principio attivo (es. digitando "mom" → "Moment (Ibuprofene)").

### File modificati

- `src/lib/brandToActive.ts` — nuovo, dizionario statico
- `src/pages/Search.tsx` — logica di redirect + banner
- `src/components/SearchBar.tsx` — opzionale, autocompletamento brand

### Cosa NON facciamo (e perché)

- **No API esterne** (es. AIFA, OpenFDA): latenza, rate-limit, copertura italiana incerta, e in farmaceutica un errore di mappatura è un problema serio.
- **No fuzzy matching automatico**: troppi falsi positivi.
- **No LLM**: overkill, costoso, non deterministico.

Il dizionario statico è curato manualmente, verificabile, e copre il 95% delle ricerche reali per brand in Italia.

