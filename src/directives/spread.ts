import { noChange, nothing } from 'lit';
import { AsyncDirective } from 'lit/async-directive.js';
import { directive, PartType } from 'lit/directive.js';
import type { ElementPart, PartInfo } from 'lit/directive.js';

/** 普通键绑定 attribute；.key 绑定 property；?key 绑定布尔属性；@event 绑定事件。 */
export type SpreadProps = Readonly<Record<string, unknown>>;

type Listener = EventListenerOrEventListenerObject & AddEventListenerOptions;
type Binding = { restore: () => void; value: unknown; options?: AddEventListenerOptions };

class SpreadDirective extends AsyncDirective {
  private element?: Element;
  private props: SpreadProps = {};
  private bindings = new Map<string, Binding>();
  private host?: object;

  constructor(info: PartInfo) {
    super(info);
    if (info.type !== PartType.ELEMENT) {
      throw new Error('spread() must be used inside an opening element tag');
    }
  }

  render(_props?: SpreadProps | null) {
    return noChange;
  }

  update(part: ElementPart, [props]: [SpreadProps?]) {
    this.element = part.element;
    this.host = part.options?.host;
    // Copy keys and values so in-place edits are detected on the next render.
    this.props = { ...props };
    if (this.isConnected) this.apply();
    return noChange;
  }

  private apply() {
    const element = this.element!;
    for (const [key, binding] of this.bindings) {
      if (!Object.prototype.hasOwnProperty.call(this.props, key)) {
        binding.restore();
        this.bindings.delete(key);
      }
    }
    for (const [key, value] of Object.entries(this.props)) {
      const previous = this.bindings.get(key);
      if (key.startsWith('@')) {
        const listener = value as Listener | null | undefined;
        const options = {
          capture: !!listener?.capture,
          once: !!listener?.once,
          passive: !!listener?.passive,
        };
        if (
          previous &&
          Object.is(previous.value, value) &&
          previous.options?.capture === options.capture &&
          previous.options?.once === options.once &&
          previous.options?.passive === options.passive
        )
          continue;
        previous?.restore();
        this.bindings.delete(key);
        if (value == null || value === nothing) continue;
        if (
          typeof listener !== 'function' &&
          (typeof listener !== 'object' || !listener || typeof listener.handleEvent !== 'function')
        ) {
          throw new TypeError(`${key} must be a function or an EventListener object`);
        }
        const event = key.slice(1);
        const callback = (event: Event) => {
          if (typeof listener === 'function') listener.call(this.host ?? element, event);
          else listener.handleEvent(event);
        };
        element.addEventListener(event, callback, options);
        this.bindings.set(key, {
          value,
          options,
          restore: () => element.removeEventListener(event, callback, options),
        });
      } else if (key.startsWith('.')) {
        const name = key.slice(1);
        const target = element as unknown as Record<string, unknown>;
        if (!previous) {
          const original = target[name];
          this.bindings.set(key, {
            value,
            restore: () => {
              target[name] = original;
            },
          });
        }
        target[name] = value === nothing ? undefined : value;
      } else {
        const name = key.startsWith('?') ? key.slice(1) : key;
        if (!previous) {
          const original = element.getAttribute(name);
          this.bindings.set(key, {
            value,
            restore: () => {
              if (original === null) element.removeAttribute(name);
              else element.setAttribute(name, original);
            },
          });
        }
        if (key.startsWith('?')) {
          element.toggleAttribute(name, value !== nothing && !!value);
        } else if (value == null || value === nothing) {
          element.removeAttribute(name);
        } else if (typeof value === 'boolean' && !/^(aria-|data-)/.test(name)) {
          element.toggleAttribute(name, value);
        } else {
          element.setAttribute(name, String(value));
        }
      }
    }
  }

  protected disconnected() {
    for (const binding of this.bindings.values()) binding.restore();
    this.bindings.clear();
  }

  protected reconnected() {
    this.apply();
  }
}

/** 批量绑定元素，移除键或指令时恢复绑定前的值。与其他绑定不要同时控制同一个键。 */
export const spread = directive(SpreadDirective);
