import { Pill, TrendingDown, Shield, Truck, Trash2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

const isPreview = typeof window !== "undefined" && (window.location.hostname.includes("lovable.dev") || window.location.hostname.includes("lovableproject.com"));

const Index = () => {
  const navigate = useNavigate();
  const [clearing, setClearing] = useState(false);

  const handleSearch = (query: string) => {
    navigate(`/cerca/${encodeURIComponent(query.toLowerCase())}`);
  };

  const handleClearCache = async () => {
    let token = sessionStorage.getItem("admin_token");
    if (!token) {
      token = prompt("Inserisci il token admin:");
      if (!token) return;
      sessionStorage.setItem("admin_token", token);
    }
    setClearing(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/farma-search?clear_cache=all`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Cache svuotata: ${data.deleted_cache} cache, ${data.deleted_products} prodotti eliminati`);
      } else {
        sessionStorage.removeItem("admin_token");
        toast.error(data.error || "Errore nella pulizia della cache");
      }
    } catch {
      toast.error("Errore di rete");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Pill className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">FarmaCompara</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-10 space-y-6">
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Quanto costa davvero
              <br />
              il tuo <span className="text-primary">farmaco</span>?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Confronta il costo per grammo di principio attivo tra diverse
              farmacie online. Stessa molecola, confezioni diverse: scopri
              quale conviene davvero.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border">
              <TrendingDown className="h-6 w-6 text-primary" />
              <p className="text-sm font-medium">Prezzo/g</p>
              <p className="text-xs text-muted-foreground text-center">
                Costo normalizzato per grammo di principio attivo
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border">
              <Truck className="h-6 w-6 text-primary" />
              <p className="text-sm font-medium">Spedizione</p>
              <p className="text-xs text-muted-foreground text-center">
                Costo di spedizione sempre visibile nel confronto
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border">
              <Shield className="h-6 w-6 text-primary" />
              <p className="text-sm font-medium">Farmacie online</p>
              <p className="text-xs text-muted-foreground text-center">
                Risultati da diverse farmacie online che spediscono in Italia
              </p>
            </div>
          </div>
        </div>

        <SearchBar onSearch={handleSearch} />
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-xs text-muted-foreground space-y-1">
          <p>FarmaCompara — confronto prezzi farmaci online italiani</p>
          <p>I prezzi mostrati sono indicativi e aggiornati ogni 48 ore. Verifica sempre sul sito della farmacia prima dell'acquisto.</p>
          <Link to="/principi-attivi" className="text-primary hover:underline">
            Tutti i principi attivi
          </Link>
        </div>
      </footer>

      {isPreview && (
        <Button
          variant="destructive"
          size="sm"
          className="fixed bottom-4 right-4 z-50 opacity-70 hover:opacity-100"
          onClick={handleClearCache}
          disabled={clearing}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {clearing ? "Svuoto..." : "Svuota Cache"}
        </Button>
      )}
    </div>
  );
};

export default Index;
