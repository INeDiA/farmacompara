import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Pill } from "lucide-react";
import { ALL_PRINCIPI_ATTIVI, toSlug } from "@/lib/principiAttivi";

const PrincipiAttivi = () => {
  useEffect(() => {
    const pageTitle = "Principi attivi — prezzo al grammo | FarmaCompara";
    const pageDesc = "Elenco completo dei principi attivi. Confronta il costo al grammo di ogni molecola tra farmacie online italiane.";
    const pageUrl = "https://farmacompara.it/principi-attivi";

    document.title = pageTitle;

    const setMeta = (attr: string, value: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${value}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr.split("=")[0], value);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", pageDesc);
    setMeta("property", "og:title", pageTitle);
    setMeta("property", "og:description", pageDesc);
    setMeta("property", "og:url", pageUrl);
    setMeta("name", "twitter:title", pageTitle);
    setMeta("name", "twitter:description", pageDesc);

    // Self-referencing canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", pageUrl);

    // CollectionPage / ItemList JSON-LD
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": pageTitle,
      "url": pageUrl,
      "description": pageDesc,
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": ALL_PRINCIPI_ATTIVI.length,
        "itemListElement": ALL_PRINCIPI_ATTIVI.map((name, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "name": name,
          "url": `https://farmacompara.it/cerca/${toSlug(name)}`,
        })),
      },
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "principi-attivi-jsonld";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      document.title = "FarmaCompara — Confronto prezzi farmaci al grammo";
      const c = document.querySelector('link[rel="canonical"]');
      if (c) c.setAttribute("href", "https://farmacompara.it/");
      const homeName = "FarmaCompara — Confronto prezzi farmaci al grammo";
      const homeDesc = "Confronta il costo al grammo di principio attivo tra farmacie online italiane.";
      setMeta("property", "og:title", homeName);
      setMeta("property", "og:description", homeDesc);
      setMeta("property", "og:url", "https://farmacompara.it/");
      setMeta("name", "twitter:title", homeName);
      setMeta("name", "twitter:description", homeDesc);
      const el = document.getElementById("principi-attivi-jsonld");
      if (el) el.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Pill className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">FarmaCompara</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Tutti i principi attivi</h1>
            <p className="text-muted-foreground">
              Confronta il costo al grammo di principio attivo tra farmacie online italiane.
              Seleziona una molecola per vedere i prezzi.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {ALL_PRINCIPI_ATTIVI.sort((a, b) => a.localeCompare(b, "it")).map((name) => (
              <Link
                key={name}
                to={`/cerca/${toSlug(name)}`}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border bg-card hover:bg-primary hover:text-primary-foreground transition-colors text-sm font-medium"
              >
                <Pill className="h-4 w-4 shrink-0" />
                {name}
              </Link>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-xs text-muted-foreground space-y-2">
          <p>FarmaCompara — confronto prezzi al grammo di principio attivo tra farmacie online italiane</p>
          <p>I prezzi mostrati sono indicativi e aggiornati ogni 48 ore.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a href="https://www.iubenda.com/privacy-policy/98369577" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
            <span className="text-border">•</span>
            <a href="https://www.iubenda.com/privacy-policy/98369577/cookie-policy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              Cookie Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrincipiAttivi;
