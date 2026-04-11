

## Piano rivisto: Ricalibrazione keyword SEO — senza "€/g"

Nessun motivo strategico per "€/g" nei testi SEO: non è un termine di ricerca. Manteniamo "€/g" solo nella tabella risultati (UI compatta), rimuovendolo da tutti i testi marketing e metadati.

### 1. `index.html` — Meta statici e JSON-LD

- **Title**: `"FarmaCompara — Prezzo al grammo di principio attivo tra farmacie online"`
- **Meta description**: `"Confronta il costo al grammo di principio attivo tra farmacie online italiane. Stessa molecola, confezioni diverse: scopri quale conviene davvero."`
- Allineare `og:title`, `og:description`, `twitter:title`, `twitter:description`
- JSON-LD WebSite `description`: `"Confronta il costo al grammo di principio attivo tra farmacie online italiane"`

### 2. `src/pages/Index.tsx` — Copy homepage

- **Sottotitolo**: `"Confronta il costo al grammo di principio attivo tra farmacie online. Stessa molecola, confezioni diverse: scopri quale conviene davvero."`
- **Card "Prezzo/g"**: `"Confronto basato sul costo per grammo di principio attivo, non sul prezzo della confezione"`
- **Card "Farmacie online"**: `"Risultati da farmacie online autorizzate che spediscono in tutta Italia"`
- **Footer** (tutte le pagine): `"FarmaCompara — confronto prezzi al grammo di principio attivo tra farmacie online italiane"`

### 3. `src/pages/Search.tsx` — Meta dinamici, H1, sottotitolo

- **Title**: `"{Principio}: prezzo al grammo tra farmacie online | FarmaCompara"`
- **Meta desc**: `"Quanto costa {Principio} al grammo di principio attivo? Confronta il costo normalizzato tra farmacie online italiane e trova la confezione più conveniente."`
- **H1**: `"{Principio}: prezzo al grammo di principio attivo"`
- **Sottotitolo**: `"Confronta il costo normalizzato per grammo di {Principio} tra farmacie online italiane. Stessa molecola, confezioni diverse: trova quella che conviene."`
- **Cleanup return**: allineare ai nuovi valori homepage

### 4. `src/pages/PrincipiAttivi.tsx`

- **Title**: `"Principi attivi — Prezzo al grammo tra farmacie online | FarmaCompara"`
- **Meta desc**: `"Elenco completo dei principi attivi. Confronta il costo al grammo di ogni molecola tra farmacie online italiane."`
- **Sottotitolo**: `"Confronta il costo al grammo di principio attivo tra farmacie online italiane. Seleziona una molecola per vedere i prezzi."`

### 5. `src/pages/NotFound.tsx` — Verifica coerenza testi

### Cosa NON cambia

- `ResultsTable.tsx`: "€/g" resta come etichetta colonna nella tabella (notazione compatta appropriata per UI tabellare)
- Layout, design, logica applicativa: invariati

5 file, solo testi e meta tag.

