import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { rspack } from '@rspack/core';
import projectConfig from '../rspack.config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const candidates = [
  process.env.BROWSER_BIN,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

let browser;
for (const candidate of candidates) {
  if (
    await access(candidate).then(
      () => true,
      () => false,
    )
  ) {
    browser = candidate;
    break;
  }
}
if (!browser) throw new Error('Set BROWSER_BIN to a Chrome/Chromium/Edge executable');

const temporary = await mkdtemp(path.join(root, '.cascade-layers-test-'));
const publicDir = path.join(temporary, 'public');
// Chrome 退出时仍会短暂占用 profile 目录，放进项目临时目录会导致删不掉，改用系统临时目录
const profileDir = path.join(os.tmpdir(), `ld-cascade-profile-${process.pid}-${Date.now()}`);
let server;

// 消费方样式刻意声明在库样式之前：只有层叠层能让它胜出
const page = `<!doctype html><html><head><meta charset="utf-8">
<style>
  .ld-btn { background: rgb(1, 2, 3); }
</style>
<link rel="stylesheet" href="/index.css">
<script type="module" src="/index.js"></script>
</head><body>
<ld-button variant="primary">按钮</ld-button>
<ld-select placeholder="请选择"></ld-select>
</body></html>`;

try {
  const compiler = rspack({
    ...projectConfig,
    mode: 'production',
    context: root,
    devtool: false,
    devServer: undefined,
    performance: false,
    entry: { index: './scripts/test-cascade-layers.browser.js' },
    output: { ...projectConfig.output, path: publicDir },
  });
  await new Promise((resolve, reject) =>
    compiler.run((error, stats) =>
      compiler.close((closeError) => {
        if (error || closeError) reject(error || closeError);
        else if (stats.hasErrors()) reject(new Error(stats.toString({ all: false, errors: true })));
        else resolve();
      }),
    ),
  );

  await writeFile(path.join(publicDir, 'index.html'), page);
  const assets = await readdir(publicDir);

  server = createServer(async (request, response) => {
    const url = request.url === '/' ? '/index.html' : request.url;
    const name = path.basename(url);
    if (!assets.includes(name)) {
      response.statusCode = 404;
      response.end();
      return;
    }
    const type = name.endsWith('.js')
      ? 'text/javascript'
      : name.endsWith('.css')
        ? 'text/css'
        : name.endsWith('.html')
          ? 'text/html'
          : 'application/octet-stream';
    response.setHeader('Content-Type', type);
    response.end(await readFile(path.join(publicDir, name)));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const { stdout } = await promisify(execFile)(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profileDir}`,
      '--dump-dom',
      '--virtual-time-budget=10000',
      `http://127.0.0.1:${server.address().port}/`,
    ],
    { timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true },
  );

  const status = /data-test-status="([^"]*)"/.exec(stdout)?.[1];
  const title = /<title>(.*?)<\/title>/s.exec(stdout)?.[1] || '';
  assert.equal(status, 'passed', title || stdout.slice(0, 400));
  console.log(title);
} finally {
  await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
  assert.equal(path.dirname(temporary), path.resolve(root), 'Unsafe test cleanup parent');
  assert.ok(
    path.basename(temporary).startsWith('.cascade-layers-test-'),
    'Unsafe test cleanup name',
  );
  await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  // 系统临时目录里的 profile 删不掉也不算失败，OS 会回收
  await rm(profileDir, { recursive: true, force: true, maxRetries: 2, retryDelay: 200 }).catch(
    () => {},
  );
}
