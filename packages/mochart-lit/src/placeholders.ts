import { nothing, render } from 'lit-html';
import type { PlaceholderProps, PlaceholderTemplate } from './types.js';

// Maps the wrapper's template props to the core's DOM-factory prop names.
const FACTORY_PROP_NAMES: Record<string, string> = {
  loadingTemplate: 'getLoadingComponent',
  errorTemplate: 'getErrorComponent',
  noDataTemplate: 'getNoDataComponent',
  noSizeTemplate: 'getNoSizeComponent',
  noSeriesTemplate: 'getNoSeriesComponent',
  configErrorTemplate: 'getConfigErrorComponent'
};

interface PlaceholderSlot {
  template: PlaceholderTemplate;
  container: HTMLDivElement;
  factory: (context: PlaceholderProps) => Node;
}

export interface PlaceholderAdapter {
  transform(props: Record<string, any>): Record<string, any>;
  destroy(): void;
}

/**
 * Adapts placeholder template props into the DOM-node factories the core
 * expects: each slot keeps one persistent container div that templates are
 * rendered into, so repeat factory calls patch in place. The factory identity
 * is stable per slot; template changes flow through `transform` and take
 * effect on the next factory call.
 */
export function createPlaceholderAdapter(): PlaceholderAdapter {
  const slots = new Map<string, PlaceholderSlot>();

  function getSlot(propName: string, template: PlaceholderTemplate): PlaceholderSlot {
    let slot = slots.get(propName);
    if (!slot) {
      const container = document.createElement('div');
      // The container is a neutral wrapper; the placeholder template owns layout.
      container.style.display = 'contents';
      slot = {
        template,
        container,
        factory: (context: PlaceholderProps) => {
          const current = slots.get(propName)!;
          render(current.template({ ...context }), current.container);
          return current.container;
        }
      };
      slots.set(propName, slot);
    }
    slot.template = template;
    return slot;
  }

  // Clears a slot's rendered template (disconnecting its directives) and forgets it.
  function releaseSlot(propName: string): void {
    const slot = slots.get(propName);
    if (!slot) {
      return;
    }
    render(nothing, slot.container);
    slots.delete(propName);
  }

  return {
    transform(props: Record<string, any>): Record<string, any> {
      const out = { ...props };
      for (const propName of Object.keys(FACTORY_PROP_NAMES)) {
        const template = out[propName] as PlaceholderTemplate | undefined;
        delete out[propName];
        if (template) {
          out[FACTORY_PROP_NAMES[propName]] = getSlot(propName, template).factory;
        }
        else {
          // the chart falls back to its built-in placeholder, so nothing keeps this render alive
          releaseSlot(propName);
        }
      }
      return out;
    },
    destroy(): void {
      for (const propName of [...slots.keys()]) {
        releaseSlot(propName);
      }
    }
  };
}
