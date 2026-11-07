// Shared by the tools: a small static server and a headless browser page with Inkbone loaded.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { createRequire } from 'node:module';
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp4': 'video/mp4', '.gif': 'image/gif' };
// Packages like three are found the way Node finds them: in Inkbone's own node_modules in a checkout, or in the project's when Inkbone is installed (npm hoists them one level up).
const need = createRequire(path.join(ROOT, 'package.json'));
function fromModules(u) { const rest = u.slice('/node_modules/'.length), parts = rest.split('/'), n = parts[0].startsWith('@') ? 2 : 1, pkg = parts.slice(0, n).join('/'); for (const from of [ROOT, process.cwd()]) { let entry; try { entry = need.resolve(pkg, { paths: [from] }); } catch { continue; } let dir = path.dirname(entry); while (dir !== path.dirname(dir) && !(fs.existsSync(path.join(dir, 'package.json')) && JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).name === pkg)) dir = path.dirname(dir); const file = path.join(dir, ...parts.slice(n)); if (file.startsWith(dir + path.sep) && fs.existsSync(file)) return file; } return null; } // packages may not export package.json, so find the main entry and walk up to the package's folder
export function serve(port = 0) {
  const server = http.createServer((q, s) => {
    const u = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (u === '/') { s.writeHead(302, { location: '/storybook/index.html' }); return s.end(); }
    let f = path.join(ROOT, u);
    if (!fs.existsSync(f) && u.startsWith('/node_modules/')) f = fromModules(u) ?? f;
    const inside = f.startsWith(ROOT + path.sep) || (u.startsWith('/node_modules/') && f === fromModules(u));
    if (!inside || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end('not found'); }
    s.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(s);
  });
  return new Promise(res => server.listen(port, '127.0.0.1', () => res({ server, url: `http://127.0.0.1:${server.address().port}` })));
}
export async function browser(args = ['--disable-gpu'], env = null) {
  const { chromium } = await import('playwright-core');
  const base = path.join(os.homedir(), '.cache/ms-playwright'), C = fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort().pop();
  return chromium.launch({ executablePath: path.join(base, C, 'chrome-linux64/chrome'), args, ...(env ? { env: { ...process.env, ...env } } : {}) });
}
export const savePng = (file, b64) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.from(b64, 'base64')); };
