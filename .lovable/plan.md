

## Piano: Titoli e H1 più lunghi (senza "prezzo al grammo")

### Modifiche

**1. `index.html`**
- `<title>`: "FarmaCompara — Confronta i prezzi dei farmaci online in Italia" (60 car.)
- `og:title` e `twitter:title`: stesso valore

**2. `src/pages/Search.tsx`**
- `pageTitle`: `"${capitalized}: confronta prezzi tra farmacie online | FarmaCompara"`
- H1: `"${capitalized}: confronta i prezzi tra farmacie online italiane"`
- Cleanup `document.title`: allineato al nuovo title homepage

**3. `src/pages/PrincipiAttivi.tsx`**
- Cleanup `document.title`: allineato al nuovo title homepage

### Riepilogo risultati

| Pagina | Title | H1 |
|--------|-------|-----|
| Homepage | "FarmaCompara — Confronta i prezzi dei farmaci online in Italia" (60 car.) | invariato |
| /cerca/paracetamolo | "Paracetamolo: confronta prezzi tra farmacie online \| FarmaCompara" (66 car.) | "Paracetamolo: confronta i prezzi tra farmacie online italiane" |
| /principi-attivi | invariato | invariato |

Nessun file nuovo, solo testi aggiornati in 3 file.

