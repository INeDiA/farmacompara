

# Aggiornamento testi FarmaCompare — Piano originale + 2 correzioni

Riparto dal piano approvato, modificando **solo** i due punti segnalati.

## Modifiche in `src/pages/Index.tsx`

### Header subtitle (riga 22)
- Da: "Confronta i prezzi al mg dei farmaci online"
- A: **"Confronta il costo per grammo di principio attivo"**

### Hero titolo (righe 32-36)
- Da: "Il prezzo al milligrammo dei farmaci online"
- A: **"Quanto costa davvero il tuo farmaco?"**

### Hero sottotitolo (righe 38-42)
- Da: "Confronta il reale costo dei farmaci come confronti il prezzo al chilo..."
- A: **"Confronta il costo per grammo di principio attivo tra diverse farmacie online. Stessa molecola, confezioni diverse: scopri quale conviene davvero."**

### Card 1 (righe 48-51) — dal piano originale, invariata
- Titolo: **"Prezzo/g"**
- Desc: **"Costo normalizzato per grammo di principio attivo"**

### Card 2 (righe 55-58) — corretta come richiesto
- Titolo: **"Spedizione"** (rimosso "inclusa")
- Desc: **"Costo di spedizione sempre visibile nel confronto"**

### Card 3 (righe 62-65) — corretta come richiesto
- Titolo: **"Farmacie online"**
- Desc: **"Risultati da diverse farmacie online che spediscono in Italia"**

### Footer (righe ~97-100)
- Rimuovere riferimenti a "milligrammo" se presenti, allineare con "grammo di principio attivo"

## Nessuna modifica ad altri file
`SearchBar.tsx` e `ResultsTable.tsx` già corretti.

