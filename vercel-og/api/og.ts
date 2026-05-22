import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const SITE_BASE = "https://ciaozappy.it";
const OG_BASE = "https://video.ciaozappy.it";

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(opts: {
  slug: string;
  youtubeId: string | null;
  bunnyThumbnailUrl: string | null;
  ogTitle: string;
  ogDescription: string;
}): string {
  const redirectUrl = `${SITE_BASE}/video/${encodeURIComponent(opts.slug)}`;
  const ogUrl = `${OG_BASE}/${encodeURIComponent(opts.slug)}`;

  // Priorità: Bunny custom thumbnail (URL salvata dinamicamente in Supabase) →
  //          fallback YouTube (per record legacy con youtube_id valorizzato) →
  //          null (omette i tag og:image*; meglio preview senza immagine che immagine rotta)
  const image: string | null =
    opts.bunnyThumbnailUrl ??
    (opts.youtubeId
      ? `https://i.ytimg.com/vi/${encodeURIComponent(opts.youtubeId)}/maxresdefault.jpg`
      : null);

  const title = escapeHtml(opts.ogTitle);
  const desc = escapeHtml(opts.ogDescription);
  const url = escapeHtml(ogUrl);
  const redirect = escapeHtml(redirectUrl);

  const imageMetaTags = image
    ? `<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:image:secure_url" content="${escapeHtml(image)}" />
<meta property="og:image:width" content="1280" />
<meta property="og:image:height" content="720" />
<meta name="twitter:image" content="${escapeHtml(image)}" />`
    : "";

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>${title}</title>
<meta name="description" content="${desc}" />

<meta property="og:type" content="video.other" />
<meta property="og:site_name" content="Zappy" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
${imageMetaTags}

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${desc}" />

<meta http-equiv="refresh" content="0; url=${redirect}" />
<link rel="canonical" href="${redirect}" />
<script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
<style>body{font-family:system-ui,sans-serif;padding:40px;color:#333;text-align:center}</style>
</head>
<body>
<p>Reindirizzamento in corso…</p>
<p><a href="${redirect}">Clicca qui se non vieni reindirizzato</a></p>
</body>
</html>`;
}

function render404(slug: string): string {
  return `<!DOCTYPE html>
<html lang="it"><head>
<meta charset="utf-8" />
<meta name="robots" content="noindex,nofollow" />
<title>Video non trovato</title>
<meta http-equiv="refresh" content="0; url=${SITE_BASE}" />
<script>window.location.replace(${JSON.stringify(SITE_BASE)});</script>
</head><body><p>Video "${escapeHtml(slug)}" non trovato. Reindirizzamento…</p></body></html>`;
}

export default async function handler(req: any, res: any) {
  try {
    const slug = (req.query?.slug || "").toString().trim();

    if (!slug || !/^[a-z0-9-]{1,80}$/i.test(slug)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.status(400).send(render404(slug || "invalid"));
    }

    const { data, error } = await supabase
      .from("outreach_videos")
      .select("slug, youtube_id, bunny_thumbnail_url, og_title, og_description")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("[og] supabase error:", error.message);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.status(500).send(render404(slug));
    }

    if (!data) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.status(404).send(render404(slug));
    }

    const html = renderHtml({
      slug: data.slug,
      youtubeId: data.youtube_id,
      bunnyThumbnailUrl: data.bunny_thumbnail_url,
      ogTitle: data.og_title || "Un video pensato apposta per te",
      ogDescription:
        data.og_description ||
        "Scopri come Zappy può aiutare la tua attività a non perdere più clienti.",
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return res.status(200).send(html);
  } catch (e: any) {
    console.error("[og] handler error:", e?.message || e);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).send(render404("error"));
  }
}
