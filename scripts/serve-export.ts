/**
 * Serves the static export at /lunon-living-report/, as the portfolio's
 * GitHub Pages deploy will. Anything outside the prefix is a 404, so an asset
 * that forgot the base path fails here instead of on the live site. Text is
 * gzipped, as Pages does, so Lighthouse measures what readers will download.
 *
 * Run after `npm run build`: `node scripts/serve-export.ts` (PORT to change).
 */
import {readFile, stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname, join, normalize} from 'node:path';
import {gzipSync} from 'node:zlib';

const PREFIX = '/lunon-living-report/';
const ROOT = join(process.cwd(), 'out');
const PORT = Number(process.env.PORT ?? 4310);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

async function resolve(pathname: string): Promise<string | undefined> {
  if (!pathname.startsWith(PREFIX)) return undefined;
  const file = join(ROOT, normalize(pathname.slice(PREFIX.length)));
  if (!file.startsWith(ROOT)) return undefined;
  const info = await stat(file).catch(() => undefined);
  if (!info) return undefined;
  return info.isDirectory() ? join(file, 'index.html') : file;
}

createServer(async (request, response) => {
  const {pathname} = new URL(request.url ?? '/', 'http://localhost');
  const file = await resolve(decodeURIComponent(pathname));
  const body = file && (await readFile(file).catch(() => undefined));
  if (!file || !body) {
    response.writeHead(404, {'content-type': TYPES['.html']});
    response.end(await readFile(join(ROOT, '404.html')).catch(() => ''));
    return;
  }
  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  const gzip =
    /^(text|application\/json|image\/svg)/.test(type) &&
    /\bgzip\b/.test(request.headers['accept-encoding'] ?? '');
  response.writeHead(200, {
    'content-type': type,
    ...(gzip && {'content-encoding': 'gzip'}),
  });
  response.end(gzip ? gzipSync(body) : body);
}).listen(PORT, () => {
  console.log(`Serving out/ at http://localhost:${PORT}${PREFIX}`);
});
