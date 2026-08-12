import { createComponent, reflectComponentType } from '@angular/core';
import type { ApplicationRef, ComponentRef, EnvironmentInjector } from '@angular/core';
import type { PlaceholderComponent, PlaceholderProps } from './types.js';

// Maps the wrapper's component inputs to the core's DOM-factory prop names.
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
  container: HTMLDivElement;
  ref: ComponentRef<unknown> | null;
  refComponent: PlaceholderComponent | null;
  inputNames: Set<string>;
  factory: (context: PlaceholderProps) => Node;
}

export interface PlaceholderAdapter {
  transform(props: Record<string, any>): Record<string, any>;
  destroy(): void;
}

/**
 * Adapts placeholder component inputs into the DOM-node factories the core
 * expects: each slot keeps one persistent container div that a component
 * instance is rendered into, so repeat factory calls update inputs in place.
 * The factory identity is stable per slot; component changes flow through
 * `transform` and take effect on the next factory call.
 */
export function createPlaceholderAdapter(environmentInjector: EnvironmentInjector, applicationRef: ApplicationRef): PlaceholderAdapter {
  const slots = new Map<string, PlaceholderSlot>();

  function renderSlot(slot: PlaceholderSlot, context: PlaceholderProps): Node {
    if (slot.ref !== null && slot.refComponent !== slot.component) {
      slot.ref.destroy();
      slot.ref = null;
      slot.container.textContent = '';
    }
    if (slot.ref === null) {
      const hostElement = document.createElement('div');
      hostElement.style.display = 'contents';
      slot.container.appendChild(hostElement);
      slot.ref = createComponent(slot.component, { environmentInjector, hostElement });
      slot.refComponent = slot.component;
      // Only chart-context keys the component actually declares as inputs are
      // applied (setInput throws on unknown inputs).
      slot.inputNames = new Set((reflectComponentType(slot.component)?.inputs ?? []).map((input) => input.templateName));
      applicationRef.attachView(slot.ref.hostView);
    }
    for (const key of Object.keys(context) as (keyof PlaceholderProps)[]) {
      if (slot.inputNames.has(key)) {
        slot.ref.setInput(key, context[key]);
      }
    }
    slot.ref.changeDetectorRef.detectChanges();
    return slot.container;
  }

  function getSlot(propName: string, component: PlaceholderComponent): PlaceholderSlot {
    let slot = slots.get(propName);
    if (!slot) {
      const container = document.createElement('div');
      // The container is a neutral wrapper; the placeholder component owns layout.
      container.style.display = 'contents';
      slot = {
        component,
        container,
        ref: null,
        refComponent: null,
        inputNames: new Set(),
        factory: (context: PlaceholderProps) => renderSlot(slots.get(propName)!, context)
      };
      slots.set(propName, slot);
    }
    slot.component = component;
    return slot;
  }

  // Destroys a slot's component instance and forgets it; a later input gets a fresh slot.
  function releaseSlot(propName: string): void {
    const slot = slots.get(propName);
    if (!slot) {
      return;
    }
    slot.ref?.destroy();
    slot.ref = null;
    slots.delete(propName);
  }

  return {
    transform(props: Record<string, any>): Record<string, any> {
      const out = { ...props };
      for (const propName of Object.keys(FACTORY_PROP_NAMES)) {
        const component = out[propName] as PlaceholderComponent | undefined;
        delete out[propName];
        if (component) {
          out[FACTORY_PROP_NAMES[propName]] = getSlot(propName, component).factory;
        }
        else {
          // the chart falls back to its built-in placeholder, so nothing keeps this instance alive
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
