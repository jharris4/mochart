import validators from './validators';
import type { Validator } from 'valide';

type ConfigObject = Record<string, unknown>;
type ValidatorMap = Record<string, Validator>;

function isConfigObject(value: unknown): value is ConfigObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const objectValidator = validators.object();

const suffix = ' - ';
const maxInvalidProperties = 10;

function prefixMessage(prefix: string, i: number | undefined = void 0): string {
  return i === void 0 ? prefix + suffix : prefix + '[' + i + ']' + suffix;
}

function prefixPropertyErrorMessage(prefix: string, property: string, message: string, i: number | undefined = void 0): string {
  return prefixMessage(prefix, i) + property + suffix + message;
}

function prefixErrorMessage(prefix: string, message: string, i: number | undefined = void 0): string {
  return prefixMessage(prefix, i) + message;
}

export function getPropertyMessage(prefix: string, property: string, message: string, i: number | undefined = void 0): string {
  return prefixPropertyErrorMessage(prefix, property, message, i);
}

export function getMessage(prefix: string, message: string): string {
  return prefixMessage(prefix) + message;
}

export function addErrorMessage(prefix: string, config: unknown, validator: Validator, errorMessages: string[]): void {
  let isValid = validator(config);
  if (!isValid) {
    errorMessages.push(
      prefixErrorMessage(prefix, validator.getErrorMessage(config)));
  }
}

export function addErrorMessages(prefix: string, config: unknown, validatorMap: ValidatorMap, errorMessages: string[], i: number | undefined = void 0): void {
  addErrorMessagesInternal(prefix, config, validatorMap, errorMessages, i, true);
}

function addErrorMessagesInternal(prefix: string, config: unknown, validatorMap: ValidatorMap, errorMessages: string[], i: number | undefined = void 0, all = false): void {
  if (objectValidator(config) && isConfigObject(config)) {
    const validatorKeys = Object.keys(validatorMap);
    const configKeys = Object.keys(config);
    const keys = all ? validatorKeys : configKeys.filter(configKey => validatorMap[configKey] !== void 0)

    for (let key of keys) {
      const validator = validatorMap[key]!;
      let isValid = validator(config[key]);
      if (!isValid) {
        errorMessages.push(
          prefixPropertyErrorMessage(prefix, key, validator.getErrorMessage(config[key]), i));
      }
    }
  }
}

export function addWarningMessages(prefix: string, config: unknown, propertyMap: Record<string, unknown>, warningMessages: string[], i: number | undefined = void 0): void {
  addWarningMessagesInternal(prefix, config, propertyMap, warningMessages, i, true);
}

function addWarningMessagesInternal(prefix: string, config: unknown, propertyMap: Record<string, unknown>, warningMessages: string[], i: number | undefined = void 0, _all = false): void {
  if (objectValidator(config) && isConfigObject(config)) {
    let invalidProperties: string[] = [];
    let invalidPropertyCount = 0;
    const properties = Object.keys(config);
    for (let property of properties) {
      if (!propertyMap[property]) {
        if (invalidProperties.length < maxInvalidProperties) {
          invalidProperties.push(property);
        }
        invalidPropertyCount++;
      }
    }
    if (invalidPropertyCount > 0) {
      if (invalidPropertyCount > maxInvalidProperties) {
        warningMessages.push(
          prefixErrorMessage(prefix, 'had ' + invalidPropertyCount + ' invalid properties, first ' + maxInvalidProperties + ' are: ' + invalidProperties, i));
      }
      else {
        warningMessages.push(prefixErrorMessage(prefix, 'had ' + invalidPropertyCount + ' invalid properties: ' + invalidProperties, i));
      }
    }
  }
}

function objectWithKeys<T>(object: Record<string, T>, keys: string[]): Record<string, T> {
  const clone: Record<string, T> = {};
  for (let key of keys) {
    if (object[key] !== void 0) {
      clone[key] = object[key];
    }
  }
  return clone;
}

function arrayToMap(array: string[]): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (let item of array) {
    map[item] = true;
  }
  return map;
}

export const DEFAULT = 'Default ';

export function getMessages(sectionKey: string, allKey: string | undefined, uniqueKeys: string[] | undefined, section: unknown, sectionDefaults: unknown, all: unknown, validatorMap: ValidatorMap, onlyAll: boolean, i: number | undefined = void 0) {
  const errorMessages: string[] = [];
  const warningMessages: string[] = [];
  const validatorKeys = Object.keys(validatorMap);
  let providedKeyMap: ConfigObject = {};

  if (!onlyAll && objectValidator(sectionDefaults) && isConfigObject(sectionDefaults)) {
    providedKeyMap = {...providedKeyMap, ...sectionDefaults};

    if (i === void 0 || i === 0) {
      const sectionDefaultKeys = Object.keys(sectionDefaults).filter(key => sectionDefaults[key] !== void 0);
      const defaultValidators = objectWithKeys(validatorMap, sectionDefaultKeys);

      addErrorMessagesInternal(DEFAULT + sectionKey, sectionDefaults, defaultValidators, errorMessages);
      addWarningMessagesInternal(DEFAULT + sectionKey, sectionDefaults, validatorMap, warningMessages);
    }
  }
  if (objectValidator(all) && isConfigObject(all)) {
    providedKeyMap = { ...providedKeyMap, ...all };
    if ((i === void 0 || i === 0)) {
      const uniqueAllKeys = (Array.isArray(uniqueKeys) ? uniqueKeys : []).filter(uniqueKey => all[uniqueKey] !== void 0)

      for (let uniqueAllKey of uniqueAllKeys) {
        errorMessages.push(
          prefixPropertyErrorMessage(allKey ?? sectionKey, uniqueAllKey, 'unique properties cannot be set on an all config', i));
      }

      const allKeys = Object.keys(all).filter(allKey => uniqueAllKeys.indexOf(allKey) === -1);
      const allValidators = objectWithKeys(validatorMap, allKeys);

      addErrorMessagesInternal(allKey ?? sectionKey, all, allValidators, errorMessages);
      addWarningMessagesInternal(allKey ?? sectionKey, all, validatorMap, warningMessages);
    }
  }
  if (!onlyAll && objectValidator(section) && isConfigObject(section)) {
    providedKeyMap = { ...providedKeyMap, ...section };
    const sectionKeys = Object.keys(section);
    const sectionValidators = objectWithKeys(validatorMap, sectionKeys);

    addErrorMessagesInternal(sectionKey, section, sectionValidators, errorMessages, i);
    addWarningMessagesInternal(sectionKey, section, validatorMap, warningMessages, i);
  }

  if (!onlyAll) {
    const missingKeys = validatorKeys.filter(key => providedKeyMap[key] === void 0);
    const missingValidators = objectWithKeys(validatorMap, missingKeys);

    addErrorMessagesInternal(sectionKey, isConfigObject(section) ? section : {}, missingValidators, errorMessages, i, true);
  }

  return {
    errorMessages,
    warningMessages
  };
}
