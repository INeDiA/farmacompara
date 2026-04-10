

## Piano: Ottimizzazione H1, Title e Meta Description

### Problemi attuali

| Pagina | Elemento | Valore attuale | Caratteri | Problema |
|--------|----------|---------------|-----------|----------|
| Homepage | H1 | "FarmaCompara" | 13 | Troppo corto (min 20) |
| Homepage | Title | "FarmaCompara — Confronta i prezzi dei farmaci online in Italia" | 60 | OK |
| Homepage | Meta Desc | "Confronta il costo reale dei farmaci tra diverse farmacie online, scopri il più conveniente!" | 92 | Troppo corta (min 120) |
| /cerca/X | Title | "Paracetamolo: confronta prezzi tra farmacie online \| FarmaCompara" | 66 | Leggermente lungo |
| /cerca/X | Meta Desc | "Confronta il prezzo per grammo di Paracetamolo tra diverse farmacie online italiane. Trova la confezione più conveniente." | 120 | OK (borderline) |
| /principi-attivi | Title | "Confronta prezzi farmaci — Tutti i principi attivi \| FarmaCompara" | 66 | Leggermente lungo |
| /principi-attivi | Meta Desc | "Elenco completo dei principi attivi disponibili su FarmaCompara. Confronta il prezzo per grammo tra farmacie online italiane." | 124 | OK |

### Valori proposti

**1. Homepage (`index.html` + `src/pages/Index.tsx`)**

- **H1** (attualmente nel header): da "FarmaCompara" a **"FarmaCompara — Confronto prezzi farmaci"** (40 car.)
  - L'H1 viene spostato semanticamente: il tag nel header diventa un semplice logo text, e l'H1 viene assegnato al titolo hero "Quanto costa davvero il tuo farmaco?" che ha gia 39 caratteri e supera i 20.
  - Alternativa: mantenere il layout attuale ma cambiare il tag `<h1>` nell'header in uno `<span>` e rendere l'`<h2>` hero il vero `<h1>`.
- **Title**: invariato (60 car., perfetto)
- **Meta Desc**: da 92 a ~145 car.: **"Confronta il costo reale dei farmaci tra diverse farmacie online italiane. Prezzo normalizzato per grammo di principio attivo, spedizione inclusa nel confronto."** (155 car.)
- **OG/Twitter desc**: stessa meta description

**2. Pagina di ricerca (`src/pages/Search.tsx`)**

- **Title**: accorciato a ~58 car. per "Paracetamolo": **"Paracetamolo: confronta prezzi farmacie online | FarmaCompara"** (61 car. — variabile in base al principio attivo)
- **Meta Desc**: allungata a ~140 car.: **"Confronta il prezzo di Paracetamolo tra diverse farmacie online italiane. Trova la confezione più conveniente e risparmia sul tuo acquisto."** (142 car.)
- **H1**: gia aggiornato a ~60 car., OK

**3. Pagina principi attivi (`src/pages/PrincipiAttivi.tsx`)**

- **Title**: accorciato: **"Tutti i principi attivi — Confronta prezzi | FarmaCompara"** (58 car.)
- **Meta Desc**: OK (124 car., nel range)

### Modifiche tecniche

**`src/pages/Index.tsx`**
- Cambiare `<h1>` nel header in `<span>` (logo)
- Cambiare `<h2>` hero in `<h1>` (diventa il vero H1 della pagina, 39 car.)

**`index.html`**
- Aggiornare meta description e og:description / twitter:description alla versione piu lunga (155 car.)

**`src/pages/Search.tsx`**
- Aggiornare `pageTitle` template
- Aggiornare `pageDesc` template per arrivare a ~140 car.
- Aggiornare cleanup `homeDesc` alla nuova meta description homepage

**`src/pages/PrincipiAttivi.tsx`**
- Aggiornare `document.title`

**`src/pages/Search.tsx` e `PrincipiAttivi.tsx`** (header condiviso)
- Cambiare `<h1>` nel header in `<span>` per coerenza (ogni pagina ha il suo H1 semantico altrove)

### Riepilogo finale

| Pagina | Title (car.) | H1 (car.) | Meta Desc (car.) |
|--------|-------------|-----------|-----------------|
| Homepage | 60 | 39 ("Quanto costa davvero il tuo farmaco?") | 155 |
| /cerca/paracetamolo | ~61 | ~60 | ~142 |
| /principi-attivi | 58 | 24 ("Tutti i principi attivi") | 124 |

Tutti entro i parametri SEO ottimali. 4 file modificati, nessun file nuovo.

