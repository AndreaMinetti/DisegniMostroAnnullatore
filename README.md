# Galleria dei piccoli artisti

Sito statico gratuito per:

- mostrare un link alla galleria Instagram;
- ricevere una foto del disegno senza chiedere nome o email;
- richiedere la conferma del genitore/tutore;
- salvare il disegno in un archivio Supabase **privato**;
- moderare manualmente i file dal Dashboard Supabase;
- pubblicare su Instagram soltanto i disegni approvati.

Il sito può essere ospitato gratuitamente con **GitHub Pages**.  
GitHub Pages ospita soltanto HTML, CSS e JavaScript: per ricevere i file viene
usato il piano gratuito di **Supabase**.

## 1. Crea il progetto Supabase

1. Crea un account su Supabase e un nuovo progetto.
2. Nel Dashboard apri **Authentication → Providers**.
3. Abilita **Anonymous Sign-Ins**.
4. Apri **SQL Editor**.
5. Incolla tutto il contenuto di `supabase-setup.sql`.
6. Premi **Run**.

Lo script crea:

- il bucket privato `drawings`;
- la tabella `submissions`;
- le policy di sicurezza necessarie.

Gli utenti anonimi possono caricare esclusivamente nella propria cartella.
Non possono vedere i disegni degli altri. Il bucket non è pubblico.

## 2. Inserisci i tuoi dati in config.js

Apri `config.js` e modifica:

```js
window.APP_CONFIG = {
  projectName: "Titolo del progetto",
  supabaseUrl: "https://IL_TUO_PROGETTO.supabase.co",
  supabasePublishableKey: "LA_TUA_PUBLISHABLE_KEY",
  instagramUrl: "https://www.instagram.com/IL_TUO_PROFILO/",
  contactEmail: "tua-email@example.com"
};
```

Trovi URL e chiave nel Dashboard Supabase, nella sezione delle API del progetto.

Usa esclusivamente:

- **Publishable key**, oppure
- la vecchia chiave **anon public**.

Non mettere mai nel sito:

- Secret key;
- `service_role`;
- password del database.

La publishable/anon key è progettata per essere usata nel browser, ma è sicura
soltanto insieme alle policy RLS dello script SQL.

## 3. Personalizza il testo

Apri `index.html` e modifica liberamente:

- titolo;
- spiegazione del progetto;
- testo del consenso;
- diciture del pulsante Instagram.

Apri `styles.css` per modificare colori e aspetto.

## 4. Prova il sito in locale

Non aprire direttamente `index.html` con doppio clic. Avvia un piccolo server.

Con Python:

```bash
python -m http.server 8000
```

Poi apri:

```text
http://localhost:8000
```

Fai un invio di prova e verifica nel Dashboard Supabase:

- **Storage → drawings → incoming**
- **Table Editor → submissions**

## 5. Pubblica gratuitamente con GitHub Pages

1. Crea un repository GitHub, per esempio `galleria-disegni`.
2. Carica nella cartella principale:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `config.js`
   - `robots.txt`
3. Apri **Settings → Pages**.
4. Seleziona la pubblicazione dal branch principale e dalla cartella root.
5. GitHub mostrerà l'indirizzo pubblico, per esempio:

```text
https://tuo-utente.github.io/galleria-disegni/
```

Usa questo indirizzo per creare il QR code da inserire nel libro.

## 6. Moderazione

Le immagini non vengono pubblicate automaticamente.

Per controllarle:

1. apri Supabase;
2. vai in **Storage → drawings → incoming**;
3. apri o scarica i disegni;
4. pubblica manualmente su Instagram solo quelli idonei;
5. elimina quelli con volti, nomi, scuola, indirizzo o altri dati personali.

La tabella `submissions` conserva soltanto:

- identificativo tecnico anonimo;
- percorso del file;
- conferma del consenso;
- data e ora dell'invio.

Il nome originale del file non viene salvato nella tabella. Prima dell'upload,
il browser ridimensiona e ricodifica l'immagine in JPEG, rimuovendo i metadati
fotografici più comuni.

## 7. Limiti e prudenza

Questa configurazione riduce la raccolta di dati, ma non garantisce anonimato
tecnico assoluto: Supabase, GitHub o altri fornitori possono conservare log di
sicurezza.

Il testo incluso è una base pratica, non un parere legale. Prima della
pubblicazione del libro è prudente far controllare informativa e consenso da un
professionista, specialmente se il progetto viene distribuito in più Paesi.

## Struttura dei file

```text
galleria-disegni-bambini/
├── index.html
├── styles.css
├── app.js
├── config.js
├── supabase-setup.sql
├── robots.txt
└── README.md
```


## Schermata di conferma

Dopo ogni tentativo di invio, il form viene sostituito da una schermata dedicata:

- **successo**: conferma che il disegno è stato ricevuto;
- **errore**: mostra il motivo disponibile dell'errore;
- in entrambi i casi è presente il pulsante **Invia un altro disegno**;
- il pulsante riporta al form vuoto, pronto per un nuovo caricamento.
