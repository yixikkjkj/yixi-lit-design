import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(
  await readFile(path.join(root, 'node_modules/oxfmt/package.json'), 'utf8'),
);
const binary = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin.oxfmt;
const server = spawn(process.execPath, [path.join(root, 'node_modules/oxfmt', binary), '--lsp'], {
  cwd: root,
  windowsHide: true,
  stdio: ['pipe', 'pipe', 'pipe'],
});
let output = Buffer.alloc(0);
let stderr = '';
let sequence = 0;
const pending = new Map();

function send(message) {
  const body = JSON.stringify({ jsonrpc: '2.0', ...message });
  server.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
}

function request(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Oxfmt LSP timed out on ${method}: ${stderr}`));
    }, 15_000);
    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    });
    send({ id, method, params });
  });
}

server.stdout.on('data', (chunk) => {
  output = Buffer.concat([output, chunk]);
  while (true) {
    const boundary = output.indexOf('\r\n\r\n');
    if (boundary < 0) return;
    const length = /Content-Length:\s*(\d+)/i.exec(output.subarray(0, boundary).toString());
    assert.ok(length, 'Valid LSP response header');
    const end = boundary + 4 + Number(length[1]);
    if (output.length < end) return;
    const message = JSON.parse(output.subarray(boundary + 4, end).toString());
    output = output.subarray(end);
    const waiter = pending.get(message.id);
    if (waiter && !message.method) {
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
      else waiter.resolve(message.result);
    } else if (message.method && message.id !== undefined) {
      // Configuration and capability registration requests from the server.
      send({
        id: message.id,
        result:
          message.method === 'workspace/configuration'
            ? message.params.items.map(() => ({}))
            : null,
      });
    }
  }
});
server.stderr.on('data', (chunk) => {
  stderr += chunk;
});
const fail = (error) => {
  for (const waiter of pending.values()) waiter.reject(error);
  pending.clear();
};
server.on('error', fail);
server.on('exit', (code) => fail(new Error(`Oxfmt LSP exited (${code}): ${stderr}`)));

try {
  const uri = pathToFileURL(path.join(root, 'src/formatter-lsp-check.ts')).href;
  const init = await request('initialize', {
    processId: process.pid,
    rootUri: pathToFileURL(root).href,
    workspaceFolders: [{ uri: pathToFileURL(root).href, name: 'yixi-lit-design' }],
    capabilities: {},
  });
  assert.ok(init.capabilities.documentFormattingProvider, 'Oxfmt advertises formatting support');
  send({ method: 'initialized', params: {} });
  const source = 'const value={name:"demo"}\n';
  send({
    method: 'textDocument/didOpen',
    params: {
      textDocument: {
        uri,
        languageId: 'typescript',
        version: 1,
        text: source,
      },
    },
  });
  const edits = await request('textDocument/formatting', {
    textDocument: { uri },
    options: { tabSize: 2, insertSpaces: true },
  });
  assert.ok(edits?.length, 'Formatting returns edits');
  function offset(position) {
    const lines = source.split('\n');
    return (
      lines.slice(0, position.line).reduce((length, line) => length + line.length + 1, 0) +
      position.character
    );
  }
  let formatted = source;
  for (const edit of edits.sort(
    (left, right) => offset(right.range.start) - offset(left.range.start),
  )) {
    formatted =
      formatted.slice(0, offset(edit.range.start)) +
      edit.newText +
      formatted.slice(offset(edit.range.end));
  }
  assert.equal(
    formatted.replaceAll('\r\n', '\n'),
    "const value = { name: 'demo' };\n",
    'LSP honors the project singleQuote and semi settings',
  );
  send({ method: 'textDocument/didClose', params: { textDocument: { uri } } });
  await request('shutdown', null);
  send({ method: 'exit' });
  console.log(
    `Oxfmt ${manifest.version}: LSP initialization and formatting with project config passed.`,
  );
} finally {
  server.kill();
}
