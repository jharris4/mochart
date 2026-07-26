import React from 'react';
import Icon from '../misc/Icon';

import { getGallerySections } from '@mochart/demo-common';
import type { GalleryItem, GallerySection } from '@mochart/demo-common';

import { SiteRootButton, ThemeToggleButton } from '../misc/ModeSwitcher';

import type { DemoData } from '../../types';

interface GalleryPageProps {
  demoData: DemoData;
  siteRootUrl?: string;
  onOpenDemo: (demoId: string) => void;
  onOpenPage: (mode: 'transition' | 'rotation') => void;
}

const pageIcons: Record<'transition' | 'rotation', string> = {
  transition: 'right-left',
  rotation: 'repeat'
};

function GalleryListItem({ item, onOpenDemo, onOpenPage }: { item: GalleryItem } & Pick<GalleryPageProps, 'onOpenDemo' | 'onOpenPage'>) {
  return (
    <button type="button" className="demo-list-item"
      onClick={() => {
        if (item.kind === 'demo') {
          onOpenDemo(item.id);
        }
        else {
          onOpenPage(item.mode);
        }
      }}>
      {item.kind === 'page' ? <Icon fixedWidth name={pageIcons[item.mode]} /> : null}
      <span className="mochart-demo-item-title">{item.title}</span>
      {item.description !== void 0 ? <span className="mochart-demo-item-description">{item.description}</span> : null}
    </button>
  );
}

function GallerySectionView({ section, onOpenDemo, onOpenPage }: { section: GallerySection } & Pick<GalleryPageProps, 'onOpenDemo' | 'onOpenPage'>) {
  const header = (
    <>
      <span className="mochart-demo-gallery-section-title">{section.title}</span>
      {section.hint !== void 0 ? <span className="mochart-demo-gallery-section-hint">{section.hint}</span> : null}
    </>
  );
  const list = (
    <div className="demo-list">
      {section.items.map(item => (
        <GalleryListItem key={item.kind === 'demo' ? 'demo-' + item.id : 'page-' + item.mode}
          item={item} onOpenDemo={onOpenDemo} onOpenPage={onOpenPage} />
      ))}
    </div>
  );
  if (!section.collapsed) {
    return (
      <section className="mochart-demo-gallery-section">
        <div className="mochart-demo-gallery-section-header">{header}</div>
        {list}
      </section>
    );
  }
  // Collapsed sections use native details/summary: no state to manage and
  // keyboard/screen-reader behavior comes for free.
  return (
    <details className="mochart-demo-gallery-section">
      <summary className="mochart-demo-gallery-section-header">
        <Icon fixedWidth name="flask" />
        {header}
      </summary>
      {list}
    </details>
  );
}

export default function GalleryPage({ demoData, siteRootUrl, onOpenDemo, onOpenPage }: GalleryPageProps) {
  return (
    <div className="mochart-demo-container">
      <div className="mochart-demo-gallery-header">
        <SiteRootButton siteRootUrl={siteRootUrl} />
        <ThemeToggleButton />
      </div>
      <div className="mochart-demo-content-pane">
        <div className="mochart-demo-gallery">
          {getGallerySections(demoData).map(section => (
            <GallerySectionView key={section.key} section={section} onOpenDemo={onOpenDemo} onOpenPage={onOpenPage} />
          ))}
        </div>
      </div>
    </div>
  );
}
