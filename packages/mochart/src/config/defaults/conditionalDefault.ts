export function conditionalDefault(rules, configWithRegularDefaults, ...extraArgs) {
  let conditionalFunction: (() => any) & { rules?: any[] } = () => rules.find(rule => rule.condition(configWithRegularDefaults, ...extraArgs)).default;
  conditionalFunction.rules = rules;
  return conditionalFunction;
}

export function getActualDefaults(conditionalDefaults) {
  const keys = Object.keys(conditionalDefaults);
  const actualDefaults = {};
  for (let key of keys) {
    actualDefaults[key] = conditionalDefaults[key]();
  }
  return actualDefaults;
}

export const defaultRule = { condition: () => true, suffix: null };