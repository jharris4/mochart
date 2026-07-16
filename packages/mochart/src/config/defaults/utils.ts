export function isObject(v) {
  return v !== null && v !== void 0 && typeof v === "object";
}

export function getValueOrDefault(config, defaults, key) {
  return (isObject(config) && config[key] !== void 0) ? config[key] : defaults[key];
}