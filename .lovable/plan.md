

# Stima costi per 1000 utenti/giorno × 5 ricerche

## Assunzioni

- **1000 utenti/giorno**, ciascuno fa **5 ricerche** = **5.000 ricerche/giorno** = **150.000/mese**
- I principi attivi cercati sono relativamente pochi (paracetamolo, ibuprofene, diclofenac, ecc.). Stima conservativa: **30-50 query uniche al giorno**
- **10 scraper** per ogni ricerca non in cache
- Le ricerche duplicate (stessa query) colpiscono la cache e costano molto meno

## Operazioni per tipo di ricerca

| Tipo | Edge Function | DB queries | Fetch esterni |
|------|--------------|------------|---------------|
| **In cache** | 1 invocazione (~50ms) | 2 (check cache + fetch prodotti) | 0 |
| **Non in cache** | 1 invocazione (~3-5s) | ~15 (delete old + insert + fetch) | 10 (uno per farmacia) |

## Scenario 1: Cache 24h (attuale)

- Query uniche/giorno: ~40
- Ricerche in cache: ~4.960/giorno
- Ricerche con scraping: ~40/giorno (solo la prima per ogni query)
- **Scraping al mese**: ~1.200 invocazioni pesanti (40 × 30gg)
- **DB rows scritte/mese**: ~1.200 × ~15 prodotti = ~18.000 righe/mese
- **Invocazioni Edge Function**: 150.000/mese (tutte le ricerche)

**Costo stimato Lovable Cloud**: ~$5-10/mese (rientra nel free tier di $25)

## Scenario 2: Cache 48h

- Query uniche nuove/giorno: ~20-25 (molte già in cache dal giorno prima)
- **Scraping al mese**: ~650 invocazioni pesanti
- **DB rows scritte/mese**: ~10.000
- **Invocazioni Edge Function**: sempre 150.000 (le ricerche arrivano comunque)

**Costo stimato**: ~$4-8/mese — risparmio ~30% sulle operazioni DB e tempo di compute

## Scenario 3: Cache 72h

- Query uniche nuove/giorno: ~12-15
- **Scraping al mese**: ~400 invocazioni pesanti
- **DB rows scritte/mese**: ~6.000
- **Invocazioni Edge Function**: sempre 150.000

**Costo stimato**: ~$3-6/mese — risparmio ~50% rispetto a 24h

## Riepilogo

```text
                   Cache 24h    Cache 48h    Cache 72h
Scraping/mese       ~1.200        ~650         ~400
Righe DB/mese      ~18.000      ~10.000       ~6.000
Invocazioni EF     150.000      150.000      150.000
Costo stimato      $5-10/m      $4-8/m       $3-6/m
Free tier ($25)    ✅ coperto   ✅ coperto   ✅ coperto
```

## Considerazioni

1. **Con 1000 utenti/giorno, tutti e tre gli scenari rientrano nel free tier di $25/mese** di Lovable Cloud
2. Il vero rischio di costo non sono gli utenti legittimi ma i **bot** — un bot che genera 10.000 query uniche al giorno bypassa completamente la cache e forza 100.000 scraping
3. Il **rate limiting progressivo** è molto più importante della durata della cache per contenere i costi
4. Consiglio **cache 48h** come buon compromesso: dati ragionevolmente freschi + costi dimezzati rispetto a 24h

## Raccomandazione

Portare la cache a **48h** e implementare il rate limiting progressivo come già pianificato. I due interventi insieme garantiscono che anche con 1000 utenti/giorno i costi restino entro il free tier.

