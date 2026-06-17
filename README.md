# 👥 Organizzamici

Organizzamici è una web-app per organizzare ritrovi, weekend, cene ed eventi di gruppo tra amici. Gli amici votano le date in tempo reale e un algoritmo intelligente trova il giorno migliore incrociando viaggi, impegni e turni di lavoro. Include carpooling, posti letto, destinazioni votabili dal gruppo, bacheca link e commenti.

**🔴 Live demo:** [spidahh.github.io/Organizzamici](https://spidahh.github.io/Organizzamici/)

---

## ✨ Come funziona (nessun login)

1. **Crea l'evento** — scegli tipo, luogo e date (fisse o da votare).
2. **Condividi il link** — mandalo su WhatsApp.
3. **Gli amici votano** — aprono il link, scrivono il loro nome e votano. **Nessun account, nessuna email da confermare.**

Tutto (voti, commenti, carpooling, destinazioni, risorse) è **condiviso in tempo reale** tra tutti su un database reale. L'identità è un id stabile per dispositivo + il nome scelto, salvati nel browser — niente password.

> 🔒 **Modello di sicurezza:** "link segreto" (come Doodle). Chi ha il link di un evento può vederlo e modificarlo. Perfetto per cose tra amici; non pensato per dati sensibili.

---

## 🌟 Funzionalità

- **📅 Data fissa o date da votare** con griglia interattiva.
- **🎯 Algoritmo di ottimizzazione**: calcola la data migliore pesando presenze, coesione del gruppo e sforzo di viaggio (tempi, ferie necessarie, posti letto).
- **🔒 Finalizzazione data** dall'ottimizzatore (l'organizzatore fissa la data definitiva).
- **🚗 Carpooling** con calcolo posti auto/passeggeri.
- **🛏️ Gestione posti letto** per weekend e vacanze.
- **🗺️ Destinazioni collaborative** votabili (❤️ Love / 👍 Like / 👎 No).
- **💬 Bacheca commenti & risorse** in tempo reale.
- **🎨 Tema a scelta** (Ambra / Lime / Teal) dall'header.
- **💾 Modalità locale**: senza database configurato l'app funziona comunque salvando in `localStorage` (utile in sviluppo) + scenario demo su `/event/demo`.

---

## 🚀 Deployment

Online su **GitHub Pages** (branch `gh-pages`). La build Vite usa `base: './'` (percorsi relativi), quindi gli stessi file girano anche su Vercel/Netlify o qualsiasi hosting statico.

Per ripubblicare dopo modifiche:
```bash
npm run build          # genera dist/ (con le credenziali da .env)
# poi pubblica il contenuto di dist/ sul branch gh-pages
```

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSpidahh%2FOrganizzamici) [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Spidahh/Organizzamici)

---

## 🛠️ Configurazione database (Supabase)

L'app live è già collegata a un progetto Supabase. Per usarne uno tuo:

1. Crea un progetto gratuito su [Supabase](https://supabase.com/).
2. Esegui il contenuto di [`schema.sql`](schema.sql) nell'SQL Editor (crea le tabelle, le policy permissive e abilita il realtime).
3. Copia `.env.example` in `.env` e inserisci le tue credenziali:
   ```env
   VITE_SUPABASE_URL=la_tua_supabase_url
   VITE_SUPABASE_ANON_KEY=la_tua_anon_key
   ```
   (Il file `.env` è ignorato da git; la anon key è pubblica e viene inclusa nel build statico — è protetta dalle policy del database.)

---

## 💻 Sviluppo locale

```bash
npm install     # installa le dipendenze
npm run dev     # server di sviluppo
npm run build   # build di produzione
```
