

## Piano: Integrazione Iubenda per cookie banner e privacy policy

### Perché Iubenda conviene

- Genera automaticamente cookie policy e privacy policy conformi al GDPR (e aggiornate quando cambia la normativa)
- Il piano gratuito copre un sito con traffico limitato
- Zero manutenzione lato codice: basta uno snippet JS
- Gestione granulare del consenso (cookie tecnici vs profilazione) inclusa

### Cosa serve da te

1. **Creare un account su [iubenda.com](https://www.iubenda.com)** (piano gratuito o a pagamento)
2. **Configurare il sito** (aggiungere farmacompara.it, selezionare i servizi usati — es. nessun analytics al momento)
3. **Copiare i due snippet** che Iubenda fornisce:
   - **Cookie Solution** (il banner di consenso)
   - **Privacy/Cookie Policy** (il widget con i link alle policy)

### Modifiche tecniche

**`index.html`** — unico file modificato

- Inserire lo snippet JS di Iubenda Cookie Solution prima della chiusura di `</body>` (dopo il tag `<script type="module">` di Vite)
- Lo snippet è tipicamente un blocco `<script>` con configurazione + caricamento asincrono del loro SDK

**`src/pages/Index.tsx`** (opzionale)

- Aggiungere nel footer un link "Privacy Policy" e "Cookie Policy" che puntano alle pagine Iubenda generate (o aprono il widget inline)

### Esempio di integrazione

```html
<!-- index.html, prima di </body> -->
<script type="text/javascript">
  var _iub = _iub || [];
  _iub.csConfiguration = {
    /* configurazione copiata da Iubenda */
  };
</script>
<script type="text/javascript" src="//cdn.iubenda.com/cs/iubenda_cs.js" async></script>
```

### Passi

1. Tu crei l'account Iubenda e configuri il sito
2. Mi fornisci lo snippet completo (o il Site ID / Cookie Policy ID)
3. Io lo inserisco in `index.html` e aggiungo i link nel footer

Vuoi procedere con la creazione dell'account Iubenda, oppure hai già uno snippet pronto?

