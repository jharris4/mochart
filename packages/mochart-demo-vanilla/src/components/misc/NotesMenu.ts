import { demoText, getNotesPanelPosition } from '@mochart/demo-common';

import { el, icon } from './dom';

// The "about this demo" button in each mode's navigation row: an info icon that
// opens the demo's `notes` (the detail kept out of its one-sentence gallery
// description) in a popover panel.
//
// Positioning follows ExportShareMenu: the surrounding panes use
// `overflow: hidden`, which would clip a normally-positioned dropdown, so the
// panel is `fixed` at coordinates measured from the trigger. This one opens
// downward from the navigation row (the export menu opens upward from the
// controls row) and is closed on scroll/resize rather than repositioned.
export interface NotesMenuProps {
  /** Demo title, shown as the panel heading. */
  title: string;
  /** The demo's notes; the trigger hides itself when there are none. */
  notes?: string;
}

export interface NotesMenuHandle {
  el: HTMLElement;
  /** Re-point at another demo (history navigation between demos). */
  setDemo(title: string, notes?: string): void;
  destroy(): void;
}

export function notesMenu(props: NotesMenuProps): NotesMenuHandle {
  let open = false;

  const trigger = el('button', {
    className: 'demo-btn demo-btn-secondary mochart-demo-notes-trigger',
    attrs: {
      type: 'button',
      'aria-haspopup': 'true',
      'aria-expanded': 'false',
      title: demoText.demoNotes.trigger.tooltip,
      'aria-label': demoText.demoNotes.trigger.aria
    }
  }, [icon('circle-info', { size: 'lg', fixedWidth: true })]);
  trigger.addEventListener('click', () => (open ? closeMenu() : openMenu()));

  const titleEl = el('span', { className: 'demo-menu-notes-title', text: props.title });
  const bodyEl = el('span', { className: 'demo-menu-notes-body', text: props.notes ?? '' });
  const menu = el('div', { className: 'demo-menu demo-menu-notes' }, [titleEl, bodyEl]);

  const root = el('div', { className: 'demo-btn-group mochart-demo-notes-menu' }, [trigger, menu]);

  function positionMenu(): void {
    const { top, left } = getNotesPanelPosition(trigger.getBoundingClientRect(), window.innerWidth);
    menu.style.position = 'fixed';
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
    menu.style.margin = '0';
    menu.style.zIndex = '1080';
  }

  function openMenu(): void {
    if (open) {
      return;
    }
    open = true;
    positionMenu();
    menu.classList.add('open');
    trigger.classList.add('active');
    trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
  }

  function closeMenu(): void {
    if (!open) {
      return;
    }
    open = false;
    menu.classList.remove('open');
    trigger.classList.remove('active');
    trigger.setAttribute('aria-expanded', 'false');
    menu.removeAttribute('style');
    document.removeEventListener('mousedown', onDocMouseDown);
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('scroll', closeMenu, true);
    window.removeEventListener('resize', closeMenu);
  }

  function onDocMouseDown(event: MouseEvent): void {
    if (!root.contains(event.target as Node)) {
      closeMenu();
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      closeMenu();
    }
  }

  function render(title: string, notes?: string): void {
    titleEl.textContent = title;
    bodyEl.textContent = notes ?? '';
    root.hidden = notes === undefined;
  }

  render(props.title, props.notes);

  return {
    el: root,
    setDemo(title: string, notes?: string) {
      closeMenu();
      render(title, notes);
    },
    destroy() {
      closeMenu();
    }
  };
}
