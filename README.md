# 👥 Organizzamici

Organizzamici è una web-app per organizzare ritrovi, weekend, cene ed eventi di gruppo tra amici. Gli amici votano le date in tempo reale e un algoritmo intelligente trova il giorno migliore incrociando viaggi, impegni e turni di lavoro. Include carpooling, posti letto, destinazioni votabili dal gruppo, bacheca link e commenti.

**🔴 Live:** [spidahh.github.io/Organizzamici](https://spidahh.github.io/Organizzamici/)

---

## ✨ Come funziona

1. **Registrati / accedi** — con email e password (account gratuito, accesso immediato).
2. **Crea l'evento** — tipo, luogo e date (fisse o da votare).
3. **Condividi il link** — gli amici accedono e votano.
4. **Pannello utente** — ritrovi che hai organizzato e quelli a cui ti sei unito, tutti in un posto.

Tutto (voti, commenti, carpooling, destinazioni, risorse) è **condiviso in tempo reale** tra tutti su database reale (Supabase).

---

## 🌟 Funzionalità

- **🔑 Account** email/password con pannello dei propri eventi (creati e a cui si partecipa).
- **📅 Data fissa o date da votare** con griglia interattiva.
- **🎯 Algoritmo di ottimizzazione**: la data migliore pesando presenze, coesione del gruppo e sforzo di viaggio (tempi, ferie, posti letto).
- **🔒 Finalizzazione data** dall'ottimizzatore.
- **🚗 Carpooling** con calcolo posti auto/passeggeri.
- **🛏️ Gestione posti letto**.
- **🗺️ Destinazioni collaborative** votabili (❤️ / 👍 / 👎).
- **💬 Bacheca commenti & risorse** in tempo reale.
- **🎨 Tema a scelta** (Ambra / Lime / Teal) dall'header.
- **💾 Modalità locale** (senza database, dati nel browser) per lo sviluppo.

---

## 🚀 Deployment

Online su **GitHub Pages** (branch `gh-pages`). La build Vite usa `base: './'`, quindi gli stessi file girano anche su Vercel/Netlify o qualsiasi hosting statico.

```bash
npm run build          # genera dist/ (con le credenziali da .env)
# poi pubblica il contenuto di dist/ sul branch gh-pages
```

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSpidahh%2FOrganizzamici) [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Spidahh/Organizzamici)

---

## 🛠️ Configurazione database (Supabase)

L'app live è già collegata a un progetto Supabase. Per usarne uno tuo:

1. Crea un progetto gratuito su [Supabase](https://supabase.com/).
2. Esegui [`schema.sql`](schema.sql) nell'SQL Editor (tabelle, RLS, realtime e auto-conferma email per il login immediato).
3. Copia `.env.example` in `.env` e inserisci le credenziali:
   ```env
   VITE_SUPABASE_URL=la_tua_supabase_url
   VITE_SUPABASE_ANON_KEY=la_tua_anon_key
   ```
   (`.env` è ignorato da git; la anon key è pubblica e protetta dalle policy del database.)

---

## 💻 Sviluppo locale

```bash
npm install
npm run dev
npm run build
```
