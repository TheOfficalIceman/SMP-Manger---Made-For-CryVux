import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..');
const PUB       = path.join(ROOT, 'public', 'admin');
const OUT       = path.join(ROOT, 'titanbot-dashboard.html');

export function generateDashboard(serverOrigin = '') {
  const htmlPath = path.join(PUB, 'index.html');
  const cssPath  = path.join(PUB, 'css', 'style.css');
  const jsPath   = path.join(PUB, 'js', 'app.js');

  if (!existsSync(htmlPath)) {
    console.warn('[Dashboard] index.html not found, skipping generation.');
    return;
  }

  const css  = existsSync(cssPath) ? readFileSync(cssPath,  'utf8') : '';
  const js   = existsSync(jsPath)  ? readFileSync(jsPath,   'utf8') : '';
  let   html = readFileSync(htmlPath, 'utf8');

  /* Stamp the API origin so the downloaded file can reach the live bot */
  const originScript = serverOrigin
    ? `<script>window.__API_ORIGIN='${serverOrigin}';</script>\n`
    : '';

  /* Inline CSS */
  html = html.replace(
    /<link rel="stylesheet" href="[^"]+"\s*\/?>/,
    `<style>\n${css}\n</style>`
  );

  /* Inline JS (with optional origin stamp before it) */
  html = html.replace(
    /<script src="[^"]+">\s*<\/script>/,
    `${originScript}<script>\n${js}\n</script>`
  );

  writeFileSync(OUT, html, 'utf8');
  console.log(`[Dashboard] ✅ titanbot-dashboard.html written (${Math.round(html.length / 1024)} KB)`);
}

/* Allow running directly: node scripts/generateDashboard.js */
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  generateDashboard();
}
