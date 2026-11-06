# Guida Completa per Mac Terminal: Come Pubblicare FrascoLZ su GitHub e Monetizzare

**Autore:** Emilio Frascogna (FRS Software)  
**Destinatario:** Sviluppatore / Fondatore alla prima pubblicazione Open-Core & Commerciale  
**Sistema Operativo:** macOS (Apple Silicon M1/M2/M3/M4 o Intel)

---

## 🧭 Panoramica del Percorso

Questa guida ti accompagna passo dopo passo, da quando apri il terminale del Mac fino a quando il tuo repository è online su GitHub con licenza open-source e modulo di pagamento per i clienti commerciali.

Non devi avere paura di sbagliare: ogni comando è spiegato nel dettaglio.

---

## FASE 1: Preparazione degli Strumenti sul tuo Mac

Apri l'applicazione **Terminale** (Terminal) sul tuo Mac (premi `Cmd + Spazio`, scrivi `Terminale` e premi `Invio`).

### 1.1 Verifica degli Strumenti da Riga di Comando di Apple (Xcode CLI)
Digita questo comando e premi Invio:
```bash
xcode-select -p
```
- Se vedi un percorso come `/Library/Developer/CommandLineTools`, è già installato!
- Se invece ricevi un errore o si apre una finestra che ti chiede di installare gli strumenti, digita:
  ```bash
  xcode-select --install
  ```
  e clicca su "Installa" nella finestra che compare sullo schermo.

### 1.2 Verifica di Git
Verifica che Git sia presente:
```bash
git --version
```
(Dovresti vedere ad esempio `git version 2.39...` o superiore).

### 1.3 Configura la tua identità su Git
Se non lo hai mai fatto, comunica a Git il tuo nome e la tua email (usa la tua email GitHub o quella con cui vuoi firmare i commit):
```bash
git config --global user.name "Emilio Frascogna"
git config --global user.email "Nos_1@icloud.com"
```

---

## FASE 2: Organizzazione del Progetto sul tuo Mac

### 2.1 Crea la cartella per i tuoi progetti FRS
Nel terminale, crea una cartella comoda (ad esempio dentro `Documenti` o nella tua `Home`):
```bash
mkdir -p ~/Progetti/frascolz
cd ~/Progetti/frascolz
```
*Spiegazione:* `mkdir -p` crea la cartella, `cd` ci entra dentro.

### 2.2 Scaricare i file del progetto
Puoi esportare o copiare l'intera cartella del progetto da questo ambiente alla cartella `~/Progetti/frascolz` del tuo Mac.  
Verifica che all'interno ci siano:
- `engine_c/`
- `src/`
- `README.md`
- `LICENSE`
- `COMMERCIAL_LICENSE.md`
- `CONTRIBUTING.md`
- `package.json`
- `Makefile`

---

## FASE 3: Inizializzazione del Repository Git Locale

Sempre dentro la cartella `~/Progetti/frascolz` sul tuo Mac, esegui questi 4 comandi in sequenza:

### 3.1 Inizializza il repository Git
```bash
git init -b main
```
*Spiegazione:* Crea un nuovo archivio Git locale con il ramo principale chiamato `main`.

### 3.2 Aggiungi tutti i file al tracciamento
```bash
git add .
```
*Spiegazione:* Prepara tutti i file del progetto per il primo salvataggio.

### 3.3 Crea il primo Commit ufficiale
```bash
git commit -m "feat: initial release of FrascoLZ v3.0 Universal Lossless Compression Engine by Emilio Frascogna"
```
*Spiegazione:* Salva lo stato del codice con un messaggio chiaro e professionale.

---

## FASE 4: Pubblicazione su GitHub

### Opzione A: Tramite il Sito Web di GitHub (La via più semplice e visiva)

1. Apri Safari o Chrome e vai su [github.com](https://github.com).
2. Se non hai un account, crealo gratuitamente. Se lo hai già, fai il login.
3. In alto a destra, clicca sul simbolo **`+`** e seleziona **"New repository"**.
4. Compila i campi:
   - **Repository name:** `frascolz`
   - **Description:** `Ultra-fast, zero-dependency lossless compression in pure C99 with adaptive RAM scaling (16KB to 128GB+) and DS4 DeepSeek V4 Flash tensor acceleration by Emilio Frascogna`
   - **Public / Private:** Seleziona **Public** (fondamentale per farsi conoscere nel mondo open-source e raccogliere consensi e adozione).
   - **NON** spuntare "Add a README file", "Add .gitignore", o "Choose a license" (li abbiamo già creati noi nel progetto!).
5. Clicca su **"Create repository"**.
6. GitHub ti mostrerà una pagina con dei comandi. Copia i comandi sotto la dicitura **"…or push an existing repository from the command line"**:
   ```bash
   git remote add origin https://github.com/TUO_USERNAME/frascolz.git
   git push -u origin main
   ```
   *(Sostituisci `TUO_USERNAME` con il tuo vero nome utente GitHub)*.
7. Premi Invio nel terminale del Mac. Se GitHub ti chiede le credenziali, inserisci il tuo username e il tuo **Personal Access Token** (oppure fai il login via browser).

---

## FASE 5: Creare la Prima "Release Ufficiale" (v3.0.0)

Le grandi aziende (Epic Games, Rockstar Games, Redis Labs) e gli sviluppatori cercano sempre la sezione **"Releases"** su GitHub per scaricare i binari pronti.

1. Sul tuo Mac, crea il tag di versione:
   ```bash
   git tag -a v3.0.0 -m "FrascoLZ v3.0.0 Official Release"
   git push origin v3.0.0
   ```
2. Compila la libreria statica sul tuo Mac per distribuirla:
   ```bash
   cd engine_c
   make
   ```
   Troverai `build/libfrascolz.a`.
3. Vai sulla pagina del tuo repository GitHub:
   - Clicca su **"Releases"** nella colonna di destra.
   - Clicca su **"Draft a new release"**.
   - Seleziona il tag `v3.0.0`.
   - Titolo: `FrascoLZ v3.0.0 Universal Engine`
   - Descrizione: Copia i punti chiave del `README.md`.
   - Trascina il file `libfrascolz.a` e il sorgente compresso `.zip` come allegati.
   - Clicca su **"Publish release"**.

---

## FASE 6: Come Monetizzare (Open-Core & Commerciale)

Essendo la prima volta che pubblichi con questo modello, ecco la strategia adottata dai fondatori di successo (come i creatori di SQLite, Tailwind, Redis e CockroachDB):

### 1. Il Modello: Gratis per la Community, a Pagamento per le Grandi Aziende
- Gli sviluppatori indipendenti, gli studenti e le startup fino a $100.000 di fatturato usano il codice liberamente. Questo genera passaparola, stelle su GitHub e fiducia.
- Se uno studio di videogiochi proprietario (es. un gioco per PlayStation/Xbox) o un'azienda cloud vuole integrare FrascoLZ a codice chiuso senza obblighi open-source, **deve acquistare la Licenza Commerciale FRS**.

### 2. Canali di Pagamento Immediati
1. **Contatto Diretto via Email (B2B Invoicing):**  
   Nel `README.md` e in `COMMERCIAL_LICENSE.md` c'è la tua email `Nos_1@icloud.com`. Quando un'azienda ti scrive, puoi emettere una fattura commerciale standard.
2. **Stripe Payment Link (Carta di Credito / Apple Pay):**  
   - Vai su [stripe.com](https://stripe.com) e crea un account gratuito per FRS Software.
   - Crea un "Payment Link" con importo $499 (Startup Tier) o $2,499 (Enterprise Tier).
   - Inserisci il link direttamente nel `README.md` sotto la voce *"Buy Instant Commercial License"*.
3. **GitHub Sponsors:**  
   - Puoi abilitare **GitHub Sponsors** sul tuo profilo. Aziende e sviluppatori possono supportarti mensilmente (es. $20, $100, $500/mese).

---

## FASE 7: Piano di Lancio & Visibilità

Per fare tanto successo come desideri:

1. **Hacker News (Show HN):**  
   Pubblica un post con titolo:  
   *`Show HN: FrascoLZ – Zero-dependency C99 compression engine with adaptive RAM and DS4 tensor streaming`*  
   Spiega con trasparenza la filosofia C99, l'ispirazione all'approccio ingegneristico di Salvatore Sanfilippo (antirez), e i benchmark prestazionali.
2. **Reddit:**  
   Condividi su `r/programming`, `r/C_Programming`, `r/gamedev`.
3. **X / Twitter & LinkedIn:**  
   Condividi i grafici e il video o gli screenshot della Producer Suite Web App mostrando la compressione dei micro-pacchetti e dei tensori.
