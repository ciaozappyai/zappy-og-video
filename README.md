# zappy-og-video — Vercel OG service

Microservizio Vercel che serve gli Open Graph tag per i link video di outreach Zappy.

**URL pubblico:** `https://video.ciaozappy.it/<slug>`
**Cosa fa:** legge la riga `outreach_videos` su Supabase (via anon key + RLS pubblico), renderizza HTML con OG tag personalizzati (thumbnail YouTube + titolo/descrizione custom), poi redirect verso `https://ciaozappy.it/video/<slug>` (la pagina React vera).

---

## Setup (una tantum)

### 1. Repo GitHub
1. Crea repo GitHub vuoto `zappy-og-video`
2. Copia dentro **solo** il contenuto di questa cartella `vercel-og/`:
   - `api/og.ts`
   - `vercel.json`
   - `package.json`
   - `tsconfig.json`
   - `README.md`
3. Push

### 2. Progetto Vercel
1. vercel.com → **Add New Project** → importa il repo `zappy-og-video`
2. Framework Preset: **Other** (auto-detect funziona)
3. Build/Output: lascia default
4. **Deploy**

### 3. Environment Variables (Vercel)
Settings → Environment Variables (scope: Production + Preview + Development):

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://tnlydsnuzmnvqvckeqbw.supabase.co` |
| `SUPABASE_ANON_KEY` | (la stessa anon key in `.env` come `VITE_SUPABASE_PUBLISHABLE_KEY`) |

Poi **Deployments → Redeploy** sull'ultimo deploy.

### 4. Custom domain
Settings → Domains → **Add `video.ciaozappy.it`**.
Vercel mostra il record da aggiungere. Tipicamente:
- Tipo: **CNAME**
- Nome: `video`
- Valore: `cname.vercel-dns.com`

### 5. DNS su IONOS
Login ionos.it → ciaozappy.it → **DNS** → Aggiungi record:
- Tipo: `CNAME`
- Nome host: `video`
- Punta a: `cname.vercel-dns.com` (esatto valore mostrato da Vercel)
- TTL: 3600

**Non toccare** `@` e `www` (restano A `185.158.133.1` per Lovable).
Vercel rileva DNS e provisiona SSL in 1-15 minuti.

---

## Test

```bash
# 1. Risposta HTML 200 con OG tag
curl -sI https://video.ciaozappy.it/test-salone-roma
# expect: HTTP/2 200, content-type: text/html

# 2. Vedi gli OG tag
curl -s https://video.ciaozappy.it/test-salone-roma | grep -E 'og:|twitter:'

# 3. Browser → deve redirect a https://ciaozappy.it/video/test-salone-roma

# 4. WhatsApp / Telegram → preview con thumbnail YouTube + titolo custom
```

Se la preview WhatsApp resta vecchia: usa il **Facebook Sharing Debugger** (https://developers.facebook.com/tools/debug/) per forzare re-fetch.

---

## Workflow Claude/operativo

Per ogni nuovo lead, Claude (o tu) fa direttamente `INSERT` su Supabase tabella `outreach_videos` via REST API + service_role key (già in `.env`):

```bash
curl -X POST "https://tnlydsnuzmnvqvckeqbw.supabase.co/rest/v1/outreach_videos" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "slug": "momentum-barbershop",
    "youtube_id": "dQw4w9WgXcQ",
    "salone": "Momentum Barbershop",
    "citta": "Roma",
    "nome_titolare": "Marco",
    "greeting_line": "Ciao Marco!",
    "og_title": "Marco, ho registrato un video per Momentum Barbershop 🎥",
    "og_description": "Guarda come Zappy può aiutare Momentum Barbershop a non perdere più clienti."
  }'
```

URL pronto: `https://video.ciaozappy.it/momentum-barbershop`

---

## Costi

Vercel Hobby plan: 100 GB bandwidth/mese, invocazioni serverless illimitate. Per outreach 1-to-1 sei in fascia €0 per sempre.
