import { getGallerySections } from '@mochart/demo-common';
import type { GalleryItem, GallerySection } from '@mochart/demo-common';

import { el, icon } from '../misc/dom';
import { siteRootButton } from '../misc/ModeSwitcher';

import type { DemoData } from '../../types';

export interface GalleryPageProps {
  demoData: DemoData;
  siteRootUrl?: string;
  onOpenDemo: (demoId: string) => void;
  onOpenPage: (mode: 'transition' | 'rotation') => void;
}

export interface GalleryPageHandle {
  el: HTMLElement;
}

const pageIcons: Record<'transition' | 'rotation', string> = {
  transition: 'right-left',
  rotation: 'repeat'
};

export function galleryPage(props: GalleryPageProps): GalleryPageHandle {
  const { demoData, onOpenDemo, onOpenPage } = props;

  function galleryItem(item: GalleryItem): HTMLElement {
    const button = el('button', {
      className: 'list-group-item list-group-item-action',
      attrs: { type: 'button' }
    }, [
      item.kind === 'page' ? icon(pageIcons[item.mode], { fixedWidth: true }) : null,
      el('span', { className: 'mochart-demo-item-title', text: item.title }),
      item.description !== undefined
        ? el('span', { className: 'mochart-demo-item-description', text: item.description })
        : null
    ]);
    button.addEventListener('click', () => {
      if (item.kind === 'demo') {
        onOpenDemo(item.id);
      }
      else {
        onOpenPage(item.mode);
      }
    });
    return button;
  }

  function sectionEl(section: GallerySection): HTMLElement {
    const list = el('div', { className: 'list-group' }, section.items.map(galleryItem));
    const header: (Node | string | null)[] = [
      el('span', { className: 'mochart-demo-gallery-section-title', text: section.title }),
      section.hint !== undefined
        ? el('span', { className: 'mochart-demo-gallery-section-hint', text: section.hint })
        : null
    ];
    if (!section.collapsed) {
      return el('section', { className: 'mochart-demo-gallery-section' }, [
        el('div', { className: 'mochart-demo-gallery-section-header' }, header),
        list
      ]);
    }
    // Collapsed sections use native details/summary: no state to manage and
    // keyboard/screen-reader behavior comes for free.
    const details = el('details', { className: 'mochart-demo-gallery-section' }, [
      el('summary', { className: 'mochart-demo-gallery-section-header' }, [
        icon('flask', { fixedWidth: true }),
        ...header
      ]),
      list
    ]);
    return details;
  }

  const siteRoot = siteRootButton(props.siteRootUrl);
  const container = el('div', { className: 'mochart-demo-container' }, [
    siteRoot !== null ? el('div', { className: 'mochart-demo-gallery-header' }, [siteRoot]) : null,
    el('div', { className: 'mochart-demo-content-pane' }, [
      el('div', { className: 'mochart-demo-gallery' },
        getGallerySections(demoData).map(sectionEl))
    ])
  ]);

  return { el: container };
}
