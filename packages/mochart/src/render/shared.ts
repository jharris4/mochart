export function shallowEqual(a: any, b: any): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  for (const key in a) {
    if (!(key in b)) {
      return false;
    }
  }
  for (const key in b) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}

// Deferred callbacks (didMount, didUpdate, setState callbacks) run once the
// outermost mount/update finishes, i.e. after the DOM is fully written —
// matching the old vdom's commit queue so measurement code keeps working.
let commitQueue: (() => void)[] = [];
let workDepth = 0;

export function enqueue(callback: () => void): void {
  commitQueue.push(callback);
}

function flushCommitQueue(): void {
  while (commitQueue.length > 0) {
    const callbacks = commitQueue;
    commitQueue = [];
    for (const callback of callbacks) {
      callback();
    }
  }
}

export function beginWork(): void {
  workDepth++;
}

export function endWork(): void {
  workDepth--;
  if (workDepth === 0) {
    flushCommitQueue();
  }
}
