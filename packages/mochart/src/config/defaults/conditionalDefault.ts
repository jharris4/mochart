export interface ConditionalDefaultRule<C, E, T> {
  condition: { bivarianceHack(config: C, extraArg: E): boolean }['bivarianceHack'];
  suffix: string | null;
  default: T;
  defaultText?: string | null;
}

/** A resolved conditional default: call it to pick the first matching rule. */
export type ConditionalDefaultFunction<T = unknown> = (() => T) & { rules?: ConditionalDefaultRule<any, any, T>[] };

/** A tree of conditional defaults; branches nest the way the config does, so a default can target a nested path. */
export interface ConditionalDefaults {
  [key: string]: ConditionalDefaultFunction<any> | ConditionalDefaults;
}

export type ActualDefaults<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? ReturnType<T[K]> : ActualDefaults<T[K]>;
};

export function conditionalDefault<C, E, T>(rules: ConditionalDefaultRule<NoInfer<C>, NoInfer<E>, T>[], configWithRegularDefaults: C, extraArg: E): (() => T) & { rules?: ConditionalDefaultRule<C, E, T>[] } {
  const conditionalFunction: (() => T) & { rules?: ConditionalDefaultRule<C, E, T>[] } = () => rules.find(rule => rule.condition(configWithRegularDefaults, extraArg))!.default;
  conditionalFunction.rules = rules;
  return conditionalFunction;
}

/** Evaluate a conditional-defaults tree into plain values; the result is deep-merged over the regular defaults. */
export function getActualDefaults<T extends ConditionalDefaults>(conditionalDefaults: T): ActualDefaults<T> {
  const keys = Object.keys(conditionalDefaults);
  const actualDefaults = {} as Record<string, unknown>;
  for (const key of keys) {
    const value = (conditionalDefaults as ConditionalDefaults)[key]!;
    actualDefaults[key] = typeof value === 'function' ? value() : getActualDefaults(value);
  }
  return actualDefaults as ActualDefaults<T>;
}

export const defaultRule = { condition: () => true, suffix: null };
