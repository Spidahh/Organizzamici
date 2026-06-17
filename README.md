# 👥 Organizzamici

Organizzamici è una web-app moderna ed elegante progettata per pianificare ritrovi, weekend, grigliate ed eventi di gruppo con facilità. Supporta la votazione delle date ideali (con calcolo dell'ottimalità algoritmica), la gestione di alloggi/posti letto, il coordinamento delle auto (carpooling), la bacheca risorse e la bacheca dei commenti in tempo reale.

**🔴 Live demo:** [spidahh.github.io/Organizzamici](https://spidahh.github.io/Organizzamici/)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSpidahh%2FOrganizzamici)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Spidahh/Organizzamici)

> ✨ **Restyling completo (giugno 2026):** nuova identità visiva "Aperitivo Notturno" (aurora animata, gradiente brand viola→fuchsia→corallo, glassmorphism, micro-animazioni), notifiche **toast** non bloccanti al posto degli `alert`, **modale di conferma**, **skeleton loader**, **confetti** ai momenti chiave ed **eliminazione evento** per l'organizzatore.

---

## 🌟 Funzionalità Principali

- **📅 Flusso Smart Data Fissa & Voto**:
  - **Data Fissa**: Se l'evento ha una data stabilita, la procedura guidata salta lo Step 2 del calendario e mostra direttamente la dashboard consolidata con logistica, auto e alloggi.
  - **Date da Votare**: Permette agli invitati di votare le date di disponibilità su una griglia interattiva.
- **🎯 Algoritmo Ottimizzazione Date**: Calcola e ordina le date migliori per massimizzare la presenza del gruppo e trovare la soluzione ottimale.
- **🔒 Finalizzazione Data**: L'organizzatore può fissare una data come definitiva direttamente dall'ottimizzatore, disabilitando la votazione e convertendo la dashboard in modalità data singola.
- **🚗 Coordinamento Trasporti**: Sistema di carpooling integrato con calcolo posti auto e passeggeri.
- **🛏️ Gestione Posti Letto**: Monitoraggio della disponibilità degli alloggi per pianificare weekend e vacanze di gruppo.
- **💬 Bacheca dei Commenti & Risorse**: Posta commenti al volo direttamente dalla dashboard e condividi link e info utili.
- **🔄 Google OAuth & Email Login**: Autenticazione integrata (con risoluzione dei conflitti di redirect su client-side routing).
- **💾 Modalità Emulata Zero-Config**: Se non viene configurato un database Supabase, l'app funziona immediatamente in locale salvando tutti i dati in modo persistente tramite `localStorage`.

---

## 🚀 Deployment

L'app è già **online su GitHub Pages**: [spidahh.github.io/Organizzamici](https://spidahh.github.io/Organizzamici/). La configurazione Vite usa `base: './'` (percorsi relativi), quindi gli stessi file girano senza modifiche anche su Vercel, Netlify o qualsiasi hosting statico.

* **GitHub Pages**: la sorgente Pages è il branch `gh-pages`. Per ripubblicare dopo modifiche basta `npm run build` e caricare il contenuto di `dist/` su quel branch.
* **Vercel**: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSpidahh%2FOrganizzamici) — importa il repository e fai il deploy.
* **Netlify**: [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Spidahh/Organizzamici) — deploy continuo da GitHub.

---

## 🛠️ Configurazione Supabase (Opzionale)

Se desideri salvare i dati in un database reale condiviso con i tuoi amici anziché utilizzare il database emulato in locale, segui questi passaggi:

1. Crea un progetto gratuito su [Supabase](https://supabase.com/).
2. Copia ed esegui il codice SQL presente nel file [`schema.sql`](file:///e:/PROGETTI/Organizzamici/schema.sql) nell'editor SQL (SQL Editor) di Supabase per creare le tabelle e impostare le policy RLS.
3. Copia il file `.env.example` in `.env`:
   ```bash
   cp .env.example .env
   ```
4. Configura le tue credenziali Supabase nel file `.env`:
   ```env
   VITE_SUPABASE_URL=la_tua_supabase_url
   VITE_SUPABASE_ANON_KEY=la_tua_anon_key
   ```
5. Su Supabase, abilita **Google** come Provider di Autenticazione sotto la sezione *Authentication -> Providers*. Aggiungi `https://<tuo-dominio-vercel-o-netlify>` come URL di redirect autorizzato.

---

## 💻 Sviluppo Locale

1. Installa le dipendenze:
   ```bash
   npm install
   ```
2. Avvia il server di sviluppo locale:
   ```bash
   npm run dev
   ```
3. Avvia la build per produzione:
   ```bash
   npm run build
   ```
