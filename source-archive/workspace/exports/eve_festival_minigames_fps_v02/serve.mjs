import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const port = Number(process.env.PORT || 4174);
const host = process.env.GAME_HOST || '127.0.0.1';
const types = {'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.json':'application/json; charset=utf-8'};
const server = http.createServer(async (req, res) => {
  if (!['GET','HEAD'].includes(req.method)) {
    res.writeHead(405, {'Allow':'GET, HEAD'}); res.end(); return;
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(root, '.' + pathname);
    const rel = path.relative(root, file);
    if (rel.startsWith('..' + path.sep) || rel === '..' || path.isAbsolute(rel)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    let info = await stat(file);
    if (info.isDirectory()) { file = path.join(file, 'index.html'); info = await stat(file); }
    if (!info.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-cache'});
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});
server.on('error', err => { console.error(err.message); process.exitCode = 1; });
server.listen(port, host, () => console.log(`축제 놀이터: http://${host}:${port}/`));
