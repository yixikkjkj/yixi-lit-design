import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { rspack } from '@rspack/core';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(path.join(root, '.tree-shaking-test-'));

async function bundle(name, source) {
  const entry = path.join(temporary, `${name}.mjs`);
  await writeFile(entry, source);
  const output = path.join(temporary, name);
  const compiler = rspack({
    mode: 'production',
    context: root,
    entry,
    output: { path: output, filename: 'index.js', module: true },
    module: { rules: [{ test: /\.css$/, type: 'css' }] },
    performance: false,
    devtool: false,
  });
  const stats = await new Promise((resolve, reject) => {
    compiler.run((error, result) => {
      compiler.close((closeError) => {
        if (error || closeError) reject(error || closeError);
        else if (result.hasErrors())
          reject(new Error(result.toString({ all: false, errors: true })));
        else resolve(result);
      });
    });
  });
  const js = await readFile(path.join(output, 'index.js'), 'utf8');
  const css = await readFile(path.join(output, 'index.css'), 'utf8').catch(() => '');
  const activeComponents = new Set();
  function collect(modules = []) {
    for (const module of modules) {
      // Orphan modules may be parsed but never emitted into a chunk.
      if (module.chunks?.length) {
        const matches = (module.name || '').matchAll(/dist\/components\/([^/]+)\//g);
        for (const match of matches) activeComponents.add(match[1]);
        collectActive(module.modules);
      }
      collect(module.modules);
    }
  }
  function collectActive(modules = []) {
    for (const module of modules) {
      for (const match of (module.name || '').matchAll(/dist\/components\/([^/]+)\//g))
        activeComponents.add(match[1]);
      collectActive(module.modules);
    }
  }
  collect(
    stats.toJson({
      all: false,
      modules: true,
      nestedModules: true,
      chunkModules: true,
      ids: true,
    }).modules,
  );
  return { js, css, output, activeComponents };
}

function onlyComponents(result, expected) {
  assert.deepEqual([...result.activeComponents].sort(), [...expected].sort());
}

// 层叠层：所有库样式都在 @layer 内，层序固定，因此 CSS 不依赖 import 顺序，
// 且使用方未分层的 CSS 不需要 !important 就能覆盖库样式。
const LAYERS = ['ld-tokens', 'ld-base', 'ld-components'];
function assertLayerOrder(css, label) {
  assert.ok(css.trimStart().startsWith('@layer'), `${label}: CSS must open with @layer`);
  const positions = LAYERS.map((name) => css.indexOf(`@layer ${name}`));
  LAYERS.forEach((name, index) =>
    assert.ok(positions[index] >= 0, `${label}: missing @layer ${name}`),
  );
  assert.deepEqual(
    [...positions].sort((a, b) => a - b),
    positions,
    `${label}: layer order must be ${LAYERS.join(' < ')}`,
  );
}

// 公共样式（tokens / base）由每个组件的 style.css 各自 @import 一次，
// 打包器必须把它们合成一份，否则组件越多重复越多。
function assertSharedCssOnce(css, label) {
  assert.equal(
    (css.match(/:root\{/g) || []).length,
    1,
    `${label}: 令牌 :root 块出现了多次，公共样式未去重`,
  );
  assert.equal(
    (css.match(/data-ld-theme/g) || []).length,
    1,
    `${label}: 深色主题块出现了多次，公共样式未去重`,
  );
  assert.equal(
    (css.match(/@layer ld-[a-z]+\{/g) || []).length,
    LAYERS.length,
    `${label}: 库样式应合并为 ${LAYERS.length} 个层块`,
  );
}

// 从源码派生裁剪探针：只属于某一个组件样式文件的类名。
// 用它把「JS 模块图」与「CSS 产物」双向对齐——这是 CSS 裁剪唯一可靠的判据，
// 单纯断言某个类存在无法发现新组件的样式泄漏。
async function buildProbeIndex() {
  const componentsDir = path.join(root, 'src/components');
  const stylesDir = path.join(root, 'src/styles');
  const componentNames = new Set(await readdir(componentsDir));
  const owners = new Map();
  for (const file of await readdir(stylesDir)) {
    if (!file.endsWith('.css')) continue;
    const name = file.slice(0, -'.css'.length);
    // 跳过 tokens/base/common/index/icons/layers 等非组件样式
    if (!componentNames.has(name)) continue;
    const css = await readFile(path.join(stylesDir, file), 'utf8');
    // 类名要连 BEM 的下划线一起取：只取到 .ld-dialog 会被产物里的
    // .ld-dialog__mask 挡住（边界检查不允许后接 _ 或 -）
    for (const token of new Set(css.match(/\.ld-[a-z0-9_-]+/g) || [])) {
      if (!owners.has(token)) owners.set(token, new Set());
      owners.get(token).add(name);
    }
  }
  const index = new Map();
  for (const [token, files] of owners) {
    if (files.size !== 1) continue;
    const [owner] = files;
    if (!index.has(owner)) index.set(owner, []);
    index.get(owner).push(token);
  }
  return index;
}

const probeIndex = await buildProbeIndex();
// 类名边界匹配：.ld-btn 不能匹配到 .ld-btn--primary，避免前缀相同的误判
const probePattern = (token) =>
  new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`);

function assertCssFollowsGraph(result, label) {
  const included = new Set(result.activeComponents);

  // 正向：进入模块图的组件，样式必须真的在产物里。漏 @import 会在这里暴露。
  const missing = [];
  for (const name of included) {
    const tokens = probeIndex.get(name);
    if (!tokens) continue;
    if (!tokens.some((token) => probePattern(token).test(result.css))) missing.push(name);
  }
  assert.deepEqual(missing, [], `${label}: 组件已打包但样式缺失`);

  // 负向：未进入模块图的组件，其独占类名一个都不能出现。
  const leaked = [];
  for (const [name, tokens] of probeIndex) {
    if (included.has(name)) continue;
    const hit = tokens.find((token) => probePattern(token).test(result.css));
    if (hit) leaked.push(`${name}(${hit})`);
  }
  assert.deepEqual(leaked, [], `${label}: 未引入组件的样式泄漏`);
}

try {
  const empty = await bundle(
    'unused',
    'import { registerButton } from "yixi-lit-design"; console.log("empty");',
  );
  onlyComponents(empty, []);
  assert.equal(empty.css, '');
  assert.doesNotMatch(empty.js, /lit-html|lit-element|reactive-element|ld-button|ld-icon/);

  const explicit = await bundle(
    'explicit',
    'import { registerButton } from "yixi-lit-design"; import "yixi-lit-design/styles/button.css"; registerButton();',
  );
  const automatic = await bundle('automatic', 'import "yixi-lit-design/components/button";');
  for (const result of [explicit, automatic]) {
    onlyComponents(result, ['button', 'icon']);
    assert.match(result.js, /ld-button/);
    assert.match(result.js, /ld-icon/);
    assert.doesNotMatch(result.js, /ld-(dialog|drawer|date-picker|select)/);
    assert.match(result.css, /\.ld-btn/);
    assert.match(result.css, /--ld-brand-color/);
    assertLayerOrder(result.css, 'single component');
    // Icon styles are decoupled from component styles: an on-demand import
    // must not pull the icon font. Load styles/icons.css explicitly instead.
    assert.doesNotMatch(result.css, /@font-face|\.ri-/);
    assert.equal(
      (await readdir(result.output)).some((file) => /\.(woff2|ttf)$/.test(file)),
      false,
      'Icon font must not be emitted without styles/icons.css',
    );
    assertCssFollowsGraph(result, 'single component');
    assertSharedCssOnce(result.css, 'single component');
    // 体积闸门：拦整体性膨胀（图标字体或公共样式被重新引入），不是精确预算，
    // 当前约 19KB，留约 26% 余量给组件样式演进。
    assert.ok(
      result.css.length < 24000,
      `single component CSS regressed to ${result.css.length} bytes`,
    );
  }

  const withIcons = await bundle(
    'icons',
    'import "yixi-lit-design/components/button"; import "yixi-lit-design/styles/icons.css";',
  );
  onlyComponents(withIcons, ['button', 'icon']);
  assert.match(withIcons.css, /@font-face/);
  assert.match(withIcons.css, /\.ri-/);
  assertLayerOrder(withIcons.css, 'icons');
  assertSharedCssOnce(withIcons.css, 'icons');
  assertCssFollowsGraph(withIcons, 'icons');
  assert.ok(
    (await readdir(withIcons.output)).some((file) => file.endsWith('.woff2')),
    'Icon font assets must be emitted with styles/icons.css',
  );

  // 两个组件以相反顺序引入时必须产出完全相同的 CSS，层序不随使用方的 import 顺序变化。
  const orderForward = await bundle(
    'order-forward',
    'import "yixi-lit-design/components/button";\nimport "yixi-lit-design/components/select";',
  );
  const orderReverse = await bundle(
    'order-reverse',
    'import "yixi-lit-design/components/select";\nimport "yixi-lit-design/components/button";',
  );
  // 层序恒定：两个组件的样式都落在同样的三个层里，与 import 顺序无关。
  // 同一层内部的规则顺序仍随 import 变化，这是层叠层的固有语义；
  // 组件类名前缀互不重叠，因此不影响最终结果。
  for (const result of [orderForward, orderReverse]) {
    assertLayerOrder(result.css, 'two components');
    assertSharedCssOnce(result.css, 'two components');
    assertCssFollowsGraph(result, 'two components');
    assert.match(result.css, /\.ld-btn/);
    assert.match(result.css, /\.ld-select/);
  }
  // 三个组件时公共样式仍只有一份：固定成本共享，增量成本才是组件本身。
  const three = await bundle(
    'three-components',
    'import "yixi-lit-design/components/button";\nimport "yixi-lit-design/components/select";\nimport "yixi-lit-design/components/tag";',
  );
  assertCssFollowsGraph(three, 'three components');
  assertSharedCssOnce(three.css, 'three components');
  assert.ok(
    three.css.length < automatic.css.length * 2,
    `three components CSS ${three.css.length} 字节，接近单组件三倍，公共样式可能被重复打包`,
  );

  // 手工按文件路径引入组件样式时的写法：先引 layers.css 固定层序
  const manualLayers = await bundle(
    'manual-layers',
    'import "yixi-lit-design/styles/layers.css";\nimport "yixi-lit-design/styles/button.css";',
  );
  assertLayerOrder(manualLayers.css, 'manual layers import');
  assert.match(manualLayers.css, /\.ld-btn/);
  // 这条用例只引样式、不引组件模块，模块图为空，所以不做图-CSS 对齐校验
  assertSharedCssOnce(manualLayers.css, 'manual layers import');

  const plain = await bundle('switch', 'import "yixi-lit-design/components/switch";');
  onlyComponents(plain, ['switch']);
  assert.doesNotMatch(plain.css, /@font-face|\.ri-/);
  assertCssFollowsGraph(plain, 'switch');
  assertSharedCssOnce(plain.css, 'switch');
  assert.equal(
    (await readdir(plain.output)).some((file) => /\.(woff2|ttf)$/.test(file)),
    false,
  );

  const password = await bundle('password', 'import "yixi-lit-design/components/password-input";');
  onlyComponents(password, ['password-input', 'input', 'icon']);
  assert.match(password.css, /\.ld-input/);
  // password-input 复用 input.css，没有自己的样式文件，靠依赖组件的探针校验
  assertCssFollowsGraph(password, 'password-input');
  assertSharedCssOnce(password.css, 'password-input');

  const message = await bundle(
    'message',
    'import { message } from "yixi-lit-design"; import "yixi-lit-design/styles/message.css"; message.success("ok");',
  );
  onlyComponents(message, ['message', 'icon']);
  assert.match(message.css, /\.ld-message/);
  assertCssFollowsGraph(message, 'message');
  assertSharedCssOnce(message.css, 'message');

  const full = await bundle('full', 'import "yixi-lit-design/all";');
  const componentNames = await readdir(path.join(root, 'src/components'));
  // Message has no element to register; its unused API can be removed even in /all.
  assert.ok(full.activeComponents.size >= componentNames.length - 1);
  // Icons render as inline SVG now; the font is legacy-only (styles/icons.css).
  assert.doesNotMatch(full.css, /@font-face|\.ri-/);
  assertLayerOrder(full.css, 'full bundle');
  assertSharedCssOnce(full.css, 'full bundle');
  // 全量包的反向校验：每个有独立样式的组件其探针都必须出现，防止漏引样式
  assertCssFollowsGraph(full, 'full bundle');
  assert.match(full.js, /checkbox-circle-fill/);
  assert.ok(automatic.js.length < full.js.length / 2);
  assert.ok(automatic.css.length < full.css.length);

  // 发布产物的桥接文件体检：dist/components/*/style.css 只允许是 @import 清单，
  // 不得内联图标字体，且每条 @import 的目标必须真实存在（防止改名后静默失效）。
  const distComponents = path.join(root, 'dist/components');
  let bridgeCount = 0;
  for (const name of await readdir(distComponents)) {
    const bridge = path.join(distComponents, name, 'style.css');
    const text = await readFile(bridge, 'utf8').catch(() => null);
    if (text === null) continue;
    bridgeCount += 1;
    assert.doesNotMatch(text, /@font-face|remixicon|\.ri-/, `${name}: 桥接文件不得内联图标字体`);
    const imports = [...text.matchAll(/@import\s+"([^"]+)"/g)];
    assert.ok(imports.length > 0, `${name}: 桥接文件应至少包含一条 @import`);
    for (const [, target] of imports) {
      await access(path.resolve(path.dirname(bridge), target)).catch(() => {
        assert.fail(`${name}: @import 目标不存在 ${target}`);
      });
    }
  }
  assert.ok(bridgeCount >= componentNames.length - 1, `桥接文件数量异常: ${bridgeCount}`);

  // Exercise actual registration without a DOM renderer. Importing the root must do nothing.
  const registry = new Map();
  globalThis.customElements = {
    get: (tag) => registry.get(tag),
    define(tag, ctor) {
      assert.equal(registry.has(tag), false, `Duplicate registration: ${tag}`);
      registry.set(tag, ctor);
    },
  };
  const api = await import(pathToFileURL(path.join(root, 'dist/index.js')).href);
  assert.equal(registry.size, 0);
  api.registerButton();
  api.registerButton();
  assert.deepEqual([...registry.keys()].sort(), ['ld-button', 'ld-icon']);
  registry.clear();
  api.registerPasswordInput();
  assert.deepEqual([...registry.keys()].sort(), ['ld-icon', 'ld-input', 'ld-password-input']);
  registry.clear();
  api.registerCheckbox();
  assert.deepEqual([...registry.keys()].sort(), ['ld-checkbox', 'ld-checkbox-group', 'ld-icon']);
  for (const [name, register] of Object.entries(api)) {
    if (name.startsWith('register')) {
      register();
      register();
    }
  }
  assert.ok(registry.has('ld-dialog') && registry.has('ld-option') && registry.has('ld-tab'));

  // Verify the published declarations under strict consumer settings, without src/global.d.ts.
  const typeImports = componentNames
    .map(
      (name) =>
        `import "yixi-lit-design/components/${name}";\nimport "yixi-lit-design/styles/${name}.css";`,
    )
    .join('\n');
  await writeFile(
    path.join(temporary, 'consumer.ts'),
    `${typeImports}\nimport "yixi-lit-design/all";\nimport "yixi-lit-design/styles.css";\nimport "yixi-lit-design/styles/layers.css";\nimport "yixi-lit-design/styles/common.css";\nimport "yixi-lit-design/styles/icons.css";\nimport { registerButton, LdButton } from "yixi-lit-design";\nregisterButton();\nconst button: LdButton = document.createElement("ld-button");\nbutton.variant = "primary";\n`,
  );
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules/typescript/bin/tsc'),
      '--ignoreConfig',
      '--noEmit',
      '--strict',
      '--noUncheckedSideEffectImports',
      '--target',
      'ES2021',
      '--module',
      'ESNext',
      '--moduleResolution',
      'bundler',
      '--types',
      'lit',
      path.join(temporary, 'consumer.ts'),
    ],
    { cwd: root, stdio: 'inherit' },
  );

  console.log(
    'Tree shaking, per-component CSS trimming, shared-style dedupe, assets, dependencies, idempotent registration and consumer types passed.',
  );
  for (const [name, result] of [
    ['button', automatic],
    ['all', full],
  ]) {
    console.log(
      `${name}: JS ${Buffer.byteLength(result.js)} bytes (${gzipSync(result.js).length} gzip), CSS ${Buffer.byteLength(result.css)} bytes (${gzipSync(result.css).length} gzip), fonts excluded`,
    );
  }
} finally {
  if (
    path.dirname(temporary) !== path.resolve(root) ||
    !path.basename(temporary).startsWith('.tree-shaking-test-')
  )
    throw new Error('Unsafe test cleanup path');
  // 清理失败不能掩盖真正的断言错误：Windows 上 rspack 的文件句柄可能尚未释放，
  // 直接 rm 会抛 EPERM，把断言结果换成一条无关的清理异常。
  await rm(temporary, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  }).catch((error) => console.warn(`临时目录清理失败（不影响断言结果）: ${error.message}`));
}
