import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon';

import { demoText, getNotesPanelPosition } from '@mochart/demo-common';

// The "about this demo" button in each mode's navigation row: an info icon that
// opens the demo's `notes` (the detail kept out of its one-sentence gallery
// description) in a popover panel.
//
// Positioning follows ExportShareMenu: the surrounding panes use
// `overflow: hidden`, which would clip a normally-positioned dropdown, so the
// panel is `fixed` at coordinates measured from the trigger. This one opens
// downward from the navigation row (the export menu opens upward from the
// controls row) and is closed on scroll/resize rather than repositioned.
interface Props {
  /** Demo title, shown as the panel heading. */
  title: string;
  /** The demo's notes; nothing renders when there are none. */
  notes?: string;
}

export default function NotesMenu({ title, notes }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close whenever the demo changes under us (history navigation).
  useEffect(() => setOpen(false), [title, notes]);

  // Positioned before paint, so the panel never shows at the wrong spot.
  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords(getNotesPanelPosition(rect, window.innerWidth));
    }
  }, [open]);

  // Close on an outside click or Escape while the panel is open.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    // A fixed panel would drift on scroll/resize; just close it instead.
    const onReflow = () => setOpen(false);
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open]);

  if (notes === undefined) {
    return null;
  }

  return (
    <div className="demo-btn-group mochart-demo-notes-menu" ref={rootRef}>
      <button type="button" ref={triggerRef}
        className={'demo-btn demo-btn-secondary mochart-demo-notes-trigger' + (open ? ' active' : '')}
        aria-haspopup="true" aria-expanded={open}
        title={demoText.demoNotes.trigger.tooltip} aria-label={demoText.demoNotes.trigger.aria}
        onClick={() => setOpen(prev => !prev)}>
        <Icon size="lg" fixedWidth={true} name="circle-info" />
      </button>
      <div className={'demo-menu demo-menu-notes' + (open ? ' open' : '')}
        style={open && coords !== null ? { position: 'fixed', top: coords.top, left: coords.left, margin: 0, zIndex: 1080 } : undefined}>
        <span className="demo-menu-notes-title">{title}</span>
        <span className="demo-menu-notes-body">{notes}</span>
      </div>
    </div>
  );
}
