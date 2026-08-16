/** The per-category callbacks a series component routes its shape events to. */
export interface CategoryCallbacks {
  onCategoryEnter: (categoryIndex: number) => void;
  onCategoryLeave: (categoryIndex: number) => void;
  onCategoryClick: (categoryIndex: number, event: Event) => void;
}

/** The DOM handlers of one shape at a category index. */
export interface CategoryHandlers {
  onMouseEnter: (event: Event) => void;
  onMouseLeave: (event: Event) => void;
  onClick: (event: Event) => void;
}

/**
 * Per-index shape handlers created once and reused across syncs, so a shape's event props keep
 * their identity frame to frame; the current callbacks are read at call time.
 */
export class CategoryHandlerCache {
  private readonly handlers: CategoryHandlers[] = [];

  constructor(private readonly callbacks: () => CategoryCallbacks) {}

  get(categoryIndex: number): CategoryHandlers {
    let handlers = this.handlers[categoryIndex];
    if (handlers === undefined) {
      const { callbacks } = this;
      handlers = this.handlers[categoryIndex] = {
        onMouseEnter: () => { callbacks().onCategoryEnter(categoryIndex); },
        onMouseLeave: () => { callbacks().onCategoryLeave(categoryIndex); },
        onClick: (event: Event) => { callbacks().onCategoryClick(categoryIndex, event); }
      };
    }
    return handlers;
  }
}
