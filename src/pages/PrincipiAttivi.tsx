import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Pill } from "lucide-react";
import { ALL_PRINCIPI_ATTIVI, toSlug } from "@/lib/principiAttivi";

const PrincipiAttivi = () => {
  useEffect(() => {
    document.title = "Tutti i principi attivi — Confronta prezzi | FarmaCompara";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "Elenco completo dei principi attivi disponibili su FarmaCompara. Confronta il prezzo per grammo tra farmacie online italiane.");
    }
    return () => { document.title = "FarmaCompara — Confronta i prezzi dei farmaci online in Italia"; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Pill className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">FarmaCompara</h1>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Tutti i principi attivi</h2>
            <p className="text-muted-foreground">
              Confronta il costo per grammo di principio attivo tra diverse farmacie online italiane.
              Seleziona un principio attivo per vedere i prezzi.
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
        <div className="container mx-auto px-4 py-6 text-center text-xs text-muted-foreground space-y-1">
          <p>FarmaCompara — confronto prezzi farmaci online italiani</p>
          <p>I prezzi mostrati sono indicativi e aggiornati ogni 48 ore.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrincipiAttivi;
