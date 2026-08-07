import { createElement } from 'react';
import { createPortal } from 'react-dom';
import type { ReactPortal } from 'react';
import type { PlaceholderComponent, PlaceholderProps } from './types.js';

// Maps the wrapper's component props to the core's DOM-factory prop names.
const FACTORY_PROP_NAMES: Record<string, string> = {
  loadingComponent: 'getLoadingComponent',
  errorComponent: 'getErrorComponent',
  noDataComponent: 'getNoDataComponent',
  noSizeComponent: 'getNoSizeComponent',
  noSeriesComponent: 'getNoSeriesComponent',
  configErrorComponent: 'getConfigErrorComponent'
};

interface PlaceholderSlot {
  component: PlaceholderComponent;
  context: PlaceholderProps | null;
  container: HTMLDivElement;
  factory: (context: PlaceholderProps) => Node;
}

export interface PlaceholderAdapter {
  transform(props: Record<string, any>): Record<string, any>;
  // property signatures: these are passed unbound to useSyncExternalStore
  subscribe: (listener: () => void) => () => void;
  getPortals: () => ReactPortal[];
}

/**
 * Adapts placeholder component props into the DOM-node factories the core
 * expects: each slot keeps one persistent container div the factory returns
 * synchronously, and the component renders into it through a portal from the
 * host tree — so placeholders inherit the host app's context providers. The
 * host subscribes and re-renders `getPortals()` whenever a slot changes.
 */
export function createPlaceholderAdapter(): PlaceholderAdapter {
  const slots = new Map<string, PlaceholderSlot>();
  const listeners = new Set<() => void>();
  let portals: ReactPortal[] = [];

  function notify(): void {
    portals = [];
    for (const [propName, slot] of slots) {
      if (slot.context) {
        portals.push(createPortal(createElement(slot.component, slot.context), slot.container, propName));
      }
    }
    for (const listener of listeners) {
      listener();
    }
  }

  function getSlot(propName: string, component: PlaceholderComponent): PlaceholderSlot {
    let slot = slots.get(propName);
    if (!slot) {
      const container = document.createElement('div');
      // The container is a neutral wrapper; the placeholder component owns layout.
      container.style.display = 'contents';
      slot = {
        component,
        context: null,
        container,
        factory: (context: PlaceholderProps) => {
          const current = slots.get(propName)!;
          current.context = context;
          notify();
          return current.container;
        }
      };
      slots.set(propName, slot);
    }
    if (slot.component !== component) {
      slot.component = component;
      if (slot.context) {
        notify();
      }
    }
    return slot;
  }

  return {
    transform(props: Record<string, any>): Record<string, any> {
      const out = { ...props };
      for (const propName of Object.keys(FACTORY_PROP_NAMES)) {
        const component = out[propName] as PlaceholderComponent | undefined;
        delete out[propName];
        if (component) {
          out[FACTORY_PROP_NAMES[propName]] = getSlot(propName, component).factory;
        } else {
          const slot = slots.get(propName);
          if (slot?.context) {
            slot.context = null;
            notify();
          }
        }
      }
      return out;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getPortals(): ReactPortal[] {
      return portals;
    }
  };
}
