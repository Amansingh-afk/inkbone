// Shared by the tools: a small static server and a headless browser page with Inkbone loaded.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp4': 'video/mp4', '.gif': 'image/gif' };
export function serve(port = 0) {
  const server = http.createServer((q, s) => {
    const u = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (u === '/') { s.writeHead(302, { location: '/storybook/index.html' }); return s.end(); }
    const f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end('not found'); }
    s.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(s);
  });
  return new Promise(res => server.listen(port, '127.0.0.1', () => res({ server, url: `http://127.0.0.1:${server.address().port}` })));
}
export async function browser() {
  const { chromium } = await import('playwright-core');
  const base = path.join(os.homedir(), '.cache/ms-playwright'), C = fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort().pop();
  return chromium.launch({ executablePath: path.join(base, C, 'chrome-linux64/chrome'), args: ['--disable-gpu'] });
}
export const savePng = (file, b64) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.from(b64, 'base64')); };
