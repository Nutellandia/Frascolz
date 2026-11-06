import React from 'react';
import { Scale, ShieldCheck, DollarSign, Award, BookOpen, ExternalLink, CheckCircle2 } from 'lucide-react';

export const LegalAndBusinessGuide: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Title */}
      <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
          <Scale className="w-4 h-4" />
          Masterplan Legale, Brevetti, Licenze &amp; Commercializzazione
        </div>
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight mt-1">
          Guida Strategica per Emilio Frascogna (FRS Software)
        </h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
          Tutto ciò che una software house emergente deve sapere per pubblicare un motore di compressione di successo,
          proteggersi legalmente dai brevetti, adottare il modello di business Dual-License e monetizzare con studi di videogiochi e cloud provider.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* 1. Dual-Licensing Strategy */}
        <div className="p-5 bg-zinc-900/60 rounded-xl border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase">
              <DollarSign className="w-4 h-4" />
              1. Modello di Business: Dual-Licensing (Modello B)
            </div>
            <h3 className="text-sm font-bold text-zinc-200 mt-1">
              Come Monetizzare FrascoLZ senza perdere visibilità
            </h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Hai scelto saggiamente il modello Dual-Licensing (adottato da colossi come Qt, MongoDB, Redis e SQLite):
            </p>

            <ul className="mt-3 space-y-2 text-xs text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Licenza Community (AGPLv3 o BSL):</strong> Libera per sviluppatori indipendenti, studenti e progetti open-source.
                  Se una società integra FrascoLZ in un servizio cloud commerciale senza rilasciare il codice, è obbligata a comprare la licenza commerciale.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Licenza FRS Commercial Enterprise:</strong> Venduta direttamente dalla tua software house (FRS) a studi di gaming (es. Epic, Rockstar)
                  e piattaforme streaming con clausola di esenzione dal copyleft, supporto tecnico e SLA di bug-fixing.
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-4 p-3 bg-zinc-950/80 rounded-lg border border-zinc-800 text-2xs text-zinc-400">
            <strong>Consiglio Tariffario FRS:</strong> Licenza royalty-free per gioco / titolo commerciale (es. $5,000 - $25,000 una tantum)
            oppure canone SaaS mensile per nodi di streaming server.
          </div>
        </div>

        {/* 2. Patent Safety & Freedom to Operate */}
        <div className="p-5 bg-zinc-900/60 rounded-xl border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase">
              <ShieldCheck className="w-4 h-4" />
              2. Paesaggio Brevettuale &amp; "Freedom to Operate"
            </div>
            <h3 className="text-sm font-bold text-zinc-200 mt-1">
              Perché FrascoLZ è Sicuro al 100% da Cause Legali
            </h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Il mondo della compressione ha una storia complessa di brevetti (famoso il caso Unisys sul formato GIF / LZW negli anni '90).
            </p>

            <ul className="mt-3 space-y-2 text-xs text-zinc-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Brevetto LZ77 Scaduto nel Pubblico Dominio:</strong> La tecnica a finestra scorrevole e matching con offset/length
                  risale al 1977 ed è patrimonio comune dell'umanità.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Nessun Brevetto ANS / Arithmetic:</strong> Abbiamo deliberatamente evitato l'Arithmetic Coding
                  per non incorrere in brevetti software attivi di grandi multinazionali.
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-4 p-3 bg-zinc-950/80 rounded-lg border border-zinc-800 text-2xs text-zinc-400">
            <strong>Dichiarazione Legale:</strong> Inserire nell'header la clausola di esclusione della responsabilità (*AS IS, WITHOUT WARRANTY OF ANY KIND*)
            per proteggere te e la tua azienda da qualsiasi responsabilità per perdita dati.
          </div>
        </div>

        {/* 3. Launch Strategy */}
        <div className="p-5 bg-zinc-900/60 rounded-xl border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase">
              <Award className="w-4 h-4" />
              3. Strategia di Lancio &amp; "Hacker News Effect"
            </div>
            <h3 className="text-sm font-bold text-zinc-200 mt-1">
              Come Farsi Notare dai Lead Engineer dell'Industria
            </h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              I grandi innovatori del software indipendente (tra cui Salvatore Sanfilippo con Redis) hanno costruito il loro successo su trasparenza e chiarezza metodologica estrema:
            </p>

            <ol className="mt-3 space-y-2 text-xs text-zinc-300 list-decimal list-inside">
              <li>
                <strong>Post "Show HN" su Hacker News:</strong> Titolo tipo <em>"Show HN: FrascoLZ – A single-file C99 compression engine designed for real-time game asset streaming"</em>.
              </li>
              <li>
                <strong>Benchmark Riproducibili:</strong> Non dire solo che è veloce; fornisci il comando esatto `make bench` perché chiunque possa testarlo sul proprio laptop.
              </li>
              <li>
                <strong>Unreal Engine / Unity Plugin:</strong> Crea un wrapper C++ per Unreal Engine 5. I game dev adotteranno il tuo codec se basta un click.
              </li>
            </ol>
          </div>
        </div>

        {/* 4. Step-by-Step for Emilio Frascogna */}
        <div className="p-5 bg-zinc-900/60 rounded-xl border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase">
              <BookOpen className="w-4 h-4" />
              4. Cosa Devi Fare Tu Passo-Passo (Roadmap Esecutiva)
            </div>
            <h3 className="text-sm font-bold text-zinc-200 mt-1">
              Checklist di Azioni Pratiche per FRS
            </h3>

            <div className="mt-3 space-y-2 text-xs text-zinc-300">
              <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
                <strong className="text-zinc-100">Passo 1: Repository Git Ufficiale</strong>
                <p className="text-zinc-400 mt-0.5 text-2xs">
                  Crea una repo pubblica `frascolz` su GitHub con i file C e il Makefile generati.
                </p>
              </div>

              <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
                <strong className="text-zinc-100">Passo 2: Registrazione Marchio "FRS" e "FrascoLZ"</strong>
                <p className="text-zinc-400 mt-0.5 text-2xs">
                  Deposita il marchio presso l'UIBM (Ufficio Italiano Brevetti e Marchi) o EUIPO per tutelare il nome.
                </p>
              </div>

              <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
                <strong className="text-zinc-100">Passo 3: Modello di Contratto Commerciale</strong>
                <p className="text-zinc-400 mt-0.5 text-2xs">
                  Fai validare da un legale specializzato in IP software il testo della licenza commerciale B2B prima delle prime vendite.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
