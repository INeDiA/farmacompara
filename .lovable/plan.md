

## Piano: OG dinamici + Breadcrumb JSON-LD + PWA installabile

### 1. Open Graph dinamici per /cerca/

**File: `src/pages/Search.tsx`**

Nell'`useEffect` esistente che gestisce title/meta/canonical (righe 18-40), aggiungere l'aggiornamento dinamico dei meta tag OG e Twitter:

- `og:title` → "Paracetamolo: confronta prezzi | FarmaCompara"
- `og:description` → "Confronta il prezzo per grammo di Paracetamolo tra diverse farmacie online italiane."
- `og:url` → URL canonical della pagina
- `twitter:title` e `twitter:description` → stessi valori

Al cleanup, ripristinare i valori originali della homepage.

### 2. Breadcrumb JSON-LD strutturati

**File: `src/pages/Search.tsx`**

Aggiungere un secondo `useEffect` che inietta un blocco `<script type="application/ld+json">` con schema `BreadcrumbList`:

```
Home > Cerca > {Principio Attivo}
```

Tre livelli: homepage, pagina cerca, principio attivo corrente. Rimosso al cleanup.

### 3. PWA / App installabile (approccio leggero, senza service worker)

Dato che non serve supporto offline, usiamo solo un **web manifest** per rendere l'app installabile (Add to Home Screen):

**File: `public/manifest.json`** (nuovo)
- `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `theme_color`, `background_color`
- Array `icons` con icone 192x192 e 512x512

**File: `index.html`**
- Aggiungere `<link rel="manifest" href="/manifest.json">`
- Aggiungere `<meta name="theme-color" content="...">`
- Aggiungere tag Apple: `<meta name="apple-mobile-web-app-capable">`, `<link rel="apple-touch-icon">`

**File: `public/icon-192.png` e `public/icon-512.png`** (nuovi)
- Icone generate programmaticamente (SVG/canvas con il logo Pill + colore primario)

Nessun service worker, nessun `vite-plugin-pwa` — solo il manifest per l'installabilità. Funziona su Chrome/Edge Android (prompt "Aggiungi a schermata Home") e Safari iOS (Share > Aggiungi a Home).

### Riepilogo file

| File | Azione |
|------|--------|
| `src/pages/Search.tsx` | Aggiungere OG dinamici + Breadcrumb JSON-LD |
| `public/manifest.json` | Creare manifest PWA |
| `public/icon-192.png` | Creare icona 192x192 |
| `public/icon-512.png` | Creare icona 512x512 |
| `index.html` | Aggiungere link manifest + meta PWA |

### Impatto
- Zero dipendenze aggiuntive
- Nessun service worker (nessun problema con preview Lovable)
- Build time invariato

