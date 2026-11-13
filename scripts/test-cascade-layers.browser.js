/**
 * 层叠层（@layer）行为测试，在被真实浏览器加载的页面里执行。
 *
 * 验证两件事：
 * 1. 库的样式都在 @layer 内，且层序固定为 ld-tokens < ld-base < ld-components；
 * 2. 使用方未分层的 CSS 优先于库样式——即使它声明在库样式之前。
 *    没有 @layer 时，同特异性的库规则因为更靠后必然反超，第 2 条会失败。
 */
import 'yixi-lit-design/components/button';
import 'yixi-lit-design/components/select';

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const readLayerOrder = () => {
  const names = [];
  const visit = (rules) => {
    for (const rule of rules) {
      if (rule.constructor.name === 'CSSLayerBlockRule' && rule.name) names.push(rule.name);
      if (rule.cssRules) visit(rule.cssRules);
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      visit(sheet.cssRules);
    } catch {
      // 跨源样式表不可读，测试内都是同源，忽略即可
    }
  }
  return [...new Set(names)];
};

const waitFor = async (predicate, timeout = 3000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
};

const run = async () => {
  await customElements.whenDefined('ld-button');

  // 组件层生效的信号：.ld-btn 的 display: inline-flex 来自 src/styles/button.css
  const applied = await waitFor(() => {
    const btn = document.querySelector('ld-button .ld-btn');
    return btn && getComputedStyle(btn).display === 'inline-flex';
  });
  check(applied, 'component layer not applied: .ld-btn display is not inline-flex');

  const order = readLayerOrder();
  check(
    JSON.stringify(order) === JSON.stringify(['ld-tokens', 'ld-base', 'ld-components']),
    `unexpected layer order: ${order.join(' < ') || '(none)'}`,
  );

  const btn = document.querySelector('ld-button .ld-btn');
  if (btn) {
    const style = getComputedStyle(btn);
    // 消费方未分层规则声明在库样式之前：靠层叠层获胜，而不是靠顺序或特异性
    check(
      style.backgroundColor === 'rgb(1, 2, 3)',
      `consumer unlayered CSS must beat layered component styles, got ${style.backgroundColor}`,
    );
  }

  const trigger = document.querySelector('ld-select .ld-select__trigger');
  check(Boolean(trigger), 'select trigger not rendered');
  if (trigger) {
    // 第二个组件同样受组件层管束，且未被第一个组件的样式影响
    check(
      getComputedStyle(trigger).cursor === 'pointer',
      `select styles missing, cursor=${getComputedStyle(trigger).cursor}`,
    );
  }

  document.documentElement.dataset.testStatus = failures.length ? 'failed' : 'passed';
  document.title = failures.length
    ? failures.join(' | ')
    : 'Cascade layers ordered and consumer unlayered CSS wins';
};

run().catch((error) => {
  document.documentElement.dataset.testStatus = 'failed';
  document.title = `unexpected error: ${error?.message || error}`;
});
