// Mappa nomi commerciali (brand) → principio attivo
// Solo brand OTC/SOP italiani il cui principio attivo è presente in ALL_PRINCIPI_ATTIVI.
// Le chiavi sono normalizzate (lowercase, senza spazi multipli).

export const BRAND_TO_ACTIVE: Record<string, string> = {
  // Ibuprofene
  "moment": "Ibuprofene",
  "momentact": "Ibuprofene",
  "brufen": "Ibuprofene",
  "nurofen": "Ibuprofene",
  "spidifen": "Ibuprofen lisina",
  "antalgil": "Ibuprofene",
  "cibalgina": "Ibuprofene",

  // Paracetamolo
  "tachipirina": "Paracetamolo",
  "efferalgan": "Paracetamolo",
  "panadol": "Paracetamolo",
  "acetamol": "Paracetamolo",
  "tachidol": "Paracetamolo",

  // Diclofenac
  "voltaren": "Diclofenac",
  "voltadvance": "Diclofenac",
  "voltfast": "Diclofenac",
  "dicloreum": "Diclofenac",
  "flector": "Diclofenac topico",
  "voltaren emulgel": "Diclofenac topico",

  // Ketoprofene
  "oki": "Ketoprofene",
  "okitask": "Ketoprofene",
  "fastum": "Ketoprofene",
  "fastum gel": "Ketoprofene",
  "ketodol": "Ketoprofene",
  "orudis": "Ketoprofene",

  // Nimesulide
  "aulin": "Nimesulide",
  "mesulid": "Nimesulide",
  "nimesil": "Nimesulide",

  // Acido acetilsalicilico
  "aspirina": "Acido acetilsalicilico",
  "aspirinetta": "Acido acetilsalicilico",
  "vivin c": "Acido acetilsalicilico",
  "vivinc": "Acido acetilsalicilico",
  "cardioaspirin": "Acido acetilsalicilico",
  "cardirene": "Acido acetilsalicilico",
  "ascriptin": "Acido acetilsalicilico",

  // Naprossene
  "momendol": "Naprossene",
  "synflex": "Naprossene",

  // Flurbiprofene
  "froben": "Flurbiprofene",
  "benactiv gola": "Flurbiprofene",

  // Diosmina
  "daflon": "Diosmina",
  "arvenum": "Diosmina",
  "doven": "Diosmina",

  // N-acetilcisteina
  "fluimucil": "N-acetilcisteina",
  "solmucol": "N-acetilcisteina",

  // Ambroxolo
  "mucosolvan": "Ambroxolo",
  "fluibron": "Ambroxolo",

  // Carbocisteina
  "lisomucil": "Carbocisteina",

  // Destrometorfano
  "bronchenolo": "Destrometorfano",

  // Cetirizina
  "zirtec": "Cetirizina",
  "reactine": "Cetirizina",
  "virlix": "Cetirizina",
  "cerchio": "Cetirizina",

  // Loratadina
  "clarityn": "Loratadina",
  "fristamin": "Loratadina",

  // Desloratadina
  "aerius": "Desloratadina",
  "azomyr": "Desloratadina",

  // Fexofenadina
  "telfast": "Fexofenadina",

  // Decongestionanti nasali
  "vicks sinex": "Oximetazolina",
  "rinazina": "Oximetazolina",
  "actifed": "Xilometazolina",

  // Benzidamina
  "tantum verde": "Benzidamina",
  "neo borocillina": "Benzidamina",

  // Gastro
  "maalox": "Sodio bicarbonato",
  "gaviscon": "Sodio bicarbonato",
  "citrosodina": "Sodio bicarbonato",
  "peptazol": "Pantoprazolo",
  "pantorc": "Pantoprazolo",
  "lansox": "Lansoprazolo",
  "limpidex": "Lansoprazolo",
  "peridon": "Domperidone",
  "motilium": "Domperidone",
  "mylicon": "Simeticone",
  "imodium": "Loperamide",
  "dissenten": "Loperamide",
  "duphalac": "Lattulosio",
  "laevolac": "Lattulosio",

  // Ferro / vitamine / minerali
  "ferrograd": "Ferro solfato",
  "tardyferon": "Ferro solfato",
  "dibase": "Vitamina D3",
  "rocaltrol": "Vitamina D3",
  "cebion": "Acido ascorbico",
  "redoxon": "Acido ascorbico",
  "folina": "Acido folico",
  "circadin": "Melatonina",
  "armonia": "Melatonina",

  // Articolazioni
  "voltadol": "Diclofenac topico",
  "dolonet": "Acido ialuronico topico",

  // Dermatologici
  "bepanthenol": "Pantenolo",
  "canesten": "Clotrimazolo",
  "gyno canesten": "Clotrimazolo",
};

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Se il termine cercato è un brand noto, ritorna il principio attivo.
 * Altrimenti ritorna null.
 */
export function brandToActive(query: string): string | null {
  if (!query) return null;
  const key = normalize(query);
  return BRAND_TO_ACTIVE[key] ?? null;
}
