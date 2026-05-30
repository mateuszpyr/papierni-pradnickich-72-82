// Generate RSS 2.0 feed (PL) from news/items/*.md
// Usage:  node tools/generate-feed.js
// Output: news/feed.xml
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://wspolnota.hrynie.com/papierni-pradnickich-72-82';
const SITE_TITLE = 'Wspólnota Papierni Prądnickich 72–82';
const SITE_DESC = 'Aktualności wspólnoty mieszkaniowej Papierni Prądnickich 72, 74, 76, 78, 80, 82 — Kraków.';
const SITE_LANG = 'pl-PL';

const NEWS_DIR = path.join(__dirname, '..', 'news', 'items');
const INDEX = path.join(NEWS_DIR, 'index.json');
const OUT = path.join(__dirname, '..', 'news', 'feed.xml');

function parseValue(raw) {
  const s = raw.trim();
  if (s === '' || s === "''") return '';
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  return s;
}

function parseMarkdown(text) {
  const item = {};
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines[0].trim() !== '---') return null;
  let i = 1;
  for (; i < lines.length; i++) {
    if (lines[i].trim() === '---') { i++; break; }
    const m = lines[i].match(/^([a-z_][a-z0-9_]*)\s*:\s*(.*)$/i);
    if (m) item[m[1]] = parseValue(m[2]);
  }
  const rest = lines.slice(i).join('\n');
  const m = rest.match(/^:::\s*pl\s*$([\s\S]*?)^:::\s*$/m);
  item.body_pl = m ? m[1].trim() : '';
  return item;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function plainTextFromBody(body) {
  return body
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, '') // links/images
    .replace(/[#*_>`]/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function rfc822(dateStr) {
  // dateStr is YYYY-MM-DD; treat as noon UTC for stability
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toUTCString();
}

function buildRss(items) {
  const lastBuild = new Date().toUTCString();
  const lastPub = items.length ? rfc822(items[0].date) : lastBuild;

  const entries = items.map((it) => {
    const link = `${SITE_URL}/news.html?slug=${encodeURIComponent(it.slug)}`;
    const desc = (it.lead_pl && it.lead_pl.trim()) || plainTextFromBody(it.body_pl).slice(0, 280);
    const imageTag = it.image
      ? `      <enclosure url="${escapeXml(SITE_URL + '/' + it.image)}" type="image/jpeg" />\n`
      : '';
    const catTag = it.tag_pl ? `      <category>${escapeXml(it.tag_pl)}</category>\n` : '';
    const authorTag = it.author ? `      <dc:creator>${escapeXml(it.author)}</dc:creator>\n` : '';
    return `    <item>
      <title>${escapeXml(it.title_pl || it.slug)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${rfc822(it.date)}</pubDate>
${catTag}${authorTag}      <description>${escapeXml(desc)}</description>
${imageTag}    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${escapeXml(SITE_URL + '/')}</link>
    <atom:link href="${escapeXml(SITE_URL + '/news/feed.xml')}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(SITE_DESC)}</description>
    <language>${SITE_LANG}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <pubDate>${lastPub}</pubDate>
${entries}
  </channel>
</rss>
`;
}

function main() {
  const files = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
  const items = files
    .map((f) => {
      const txt = fs.readFileSync(path.join(NEWS_DIR, f), 'utf8');
      return parseMarkdown(txt);
    })
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const xml = buildRss(items);
  fs.writeFileSync(OUT, xml, 'utf8');
  console.log(`Wrote ${OUT} (${items.length} items, ${xml.length} bytes)`);
}

main();
