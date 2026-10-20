import { html, nothing, render } from 'lit';
import {
  registerButton,
  registerInput,
  registerPasswordInput,
  registerTextarea,
} from '../src/index.js';
import { spread } from '../src/directives/spread.js';

let checks = 0;
function check(condition, description) {
  if (!condition) throw new Error(description);
  checks++;
}

async function run() {
  registerButton();
  registerInput();
  registerPasswordInput();
  registerTextarea();
  const container = document.createElement('div');
  document.body.append(container);
  const host = {};
  let calls = 0;
  let replacementCalls = 0;
  function first() {
    check(this === host, "Event handlers use Lit's host");
    calls++;
  }
  const props = {
    name: 'amount',
    type: 'number',
    required: true,
    min: 0,
    max: 10,
    step: 2,
    autocomplete: 'off',
    inputmode: 'decimal',
    enterkeyhint: 'done',
    list: 'amounts',
    '.value': '4',
    '@ld-input': first,
    'aria-disabled': false,
    'data-active': false,
  };
  const view = (bindings) =>
    html`<form id="native-form"><ld-input ${spread(bindings)}></ld-input></form>`;
  const root = render(view(props), container, { host });
  const element = container.querySelector('ld-input');
  await element.updateComplete;
  const input = element.querySelector('input');
  const form = container.querySelector('form');
  check(input.required && input.name === 'amount', 'Native required and name are forwarded');
  check(
    input.min === '0' && input.max === '10' && input.step === '2',
    'Zero and numeric constraints survive',
  );
  check(
    input.autocomplete === 'off' && input.inputMode === 'decimal',
    'Autocomplete and inputmode are forwarded',
  );
  check(
    input.enterKeyHint === 'done' && input.getAttribute('list') === 'amounts',
    'Keyboard hint and list are forwarded',
  );
  check(
    input.value === '4' && new FormData(form).get('amount') === '4',
    'Property binding participates in native FormData',
  );
  check(
    element.getAttribute('aria-disabled') === 'false' &&
      element.getAttribute('data-active') === 'false',
    'ARIA/data booleans remain strings',
  );
  input.value = '';
  check(
    input.validity.valueMissing && !form.checkValidity(),
    'Required is enforced by the browser',
  );
  input.value = '-1';
  check(input.validity.rangeUnderflow, 'Minimum is enforced');
  input.value = '11';
  check(input.validity.rangeOverflow, 'Maximum is enforced');
  input.value = '3';
  check(input.validity.stepMismatch, 'Step is enforced');
  input.value = '6';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await element.updateComplete;
  check(calls === 1 && element.value === '6', 'Custom events and input state are preserved');
  props['@ld-input'] = () => replacementCalls++;
  props['.value'] = '8';
  props.required = false;
  delete props.min;
  render(view(props), container);
  await element.updateComplete;
  check(
    !input.required && !input.hasAttribute('min') && input.value === '8',
    'In-place object edits and removed attributes update',
  );
  input.dispatchEvent(new Event('input', { bubbles: true }));
  check(calls === 1 && replacementCalls === 1, 'Event replacement removes the previous listener');
  render(view(props), container);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  check(replacementCalls === 2, 'Repeated rendering does not duplicate listeners');
  root.setConnected(false);
  check(
    element.value === '' && !element.hasAttribute('name'),
    'Disconnect restores properties and attributes',
  );
  root.setConnected(true);
  await element.updateComplete;
  check(input.value === '8' && input.name === 'amount', 'Reconnect reapplies current props');
  render(view(null), container);
  await element.updateComplete;
  check(
    input.value === '' && !input.hasAttribute('max') && !input.hasAttribute('autocomplete'),
    'Null clears bindings',
  );
  input.dispatchEvent(new Event('input', { bubbles: true }));
  check(replacementCalls === 2, 'Removed event bindings stop firing');

  const raw = document.createElement('div');
  container.append(raw);
  const rawView = (p) => html`<button title="original" ${p}>Native</button>`;
  let rawCalls = 0;
  const rawProps = {
    title: 'new',
    '?disabled': true,
    '@click': () => rawCalls++,
    '.payload': { nested: true },
  };
  render(rawView(spread(rawProps)), raw);
  const native = raw.querySelector('button');
  check(
    native.disabled && native.payload === rawProps['.payload'],
    'Native elements support booleans and object properties',
  );
  rawProps['?disabled'] = false;
  render(rawView(spread(rawProps)), raw);
  native.click();
  check(rawCalls === 1, 'Native events work after enabling');
  render(rawView(nothing), raw);
  check(
    native.title === 'original' && native.payload === undefined,
    'Removing the directive restores original values',
  );
  native.click();
  check(rawCalls === 1, 'Removing the directive detaches listeners');
  const opts = Object.assign(() => rawCalls++, { once: true });
  rawProps['@click'] = opts;
  render(rawView(spread(rawProps)), raw);
  native.click();
  native.click();
  check(rawCalls === 2, 'Listener options are respected');
  opts.once = false;
  render(rawView(spread(rawProps)), raw);
  native.click();
  native.click();
  check(rawCalls === 4, 'In-place listener option changes are respected');

  const password = document.createElement('ld-password-input');
  Object.assign(password, {
    name: 'password',
    required: true,
    minlength: 8,
    pattern: '[a-z]+',
    autocomplete: 'new-password',
  });
  form.append(password);
  await password.updateComplete;
  const secret = password.querySelector('input');
  check(
    secret.type === 'password' && secret.required && secret.minLength === 8,
    'PasswordInput inherits native attributes',
  );
  check(
    secret.pattern === '[a-z]+' && secret.autocomplete === 'new-password',
    'Password pattern/autocomplete are forwarded',
  );
  secret.value = '123';
  check(secret.validity.patternMismatch, 'Pattern is enforced');
  const notes = document.createElement('ld-textarea');
  Object.assign(notes, {
    name: 'notes',
    value: 'Hello',
    required: true,
    minlength: 3,
    autocomplete: 'off',
    inputmode: 'text',
    enterkeyhint: 'send',
    form: 'native-form',
  });
  container.append(notes);
  await notes.updateComplete;
  const textarea = notes.querySelector('textarea');
  check(
    textarea.required && textarea.minLength === 3 && textarea.autocomplete === 'off',
    'Textarea forwards native constraints',
  );
  check(
    textarea.form === form && new FormData(form).get('notes') === 'Hello',
    'External form association works',
  );

  const submit = document.createElement('ld-button');
  Object.assign(submit, {
    type: 'submit',
    name: 'action',
    value: 'save',
    form: 'native-form',
    formaction: '/save',
    formmethod: 'post',
    formenctype: 'multipart/form-data',
    formtarget: '_blank',
    formnovalidate: true,
  });
  submit.textContent = 'Save';
  container.append(submit);
  await submit.updateComplete;
  const button = submit.querySelector('button');
  check(
    button.form === form && button.name === 'action' && button.value === 'save',
    'Button form attributes are forwarded',
  );
  check(
    button.formMethod === 'post' &&
      button.formEnctype === 'multipart/form-data' &&
      button.formTarget === '_blank' &&
      button.formNoValidate &&
      button.getAttribute('formaction') === '/save',
    'Button submit overrides are forwarded',
  );
  let submissions = 0;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submissions++;
    check(event.submitter === button, 'Native submitter is retained');
  });
  button.click();
  check(submissions === 1, 'Native submit behavior works');
  submit.loading = true;
  await submit.updateComplete;
  button.click();
  check(button.disabled && submissions === 1, 'Loading prevents native form submission');
  submit.loading = false;
  await submit.updateComplete;
  check(!button.disabled, 'Button re-enables after loading');

  element.maxlength = 0;
  element.minlength = 0;
  element.min = 0;
  element.max = 0;
  element.step = 'any';
  element.autocomplete = 'section-order shipping postal-code';
  await element.updateComplete;
  check(input.maxLength === 0 && input.minLength === 0, 'Zero length constraints are retained');
  check(input.min === '0' && input.max === '0', 'Zero numeric bounds are retained');
  check(input.step === 'any', 'Native string step values remain supported');
  check(
    input.autocomplete === 'section-order shipping postal-code',
    'Composite native autocomplete tokens remain supported',
  );
  Object.assign(element, {
    maxlength: undefined,
    minlength: undefined,
    min: undefined,
    max: undefined,
    step: undefined,
    autocomplete: undefined,
    enterkeyhint: undefined,
  });
  await element.updateComplete;
  check(
    ['maxlength', 'minlength', 'min', 'max', 'step', 'autocomplete', 'enterkeyhint'].every(
      (name) => !input.hasAttribute(name),
    ),
    'Unset optional attributes are removed instead of serialized as undefined or empty defaults',
  );
  Object.assign(submit, { formmethod: 'dialog', formtarget: 'resultFrame' });
  await submit.updateComplete;
  check(
    button.formMethod === 'dialog' && button.formTarget === 'resultFrame',
    'Native method and named form targets remain supported',
  );
  Object.assign(submit, {
    formaction: undefined,
    formmethod: undefined,
    formenctype: undefined,
    formtarget: undefined,
  });
  await submit.updateComplete;
  check(
    ['formaction', 'formmethod', 'formenctype', 'formtarget'].every(
      (name) => !button.hasAttribute(name),
    ),
    'Unset submit overrides are removed so the parent form defaults apply',
  );
  return checks;
}

run()
  .then((count) => {
    document.body.dataset.testStatus = 'passed';
    document.title = `${count} native attribute / spread checks passed`;
  })
  .catch((error) => {
    document.body.dataset.testStatus = 'failed';
    document.body.textContent = error.stack;
  });
