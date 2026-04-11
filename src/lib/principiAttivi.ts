export const TOP_PRINCIPI_ATTIVI = [
  "Paracetamolo", "Ibuprofene", "Diclofenac", "Ketoprofene",
  "Diosmina", "N-acetilcisteina", "Acido acetilsalicilico", "Cetirizina",
];

export const ALL_PRINCIPI_ATTIVI = [
  // Analgesici / FANS
  "Paracetamolo", "Ibuprofene", "Diclofenac", "Ketoprofene",
  "Nimesulide", "Acido acetilsalicilico", "Naprossene", "Piroxicam",
  "Meloxicam", "Aceclofenac", "Flurbiprofene", "Ibuprofen lisina",
  // FANS / antinfiammatori topici
  "Diclofenac topico", "Nimesulide topico", "Arnica",
  // Vasoprotettori / circolazione
  "Diosmina", "Escina",
  // Mucolitici / vie respiratorie
  "N-acetilcisteina", "Ambroxolo", "Guaifenesina", "Carbocisteina",
  "Destrometorfano",
  // Decongestionanti nasali
  "Oximetazolina", "Xilometazolina",
  // Antistaminici
  "Cetirizina", "Loratadina", "Desloratadina", "Fexofenadina", "Ketotifene",
  // Gola / cavo orale
  "Benzidamina",
  // Gastrointestinali
  "Pantoprazolo", "Lansoprazolo", "Domperidone", "Simeticone",
  "Loperamide", "Lattulosio", "Sodio bicarbonato",
  // Integratori / vitamine / minerali
  "Acido folico", "Ferro solfato", "Calcio carbonato", "Vitamina D3",
  "Magnesio", "Melatonina", "Acido ascorbico",
  // Articolazioni / muscoli
  "Glucosamina", "Condroitina", "Acido ialuronico", "Acido ialuronico topico",
  "Bromelina",
  // Dermatologici / cura della pelle
  "Pantenolo", "Clotrimazolo",
];

export function toSlug(name: string): string {
  return encodeURIComponent(name.toLowerCase());
}

export function fromSlug(slug: string): string {
  return decodeURIComponent(slug);
}
