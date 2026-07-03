import validators from './validators';

const objectValidator = validators.object();

const suffix = ' - ';
const maxInvalidProperties = 10;

function prefixMessage(prefix, i = void 0) {
  return i === void 0 ? prefix + suffix : prefix + '[' + i + ']' + suffix;
}

function prefixPropertyErrorMessage(prefix, property, message, i = void 0) {
  return prefixMessage(prefix, i) + property + suffix + message;
}

function prefixErrorMessage(prefix, message, i = void 0) {
  return prefixMessage(prefix, i) + message;
}

export function getPropertyMessage(prefix, property, message, i = void 0) {
  return prefixPropertyErrorMessage(prefix, property, message, i);
}

export function getMessage(prefix, message) {
  return prefixMessage(prefix) + message;
}

export function addErrorMessage(prefix, config, validator, errorMessages) {
  let isValid = validator(config);
  if (!isValid) {
    errorMessages.push(
      prefixErrorMessage(prefix, validator.getErrorMessage(config)));
  }
}

export function addErrorMessages(prefix, config, validators, errorMessages, i = void 0) {
  addErrorMessagesInternal(prefix, config, validators, errorMessages, i, true);
}

function addErrorMessagesInternal(prefix, config, validators, errorMessages, i = void 0, all = false) {
  if (objectValidator(config)) {
    const validatorKeys = Object.keys(validators);
    const configKeys = Object.keys(config);
    const keys = all ? validatorKeys : configKeys.filter(configKey => validators[configKey] !== void 0)

    for (let key of keys) {
      let isValid = validators[key](config[key]);
      if (!isValid) {
        errorMessages.push(
          prefixPropertyErrorMessage(prefix, key, validators[key].getErrorMessage(config[key]), i));
      }
    }
  }
}

export function addWarningMessages(prefix, config, propertyMap, warningMessages, i = void 0) {
  addWarningMessagesInternal(prefix, config, propertyMap, warningMessages, i, true);
}

function addWarningMessagesInternal(prefix, config, propertyMap, warningMessages, i = void 0, all = false) {
  if (objectValidator(config)) {
    let invalidProperties = [];
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

function objectWithKeys(object, keys) {
  const clone = {};
  for (let key of keys) {
    if (object[key] !== void 0) {
      clone[key] = object[key];
    }
  }
  return clone;
}

function arrayToMap(array) {
  const map = {};
  for (let item of array) {
    map[item] = true;
  }
  return map;
}

export const DEFAULT = 'Default ';

export function getMessages(sectionKey, allKey, uniqueKeys, section, sectionDefaults, all, validators, onlyAll, i = void 0) {
  const errorMessages = [];
  const warningMessages = [];
  const validatorKeys = Object.keys(validators);
  let providedKeyMap = {};

  if (!onlyAll && objectValidator(sectionDefaults)) {
    providedKeyMap = {...providedKeyMap, ...sectionDefaults};

    if (i === void 0 || i === 0) {
      const sectionDefaultKeys = Object.keys(sectionDefaults).filter(key => sectionDefaults[key] !== void 0);
      const defaultValidators = objectWithKeys(validators, sectionDefaultKeys);

      addErrorMessagesInternal(DEFAULT + sectionKey, sectionDefaults, defaultValidators, errorMessages);
      addWarningMessagesInternal(DEFAULT + sectionKey, sectionDefaults, validators, warningMessages);
    }
  }
  if (objectValidator(all)) {
    providedKeyMap = { ...providedKeyMap, ...all };
    if ((i === void 0 || i === 0)) {
      const uniqueAllKeys = (Array.isArray(uniqueKeys) ? uniqueKeys : []).filter(uniqueKey => all[uniqueKey] !== void 0)

      for (let uniqueAllKey of uniqueAllKeys) {
        errorMessages.push(
          prefixPropertyErrorMessage(allKey, uniqueAllKey, 'unique properties cannot be set on an all config', i));
      }

      const allKeys = Object.keys(all).filter(allKey => uniqueAllKeys.indexOf(allKey) === -1);
      const allValidators = objectWithKeys(validators, allKeys);

      addErrorMessagesInternal(allKey, all, allValidators, errorMessages);
      addWarningMessagesInternal(allKey, all, validators, warningMessages);
    }
  }
  if (!onlyAll && objectValidator(section)) {
    providedKeyMap = { ...providedKeyMap, ...section };
    const sectionKeys = Object.keys(section);
    const sectionValidators = objectWithKeys(validators, sectionKeys);

    addErrorMessagesInternal(sectionKey, section, sectionValidators, errorMessages, i);
    addWarningMessagesInternal(sectionKey, section, validators, warningMessages, i);
  }

  if (!onlyAll) {
    const missingKeys = validatorKeys.filter(key => providedKeyMap[key] === void 0);
    const missingValidators = objectWithKeys(validators, missingKeys);

    addErrorMessagesInternal(sectionKey, objectValidator(section) ? section : {}, missingValidators, errorMessages, i, true);
  }

  return {
    errorMessages,
    warningMessages
  };
}