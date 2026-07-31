export interface ConditionalDefaultRule<C, E, T> {
  condition: { bivarianceHack(config: C, extraArg: E): boolean }['bivarianceHack'];
  suffix: string | null;
  default: T;
  defaultText?: string | null;
}

export function conditionalDefault<C, E, T>(rules: ConditionalDefaultRule<NoInfer<C>, NoInfer<E>, T>[], configWithRegularDefaults: C, extraArg: E): (() => T) & { rules?: ConditionalDefaultRule<C, E, T>[] } {
  const conditionalFunction: (() => T) & { rules?: ConditionalDefaultRule<C, E, T>[] } = () => rules.find(rule => rule.condition(configWithRegularDefaults, extraArg))!.default;
  conditionalFunction.rules = rules;
  return conditionalFunction;
}

export function getActualDefaults<T extends Record<string, () => unknown>>(conditionalDefaults: T): { [K in keyof T]: ReturnType<T[K]> } {
  const keys = Object.keys(conditionalDefaults);
  const actualDefaults = {} as { [K in keyof T]: ReturnType<T[K]> };
  for (const key of keys) {
    const typedKey = key as keyof T;
    actualDefaults[typedKey] = conditionalDefaults[typedKey]() as ReturnType<T[typeof typedKey]>;
  }
  return actualDefaults;
}

export const defaultRule = { condition: () => true, suffix: null };
