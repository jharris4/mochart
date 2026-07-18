// Tiny DOM helpers shared by every component in this demo. This package is
// the no-framework peer of the framework galleries, so components are plain
// factory functions returning DOM elements plus targeted update methods —
// there is deliberately no vdom, reactivity, or template layer here.

export type Child = Node | string | null | undefined;

export interface ElOptions {
  className?: string;
  id?: string;
  style?: string;
  attrs?: Record<string, string | undefined>;
  text?: string;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElOptions = {},
  children: Child[] = []
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options.className !== undefined) {
    element.className = options.className;
  }
  if (options.id !== undefined) {
    element.id = options.id;
  }
  if (options.style !== undefined) {
    element.setAttribute('style', options.style);
  }
  if (options.attrs !== undefined) {
    for (const [name, value] of Object.entries(options.attrs)) {
      if (value !== undefined) {
        element.setAttribute(name, value);
      }
    }
  }
  if (options.text !== undefined) {
    element.textContent = options.text;
  }
  for (const child of children) {
    if (child !== null && child !== undefined) {
      element.append(child);
    }
  }
  return element;
}

/** Toggle the `active` class the demo css uses to show/hide mounted tabs. */
export function setActiveClass(element: HTMLElement, active: boolean): void {
  element.classList.toggle('active', active);
}

// ---------------------------------------------------------------------------
// Icon — Font Awesome 6 solid icon (css classes only); relies on the
// `@fortawesome/fontawesome-free` css being imported.
// ---------------------------------------------------------------------------

export interface IconOptions {
  size?: string;
  fixedWidth?: boolean;
  flip?: string;
}

export function icon(name: string, options: IconOptions = {}): HTMLSpanElement {
  const list = ['fa-solid', `fa-${name}`];
  if (options.size) {
    list.push(`fa-${options.size}`);
  }
  if (options.fixedWidth) {
    list.push('fa-fw');
  }
  if (options.flip) {
    list.push(`fa-flip-${options.flip}`);
  }
  return el('span', { className: list.join(' '), attrs: { 'aria-hidden': 'true' } });
}

// ---------------------------------------------------------------------------
// ButtonWithTooltip — the native title attribute covers the hint, `label`
// renders visible text beside the icon, `pressed` marks a toggle button
// (aria-pressed + active styling).
// ---------------------------------------------------------------------------

export interface ButtonOptions {
  id: string;
  tooltipText?: string;
  disabled?: boolean;
  onClick: () => void;
  color?: string;
  label?: string;
  pressed?: boolean;
  ariaLabel?: string;
  content: Child[];
}

export interface ButtonHandle {
  el: HTMLElement;
  setDisabled(disabled: boolean): void;
  setPressed(pressed: boolean): void;
  setLabel(label: string): void;
  setTooltip(tooltipText: string): void;
  setContent(content: Child[]): void;
}

export function buttonWithTooltip(options: ButtonOptions): ButtonHandle {
  const color = options.color ?? 'secondary';
  const button = el('button', {
    id: options.id,
    className: `btn btn-${color}` + (options.pressed ? ' active' : ''),
    attrs: {
      type: 'button',
      title: options.tooltipText,
      'aria-label': options.ariaLabel,
      'aria-pressed': options.pressed === undefined ? undefined : String(options.pressed)
    }
  });
  button.disabled = options.disabled ?? false;
  button.addEventListener('click', options.onClick);

  const labelSpan = el('span', { className: 'btn-label' });
  let hasLabel = false;

  function setContent(content: Child[]): void {
    button.replaceChildren();
    for (const child of content) {
      if (child !== null && child !== undefined) {
        button.append(child);
      }
    }
    if (hasLabel) {
      button.append(labelSpan);
    }
  }

  function setLabel(label: string): void {
    labelSpan.textContent = label;
    if (!hasLabel) {
      hasLabel = true;
      button.append(labelSpan);
    }
  }

  setContent(options.content);
  if (options.label !== undefined) {
    setLabel(options.label);
  }

  return {
    el: el('span', { className: 'button-with-tooltip' }, [button]),
    setDisabled(disabled: boolean) {
      button.disabled = disabled;
    },
    setPressed(pressed: boolean) {
      button.classList.toggle('active', pressed);
      button.setAttribute('aria-pressed', String(pressed));
    },
    setLabel,
    setTooltip(tooltipText: string) {
      button.title = tooltipText;
    },
    setContent
  };
}

// ---------------------------------------------------------------------------
// TextAreaContent — the resizable JSON editor pane (css does the sizing).
// ---------------------------------------------------------------------------

export interface TextAreaHandle {
  el: HTMLElement;
  getValue(): string;
  setValue(value: string): void;
}

export function textAreaContent(value: string, onChange: (value: string) => void): TextAreaHandle {
  const textarea = el('textarea');
  textarea.value = value;
  textarea.addEventListener('input', () => onChange(textarea.value));
  return {
    el: el('div', { className: 'text-area-content' }, [textarea]),
    getValue: () => textarea.value,
    setValue(nextValue: string) {
      textarea.value = nextValue;
    }
  };
}

// ---------------------------------------------------------------------------
// ErrorTab — error-boundary equivalent of the framework demos' ErrorTab. The
// child is created (and updated) inside a try/catch; on a throw, the pane is
// replaced with the same error alert the other demos render.
// ---------------------------------------------------------------------------

export interface ErrorTabHandle {
  el: HTMLElement;
  /** Run a child update guarded by the boundary. */
  guard(fn: () => void): void;
  setActive(active: boolean): void;
}

export function errorTab(create: () => HTMLElement, active: boolean): ErrorTabHandle {
  const container = el('div', { style: 'display: contents;' });
  let failed = false;
  let failedPane: HTMLElement | null = null;

  function fail(error: unknown): void {
    console.error(error);
    failed = true;
    failedPane = el('div', { className: 'mochart-demo-tab-container error' + (isActive ? ' active' : '') }, [
      el('div', {
        className: 'alert alert-danger text-center mochart-demo-error-message',
        attrs: { role: 'alert' },
        text: 'An Error Occurred'
      })
    ]);
    container.replaceChildren(failedPane);
  }

  let isActive = active;
  try {
    container.append(create());
  }
  catch (error) {
    fail(error);
  }

  return {
    el: container,
    guard(fn: () => void) {
      if (failed) {
        return;
      }
      try {
        fn();
      }
      catch (error) {
        fail(error);
      }
    },
    setActive(active: boolean) {
      isActive = active;
      if (failedPane) {
        setActiveClass(failedPane, active);
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Size observation — the vanilla stand-in for the framework demos' measured
// containers (react-sizer / bind:clientWidth / ResizeController).
// ---------------------------------------------------------------------------

export function observeSize(
  element: HTMLElement,
  onSize: (width: number, height: number) => void
): () => void {
  let lastWidth = -1;
  let lastHeight = -1;
  const report = () => {
    const width = Math.floor(element.clientWidth);
    const height = Math.floor(element.clientHeight);
    if (width !== lastWidth || height !== lastHeight) {
      lastWidth = width;
      lastHeight = height;
      onSize(width, height);
    }
  };
  const observer = new ResizeObserver(report);
  observer.observe(element);
  // ResizeObserver fires its first callback asynchronously; report once the
  // element is connected so mount-time layout doesn't wait a frame.
  queueMicrotask(report);
  return () => observer.disconnect();
}
