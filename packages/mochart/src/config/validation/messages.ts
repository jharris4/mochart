import validators from './validators';
import type { Validator } from '@mochart/movalid';

type ConfigObject = Record<string, unknown>;
type ValidatorMap = Record<string, Validator>;

function isConfigObject(value: unknown): value is ConfigObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const objectValidator = validators.object();

const suffix = ' - ';
const maxInvalidProperties = 10;
export const DEFAULT = 'Default ';

export interface LocatedValidationMessage {
  path: (string | number)[];
  message: string;
}

function messagePath(prefix: string, i: number | undefined, property?: string): (string | number)[] {
  const section = prefix.startsWith(DEFAULT) ? prefix.slice(DEFAULT.length) : prefix;
  const path: (string | number)[] = section === 'config' || section === '' ? [] : [section];
  if (i !== undefined) path.push(i);
  if (property !== undefined) path.push(property);
  return path;
}

function prefixMessage(prefix: string, i: number | undefined = undefined): string {
  return i === undefined ? prefix + suffix : prefix + '[' + i + ']' + suffix;
}

function prefixPropertyErrorMessage(prefix: string, property: string, message: string, i: number | undefined = undefined): string {
  return prefixMessage(prefix, i) + property + suffix + message;
}

function prefixErrorMessage(prefix: string, message: string, i: number | undefined = undefined): string {
  return prefixMessage(prefix, i) + message;
}

export function getPropertyMessage(prefix: string, property: string, message: string, i: number | undefined = undefined): string {
  return prefixPropertyErrorMessage(prefix, property, message, i);
}

export function getMessage(prefix: string, message: string): string {
  return prefixMessage(prefix) + message;
}

export function addErrorMessage(prefix: string, config: unknown, validator: Validator, errorMessages: string[], errorDetails: LocatedValidationMessage[] = []): void {
  const isValid = validator(config);
  if (!isValid) {
    const message = validator.getErrorMessage(config);
    errorMessages.push(
      prefixErrorMessage(prefix, message));
    errorDetails.push({ path: messagePath(prefix, undefined), message });
  }
}

function addErrorMessagesInternal(prefix: string, config: unknown, validatorMap: ValidatorMap, errorMessages: string[], errorDetails: LocatedValidationMessage[], i: number | undefined = undefined, all = false): void {
  if (objectValidator(config) && isConfigObject(config)) {
    const validatorKeys = Object.keys(validatorMap);
    const configKeys = Object.keys(config);
    const keys = all ? validatorKeys : configKeys.filter(configKey => validatorMap[configKey] !== undefined)

    for (const key of keys) {
      const validator = validatorMap[key]!;
      const isValid = validator(config[key]);
      if (!isValid) {
        const message = validator.getErrorMessage(config[key]);
        errorMessages.push(
          prefixPropertyErrorMessage(prefix, key, message, i));
        errorDetails.push({ path: messagePath(prefix, i, key), message });
      }
    }
  }
}

export function addWarningMessages(prefix: string, config: unknown, propertyMap: Record<string, unknown>, warningMessages: string[], warningDetails: LocatedValidationMessage[] = [], i: number | undefined = undefined): void {
  addWarningMessagesInternal(prefix, config, propertyMap, warningMessages, warningDetails, i, true);
}

function addWarningMessagesInternal(prefix: string, config: unknown, propertyMap: Record<string, unknown>, warningMessages: string[], warningDetails: LocatedValidationMessage[], i: number | undefined = undefined, _all = false): void {
  if (objectValidator(config) && isConfigObject(config)) {
    const invalidProperties: string[] = [];
    let invalidPropertyCount = 0;
    const properties = Object.keys(config);
    for (const property of properties) {
      if (!propertyMap[property]) {
        if (invalidProperties.length < maxInvalidProperties) {
          invalidProperties.push(property);
        }
        invalidPropertyCount++;
      }
    }
    if (invalidPropertyCount > 0) {
      let message: string;
      if (invalidPropertyCount > maxInvalidProperties) {
        message = 'had ' + invalidPropertyCount + ' invalid properties, first ' + maxInvalidProperties + ' are: ' + invalidProperties;
      }
      else {
        message = 'had ' + invalidPropertyCount + ' invalid properties: ' + invalidProperties;
      }
      warningMessages.push(prefixErrorMessage(prefix, message, i));
      warningDetails.push({ path: messagePath(prefix, i), message });
    }
  }
}

function objectWithKeys<T>(object: Record<string, T>, keys: string[]): Record<string, T> {
  const clone: Record<string, T> = {};
  for (const key of keys) {
    if (object[key] !== undefined) {
      clone[key] = object[key];
    }
  }
  return clone;
}


export function getMessages(sectionKey: string, allKey: string | undefined, uniqueKeys: string[] | undefined, section: unknown, sectionDefaults: unknown, all: unknown, validatorMap: ValidatorMap, onlyAll: boolean, i: number | undefined = undefined) {
  const errorMessages: string[] = [];
  const warningMessages: string[] = [];
  const errorDetails: LocatedValidationMessage[] = [];
  const warningDetails: LocatedValidationMessage[] = [];
  const validatorKeys = Object.keys(validatorMap);
  let providedKeyMap: ConfigObject = {};

  if (!onlyAll && objectValidator(sectionDefaults) && isConfigObject(sectionDefaults)) {
    providedKeyMap = {...providedKeyMap, ...sectionDefaults};

    if (i === undefined || i === 0) {
      const sectionDefaultKeys = Object.keys(sectionDefaults).filter(key => sectionDefaults[key] !== undefined);
      const defaultValidators = objectWithKeys(validatorMap, sectionDefaultKeys);

      addErrorMessagesInternal(DEFAULT + sectionKey, sectionDefaults, defaultValidators, errorMessages, errorDetails);
      addWarningMessagesInternal(DEFAULT + sectionKey, sectionDefaults, validatorMap, warningMessages, warningDetails);
    }
  }
  if (objectValidator(all) && isConfigObject(all)) {
    providedKeyMap = { ...providedKeyMap, ...all };
    if ((i === undefined || i === 0)) {
      const uniqueAllKeys = (Array.isArray(uniqueKeys) ? uniqueKeys : []).filter(uniqueKey => all[uniqueKey] !== undefined)

      for (const uniqueAllKey of uniqueAllKeys) {
        const message = 'unique properties cannot be set on an all config';
        errorMessages.push(
          prefixPropertyErrorMessage(allKey ?? sectionKey, uniqueAllKey, message, i));
        errorDetails.push({ path: messagePath(allKey ?? sectionKey, undefined, uniqueAllKey), message });
      }

      const allKeys = Object.keys(all).filter(allKey => uniqueAllKeys.indexOf(allKey) === -1);
      const allValidators = objectWithKeys(validatorMap, allKeys);

      addErrorMessagesInternal(allKey ?? sectionKey, all, allValidators, errorMessages, errorDetails);
      addWarningMessagesInternal(allKey ?? sectionKey, all, validatorMap, warningMessages, warningDetails);
    }
  }
  if (!onlyAll && objectValidator(section) && isConfigObject(section)) {
    providedKeyMap = { ...providedKeyMap, ...section };
    const sectionKeys = Object.keys(section);
    const sectionValidators = objectWithKeys(validatorMap, sectionKeys);

    addErrorMessagesInternal(sectionKey, section, sectionValidators, errorMessages, errorDetails, i);
    addWarningMessagesInternal(sectionKey, section, validatorMap, warningMessages, warningDetails, i);
  }

  if (!onlyAll) {
    const missingKeys = validatorKeys.filter(key => providedKeyMap[key] === undefined);
    const missingValidators = objectWithKeys(validatorMap, missingKeys);

    addErrorMessagesInternal(sectionKey, isConfigObject(section) ? section : {}, missingValidators, errorMessages, errorDetails, i, true);
  }

  return {
    errorMessages,
    warningMessages,
    errorDetails,
    warningDetails
  };
}
