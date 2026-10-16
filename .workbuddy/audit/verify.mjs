import { Window } from '../audit-env/node_modules/happy-dom/lib/index.js';
import { readFileSync, writeFileSync } from 'node:fs';

// DOM state checks only: this is not a browser layout/accessibility test.
const window = new Window({ url: 'http://localhost/' });
for (const key of ['window', 'document', 'customElements', 'Node', 'HTMLElement',
  'Element', 'HTMLSlotElement', 'MutationObserver', 'CustomEvent', 'Event',
  'KeyboardEvent', 'HTMLInputElement', 'HTMLSelectElement', 'Document',
  'CSSStyleSheet', 'ShadowRoot', 'FormData']) {
  globalThis[key] = key === 'window' ? window : window[key];
}
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
await import(process.env.AUDIT_FIXED === '1' ? './dist-fixed/yixi-lit.js' : '../../dist/yixi-lit.js');

async function settle(root) {
  for (let i = 0; i < 5; i++) {
    await root.updateComplete;
    await Promise.all([...root.querySelectorAll('*')].map(el => el.updateComplete));
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
async function mount(markup) {
  const box = document.createElement('div');
  box.innerHTML = markup;
  document.body.append(box);
  await settle(box);
  return box;
}
const results = [];
function record(name, observed, defect) {
  results.push({ name, defect, observed });
}

let reactiveBox = await mount('<ld-switch></ld-switch><ld-input></ld-input><ld-drawer></ld-drawer><ld-checkbox></ld-checkbox>');
const reactiveSwitch = reactiveBox.querySelector('ld-switch');
reactiveSwitch.querySelector('button').click();
await settle(reactiveSwitch);
record('Production class fields shadow Lit reactive accessors', {
  ownCheckedDescriptor: Object.getOwnPropertyDescriptor(reactiveSwitch, 'checked'),
  checkedProperty: reactiveSwitch.checked,
  ariaCheckedAfterClick: reactiveSwitch.querySelector('button').getAttribute('aria-checked'),
  checkedClassAfterClick: reactiveSwitch.querySelector('button').classList.contains('is-checked')
}, reactiveSwitch.checked && reactiveSwitch.querySelector('button').getAttribute('aria-checked') === 'false');
const reactiveInput = reactiveBox.querySelector('ld-input');
reactiveInput.value = 'updated by consumer';
await settle(reactiveInput);
record('External input value assignment does not render', {
  hostValue: reactiveInput.value, innerValue: reactiveInput.querySelector('input').value
}, reactiveInput.querySelector('input').value !== reactiveInput.value);
const reactiveDrawer = reactiveBox.querySelector('ld-drawer');
reactiveDrawer.open = true;
await settle(reactiveDrawer);
record('Example drawer open assignment does not render', {
  openProperty: reactiveDrawer.open,
  panelOpenClass: reactiveDrawer.querySelector('.ld-drawer__panel').classList.contains('is-open')
}, !reactiveDrawer.querySelector('.ld-drawer__panel').classList.contains('is-open'));
reactiveBox.remove();

let box = await mount('<ld-button>original</ld-button>');
let button = box.querySelector('ld-button');
const extra = document.createElement('span');
extra.textContent = 'added later';
button.append(extra);
button.requestUpdate();
await settle(button);
record('Dynamic content is not projected', { parent: extra.parentElement.tagName,
  insideButton: !!extra.closest('button') }, !extra.closest('button'));
const original = button.querySelector('slot').firstChild;
original.remove();
button.requestUpdate();
await settle(button);
record('Removed original content is resurrected', { connected: original.isConnected }, original.isConnected);
box.remove();

box = await mount('<ld-tabs><ld-tab name="a" label="A">Panel A</ld-tab><ld-tab name="b" label="B">Panel B</ld-tab></ld-tabs>');
let tabs = box.querySelector('ld-tabs');
record('Tabs navigation follows the panels in DOM', {
  children: [...tabs.children].map(el => el.tagName),
  panelBeforeNavigation: !!(tabs.querySelector('ld-tab').compareDocumentPosition(tabs.querySelector('.ld-tabs__nav-wrap')) & Node.DOCUMENT_POSITION_FOLLOWING)
}, !!(tabs.querySelector('ld-tab').compareDocumentPosition(tabs.querySelector('.ld-tabs__nav-wrap')) & Node.DOCUMENT_POSITION_FOLLOWING));
tabs.querySelector('ld-tab').label = 'New label';
await settle(tabs);
record('Tab label change leaves parent navigation stale', { navText: tabs.querySelector('.ld-tabs__nav').textContent.trim() }, !tabs.querySelector('.ld-tabs__nav').textContent.includes('New label'));
box.remove();

for (const kind of ['checkbox', 'radio']) {
  box = await mount(`<ld-${kind}-group><ld-${kind} value="a">A</ld-${kind}></ld-${kind}-group>`);
  const group = box.firstElementChild;
  group.disabled = true;
  group.requestUpdate('disabled', false);
  await settle(group);
  group.disabled = false;
  group.requestUpdate('disabled', true);
  await settle(group);
  record(`${kind} group remains disabled after re-enable`, {
    groupDisabled: group.disabled, childDisabled: group.querySelector(`ld-${kind}`).disabled
  }, group.querySelector(`ld-${kind}`).disabled);
  box.remove();
}

box = await mount('<ld-radio-group value="outer"><ld-radio value="outer">Outer</ld-radio><ld-radio-group value="inner"><ld-radio value="inner">Inner</ld-radio></ld-radio-group></ld-radio-group>');
record('Outer group overwrites nested group selection', {
  nestedValue: box.querySelectorAll('ld-radio-group')[1].value,
  nestedChecked: box.querySelectorAll('ld-radio')[1].checked
}, !box.querySelectorAll('ld-radio')[1].checked);
box.remove();

for (const kind of ['drawer', 'dialog']) {
  document.body.style.overflow = '';
  box = await mount(`<ld-${kind} open title="Initially open">Content</ld-${kind}>`);
  const overlay = box.firstElementChild;
  const overflow = document.body.style.overflow;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await settle(overlay);
  record(`Initially open ${kind} does not lock scroll or handle Escape`, {
    overflowAfterOpen: overflow, openAfterEscape: overlay.open
  }, overflow !== 'hidden' && overlay.open);
  box.remove();
}

document.body.style.overflow = '';
box = await mount('<ld-drawer title="A"></ld-drawer><ld-drawer title="B"></ld-drawer>');
const [drawerA, drawerB] = box.querySelectorAll('ld-drawer');
drawerA.open = true;
drawerA.requestUpdate('open', false);
await settle(drawerA);
drawerB.open = true;
drawerB.requestUpdate('open', false);
await settle(drawerB);
drawerA.open = false;
drawerA.requestUpdate('open', true);
await settle(drawerA);
const during = document.body.style.overflow;
drawerB.open = false;
drawerB.requestUpdate('open', true);
await settle(drawerB);
record('Overlapping drawers corrupt body scroll lock', {
  overflowWhileSecondOpen: during, overflowAfterBothClosed: document.body.style.overflow
}, during !== 'hidden' && document.body.style.overflow === 'hidden');
box.remove();
document.body.style.overflow = '';

box = await mount('<form><ld-input name="username" value="alice" required></ld-input><ld-checkbox name="accept" checked>Accept</ld-checkbox></form>');
const form = box.querySelector('form');
record('Host form attributes are not forwarded', {
  submittedFields: [...new FormData(form).entries()],
  innerName: form.querySelector('input').name,
  innerRequired: form.querySelector('input').required
}, [...new FormData(form).entries()].length === 0);
let changeCount = 0;
const input = box.querySelector('ld-input');
input.addEventListener('ld-change', () => changeCount++);
input.querySelector('input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }));
record('Composition confirmation Enter emits change', { changeCount }, changeCount === 1);
box.remove();

box = await mount('<ld-card title="Card">Body</ld-card>');
const card = box.firstElementChild;
const footer = document.createElement('div');
footer.slot = 'footer';
footer.textContent = 'Late footer';
card.append(footer);
card.requestUpdate();
await settle(card);
record('Dynamic named footer is not projected', { parent: footer.parentElement.tagName,
  inFooterSlot: footer.parentElement.matches('slot[name="footer"]')
}, !footer.parentElement.matches('slot[name="footer"]'));
box.remove();

box = await mount('<ld-checkbox>A</ld-checkbox><ld-radio>B</ld-radio><ld-select><ld-option value="a">A</ld-option></ld-select><ld-date-picker></ld-date-picker><ld-tabs><ld-tab label="A">A</ld-tab></ld-tabs>');
record('Main custom interactive surfaces have no tab stop', {
  checkboxFocusable: !!box.querySelector('ld-checkbox').querySelector('input,button,[tabindex]'),
  radioFocusable: !!box.querySelector('ld-radio').querySelector('input,button,[tabindex]'),
  selectFocusable: !!box.querySelector('ld-select').querySelector('input,button,[tabindex]'),
  dateFocusable: !!box.querySelector('ld-date-picker').querySelector('input,button,[tabindex]'),
  tabTabIndex: box.querySelector('[role="tab"]').tabIndex
}, [...box.querySelectorAll('ld-checkbox,ld-radio,ld-select,ld-date-picker')].every(el => !el.querySelector('input,button,[tabindex]')));
box.remove();

const iconCss = readFileSync(new URL('../../src/styles/iconfont/remixicon.css', import.meta.url), 'utf8');
record('Referenced icons missing from bundled font CSS', {
  missing: ['d-arrow-left', 'd-arrow-right', 'check-circle-fill'].filter(name => !iconCss.includes(`.ri-${name}:`))
}, ['d-arrow-left', 'd-arrow-right', 'check-circle-fill'].some(name => !iconCss.includes(`.ri-${name}:`)));

console.log(JSON.stringify({ environment: 'happy-dom; built production ESM; no browser layout assertions', results }, null, 2));
writeFileSync(new URL(process.env.AUDIT_FIXED === '1' ? './results-fixed.json' : './results.json', import.meta.url), JSON.stringify({ environment: 'happy-dom; production ESM; group and overlapping-overlay checks force named requestUpdate to isolate secondary defects', results }, null, 2));
await window.happyDOM.close();
