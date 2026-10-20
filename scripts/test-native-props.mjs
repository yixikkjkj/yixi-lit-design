import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
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
const temporary = await mkdtemp(path.join(root, '.native-props-test-'));
let server;
try {
  const compiler = rspack({
    ...projectConfig,
    mode: 'production',
    context: root,
    devtool: false,
    devServer: undefined,
    performance: false,
    entry: { index: './scripts/test-native-props.browser.js' },
    output: { ...projectConfig.output, path: path.join(temporary, 'public') },
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
  await writeFile(
    path.join(temporary, 'public/index.html'),
    '<!doctype html><html><head><script type="module" src="/index.js"></script></head><body></body></html>',
  );
  server = createServer(async (request, response) => {
    const name = request.url === '/index.js' ? 'index.js' : 'index.html';
    response.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : 'text/html');
    response.end(await readFile(path.join(temporary, 'public', name)));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  if (process.argv.includes('--serve')) {
    console.log(`Browser fixture: http://127.0.0.1:${server.address().port}/`);
    await new Promise((resolve) => {
      process.once('SIGINT', resolve);
      process.once('SIGTERM', resolve);
    });
  } else {
    const { stdout } = await promisify(execFile)(
      browser,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        `--user-data-dir=${path.join(temporary, 'profile')}`,
        '--dump-dom',
        '--virtual-time-budget=10000',
        `http://127.0.0.1:${server.address().port}/`,
      ],
      { timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true },
    );
    assert.match(stdout, /data-test-status="passed"/, stdout);
    console.log(stdout.match(/<title>(.*?)<\/title>/)?.[1]);
  }
} finally {
  await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
  assert.equal(path.dirname(temporary), path.resolve(root), 'Unsafe test cleanup parent');
  assert.ok(path.basename(temporary).startsWith('.native-props-test-'), 'Unsafe test cleanup name');
  await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
