

## Piano SEO: URL indicizzabili e strategia di posizionamento

### Problema attuale
FarmaCompara è una SPA con un'unica route (`/`). I motori di ricerca non possono indicizzare le ricerche perché non esistono URL dedicati. I suggerimenti in homepage sono semplici bottoni JavaScript senza link navigabili.

### Soluzione

#### 1. Route `/cerca/:principioAttivo` — pagine indicizzabili

Creare una nuova route dinamica che rappresenti una ricerca. Esempio: `/cerca/paracetamolo`, `/cerca/ibuprofene`.

- **`src/pages/Search.tsx`**: nuova pagina che legge il parametro dall'URL, lancia automaticamente la ricerca, e mostra i risultati. Include `<title>` e `<meta description>` dinamici tramite `document.title` (o react-helmet-async se necessario).
- **`src/App.tsx`**: aggiungere `<Route path="/cerca/:query" element={<Search />} />`.
- **`src/pages/Index.tsx`**: la homepage continua a funzionare come ora, ma i suggerimenti diventano `<Link to="/cerca/paracetamolo">` anziché bottoni con `onClick`. La form di ricerca usa `navigate()` per redirigere a `/cerca/query`.

#### 2. Suggerimenti in homepage come link reali

Sostituire i 6 suggerimenti attuali con gli **8 principi attivi più ricercati** (scelti strategicamente per volume di ricerca), resi come `<Link>` con URL semantici:

```
Paracetamolo, Ibuprofene, Diclofenac, Ketoprofene,
Acido acetilsalicilico, Nimesulide, Omeprazolo, Amoxicillina
```

Ogni bottone sarà un `<Link to="/cerca/paracetamolo">` — un vero anchor tag navigabile e indicizzabile dai crawler.

#### 3. Pagina sitemap statica con i 50 principi attivi più cercati

- **`src/pages/PrincipiAttivi.tsx`**: pagina accessibile da `/principi-attivi` che elenca ~50 principi attivi con link a `/cerca/{nome}`. Ogni link è un vero anchor tag. Titolo SEO: "Confronta prezzi farmaci — Tutti i principi attivi".
- Aggiungere un link a questa pagina nel **footer** ("Tutti i principi attivi").
- Aggiornare **`public/sitemap.xml`** con tutti i 50+ URL statici.

#### 4. Miglioramenti SEO tecnici aggiuntivi

- **`public/sitemap.xml`**: generare un sitemap con homepage + `/principi-attivi` + tutti i 50 URL `/cerca/...`.
- **`public/robots.txt`**: aggiungere riferimento al sitemap (`Sitemap: https://farmacompara.lovable.app/sitemap.xml`).
- **`index.html`**: aggiungere tag `<link rel="canonical">` e structured data JSON-LD (`WebSite` con `SearchAction`).
- **Meta tag dinamici**: nella pagina Search, aggiornare `document.title` e la meta description in base al principio attivo cercato (es. "Paracetamolo — Confronta prezzi farmaci online | FarmaCompara").

### File da creare/modificare

| File | Azione |
|------|--------|
| `src/pages/Search.tsx` | Nuovo — pagina ricerca con URL indicizzabile |
| `src/pages/PrincipiAttivi.tsx` | Nuovo — elenco 50 principi attivi |
| `src/App.tsx` | Aggiungere 2 route |
| `src/pages/Index.tsx` | Suggerimenti come `<Link>`, form redirige a `/cerca/...` |
| `src/components/SearchBar.tsx` | Accettare callback navigate, suggerimenti come link |
| `public/sitemap.xml` | Nuovo — sitemap statico |
| `public/robots.txt` | Aggiungere riga Sitemap |
| `index.html` | Canonical + JSON-LD SearchAction |

### Lista 50 principi attivi (per sitemap e pagina elenco)

Paracetamolo, Ibuprofene, Diclofenac, Ketoprofene, Nimesulide, Acido acetilsalicilico, Omeprazolo, Amoxicillina, Pantoprazolo, Lansoprazolo, Desloratadina, Cetirizina, Loratadina, Fluconazolo, Azitromicina, Claritromicina, Metformina, Atorvastatina, Simvastatina, Ramipril, Amlodipina, Bisoprololo, Furosemide, Levotiroxina, Prednisone, Desametasone, Betametasone, Ciprofloxacina, Levofloxacina, Metoclopramide, Domperidone, Ranitidina, Acido folico, Ferro solfato, Calcio carbonato, Vitamina D3, Magnesio, Melatonina, Tachipirina (paracetamolo), Naprossene, Piroxicam, Meloxicam, Aceclofenac, Diosmina, Escina, Bromelina, Glucosamina, Condroitina, Acido ialuronico, N-acetilcisteina.

### Note tecniche

- Essendo una SPA React senza SSR, i meta tag dinamici funzionano per i browser ma non per i crawler di base. Tuttavia, Google renderizza JavaScript e leggerà i contenuti. Per un boost ulteriore si potrebbe valutare prerendering in futuro, ma non è necessario ora.
- Gli URL `/cerca/...` caricheranno i dati dalla stessa edge function già esistente, quindi nessuna modifica backend.

