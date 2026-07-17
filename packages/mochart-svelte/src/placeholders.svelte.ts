// The `.svelte.ts` name lets the svelte plugin compile this file so the
// `$state` rune is available for reactive placeholder props.
import { mount, unmount } from 'svelte';
import type { PlaceholderComponent, PlaceholderProps } from './types';

// Maps the wrapper's component props to the core's DOM-factory prop names.
const FACTORY_PROP_NAMES: Record<string, string> = {
  loadingComponent: 'getLoadingComponent',
  errorComponent: 'getErrorComponent',
  noDataComponent: 'getNoDataComponent',
  noSizeComponent: 'getNoSizeComponent',
  noSeriesComponent: 'getNoSeriesComponent',
  configErrorComponent: 'getConfigErrorComponent'
};

class PlaceholderSlot {
  component: PlaceholderComponent;
  container: HTMLDivElement;
  factory: (context: PlaceholderProps) => Node;
  private mounted: PlaceholderComponent | null = null;
  private instance: Record<string, any> | null = null;
  private props: PlaceholderProps = $state({});

  constructor(component: PlaceholderComponent) {
    this.component = component;
    this.container = document.createElement('div');
    // The container is a neutral wrapper; the placeholder component owns layout.
    this.container.style.display = 'contents';
    this.factory = (context: PlaceholderProps) => this.render(context);
  }

  private render(context: PlaceholderProps): Node {
    for (const key of Object.keys(this.props)) {
      if (!(key in context)) {
        delete (this.props as Record<string, any>)[key];
      }
    }
    Object.assign(this.props, context);
    if (this.instance && this.mounted !== this.component) {
      unmount(this.instance);
      this.instance = null;
    }
    if (!this.instance) {
      this.instance = mount(this.component, { target: this.container, props: this.props });
      this.mounted = this.component;
    }
    return this.container;
  }

  destroy(): void {
    if (this.instance) {
      unmount(this.instance);
      this.instance = null;
    }
  }
}

export interface PlaceholderAdapter {
  transform(props: Record<string, any>): Record<string, any>;
  destroy(): void;
}

/**
 * Adapts placeholder component props into the DOM-node factories the core
 * expects: each slot keeps one persistent container div holding a mounted
 * instance whose reactive props are updated on repeat factory calls. The
 * factory identity is stable per slot; component changes flow through
 * `transform` and take effect (as a remount) on the next factory call.
 */
export function createPlaceholderAdapter(): PlaceholderAdapter {
  const slots = new Map<string, PlaceholderSlot>();

  return {
    transform(props: Record<string, any>): Record<string, any> {
      const out = { ...props };
      for (const propName of Object.keys(FACTORY_PROP_NAMES)) {
        const component = out[propName] as PlaceholderComponent | undefined;
        delete out[propName];
        if (component) {
          let slot = slots.get(propName);
          if (!slot) {
            slot = new PlaceholderSlot(component);
            slots.set(propName, slot);
          }
          slot.component = component;
          out[FACTORY_PROP_NAMES[propName]] = slot.factory;
        }
      }
      return out;
    },
    destroy(): void {
      for (const slot of slots.values()) {
        slot.destroy();
      }
      slots.clear();
    }
  };
}
