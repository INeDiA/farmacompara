

## Piano: Aggiornamento sitemap.xml e robots.txt

### Modifiche

**1. `public/robots.txt`**
- Cambiare dominio sitemap da `farmacompara.lovable.app` a `farmacompara.it`

**2. `public/sitemap.xml`**
- Dominio: tutti gli URL passano a `farmacompara.it`
- Rimuovere i vecchi principi attivi con ricetta (amoxicillina, metformina, ramipril, ecc.)
- Aggiungere i nuovi 52 principi attivi dalla lista aggiornata in `principiAttivi.ts`
- Mantenere homepage (priority 1.0), /principi-attivi (0.8), e ogni `/cerca/{principio}` (0.7)

2 file modificati, nessun impatto su logica o design.

