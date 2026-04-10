export const TOP_PRINCIPI_ATTIVI = [
  "Paracetamolo", "Ibuprofene", "Diclofenac", "Ketoprofene",
  "Acido acetilsalicilico", "Nimesulide", "Omeprazolo", "Amoxicillina",
];

export const ALL_PRINCIPI_ATTIVI = [
  "Paracetamolo", "Ibuprofene", "Diclofenac", "Ketoprofene",
  "Nimesulide", "Acido acetilsalicilico", "Omeprazolo", "Amoxicillina",
  "Pantoprazolo", "Lansoprazolo", "Desloratadina", "Cetirizina",
  "Loratadina", "Fluconazolo", "Azitromicina", "Claritromicina",
  "Metformina", "Atorvastatina", "Simvastatina", "Ramipril",
  "Amlodipina", "Bisoprololo", "Furosemide", "Levotiroxina",
  "Prednisone", "Desametasone", "Betametasone", "Ciprofloxacina",
  "Levofloxacina", "Metoclopramide", "Domperidone", "Ranitidina",
  "Acido folico", "Ferro solfato", "Calcio carbonato", "Vitamina D3",
  "Magnesio", "Melatonina", "Naprossene", "Piroxicam",
  "Meloxicam", "Aceclofenac", "Diosmina", "Escina",
  "Bromelina", "Glucosamina", "Condroitina", "Acido ialuronico",
  "N-acetilcisteina", "Tachipirina",
];

export function toSlug(name: string): string {
  return encodeURIComponent(name.toLowerCase());
}

export function fromSlug(slug: string): string {
  return decodeURIComponent(slug);
}
