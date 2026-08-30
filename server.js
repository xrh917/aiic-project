import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const port = Number(process.env.PORT || 8787);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/deepseek') {
    if (!process.env.DEEPSEEK_API_KEY) { res.writeHead(503, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'DEEPSEEK_API_KEY is not configured on the server.' })); return; }
    let body = ''; for await (const chunk of req) body += chunk;
    try {
      const upstream = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` }, body: JSON.stringify({ model: process.env.DEEPSEEK_MODEL || 'deepseek-chat', messages: JSON.parse(body).messages, temperature: 0.2 }) });
      res.writeHead(upstream.status, { 'content-type': 'application/json' }); res.end(await upstream.text());
    } catch (error) { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: error.message })); }
    return;
  }
  const requested = normalize(join(root, req.url === '/' ? 'index.html' : req.url));
  if (!requested.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }
  try { const data = await readFile(requested); res.writeHead(200, { 'content-type': mime[extname(requested)] || 'application/octet-stream' }); res.end(data); } catch { const data = await readFile(join(root, 'index.html')); res.writeHead(200, { 'content-type': mime['.html'] }); res.end(data); }
});
server.listen(port, '127.0.0.1', () => console.log(`AIIC server listening on 127.0.0.1:${port}`));
