const typeValidatorDefinitions = {
  boolean: {
    validator: () => v => v === true || v === false,
    message: () => "should be a boolean"
  },
  number: {
    validator: () => v => v !== void 0 && (typeof v === "number" || v instanceof Number) && isFinite(v),
    message: () => "should be a number"
  },
  string: {
    validator: () => v => v !== void 0 && (typeof v === "string" || v instanceof String),
    message: () => "should be a string"
  },
  array: {
    validator: () => v => Array.isArray(v),
    message: () => "should be an array"
  },
  object: {
    validator: () => v => v !== null && v !== void 0 && typeof v === "object",
    message: () => "should be an object"
  },
  any: {
    validator: () => v => true,
    message: () => "should be any value"
  }
};

const typeValidators = {}; // convenience for use in other validators...
const typeValidatorKeys = Object.keys(typeValidatorDefinitions);
typeValidatorKeys.forEach(typeValidatorKey => {
  typeValidators[typeValidatorKey] = typeValidatorDefinitions[typeValidatorKey].validator();
});

export { typeValidators };

const printAny = (value, recurse) => {
  if (recurse === false) {
    return value;
  } else if (value === void 0) {
    return "undefined";
  } else if (value === null) {
    return "null";
  } else if (Array.isArray(value)) {
    return printArray(value);
  } else if (typeof value === "object") {
    return printObject(value);
  } else {
    return JSON.stringify(value);
  }
};
const printArray = (array, recurse) => "[ " + array.map(value => printAny(value, recurse)).join(", ") + " ]";
const printObject = (object, recurse) =>
  "{ " +
  Object.keys(object)
    .map(key => key + ": " + printAny(object[key], recurse))
    .join(", ") +
  " }";

const colorHexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const colorRGBARegex = /^(rgba\()(.*)(\))$/;
const colorRGBRegex = /^(rgb\()(.*)(\))$/;
const colorThreeDigitRegex = /^[0-9]{1,3}$/;
const colorAlphaRegex = /^(0(\.\d+)?|1(\.0+)?)$/;

const dateISORegex = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/;

const customTypeValidatorDefinitions = {
  numeric: {
    validator: () => v => !isNaN(parseFloat(v)) && isFinite(v),
    message: () => "should be numeric"
  },
  integer: {
    validator: () => v => typeValidators.number(v) && v % 1 === 0,
    message: () => "should be an integer"
  },
  color: {
    validator: () => v => {
      if (!typeValidators.string(v)) {
        return false;
      }
      if (colorHexRegex.test(v)) {
        return true;
      }
      let matches = v.match(colorRGBARegex);
      if (matches !== null) {
        let parts = matches[2].split(",");
        if (parts.length === 4) {
          for (let i = 0; i < 3; i++) {
            let part = parts[i].trim();
            if (colorThreeDigitRegex.test(part) === false) {
              return false;
            }
            let rgb = parseInt(part, 10);
            if (rgb < 0 || rgb > 255) {
              return false;
            }
          }
          let alpha = parts[3].trim();
          if (colorAlphaRegex.test(alpha) === false) {
            return false;
          }
          return true;
        }
      }
      matches = v.match(colorRGBRegex);
      if (matches !== null) {
        let parts = matches[2].split(",");
        if (parts.length === 3) {
          for (let i = 0; i < 3; i++) {
            let part = parts[i].trim();
            if (colorThreeDigitRegex.test(part) === false) {
              return false;
            }
            let rgb = parseInt(part, 10);
            if (rgb < 0 || rgb > 255) {
              return false;
            }
          }
          return true;
        }
      }
      return false;
    },
    message: () => "should be a valid color"
  },
  dateISO: {
    validator: () => v => dateISORegex.test(v),
    message: () => "should be an iso date string"
  },
  dateAny: {
    validator: () => v => typeValidators.number(v) || dateISORegex.test(v),
    message: () => "should be an iso date string or epoch number"
  }
};

const customTypeValidators = {}; // convenience for use in other validators...
const customTypeValidatorKeys = Object.keys(customTypeValidatorDefinitions);
customTypeValidatorKeys.forEach(customTypeValidatorKey => {
  customTypeValidators[customTypeValidatorKey] = customTypeValidatorDefinitions[customTypeValidatorKey].validator();
});

export { customTypeValidators };

const argumentTypeValidatorDefinitions = {
  instanceOf: {
    validator: type => v => v instanceof type,
    message: type => "should be an instanceof " + type
  },
  typeOf: {
    validator: type => v => typeof v === type,
    message: type => "should have typeof " + type
  },
  custom: {
    validator: validator => v => validator(v),
    message: validator => (validator.message ? validator.message : "should be valid with the custom validator")
  },
  numberMin: {
    validator: min => v => typeValidators.number(v) && v >= min,
    message: min => "should be a number >= to " + min
  },
  numberMax: {
    validator: max => v => typeValidators.number(v) && v <= max,
    message: max => "should be a number <= to " + max
  },
  numberMinMax: {
    validator: (min, max) => v => typeValidators.number(v) && v >= min && v <= max,
    message: (min, max) => "should be a number >= to " + min + " and <= " + max
  },
  numericMin: {
    validator: min => v => customTypeValidators.numeric(v) && v >= min,
    message: min => "should be numeric and >= to " + min
  },
  numericMax: {
    validator: max => v => customTypeValidators.numeric(v) && v <= max,
    message: max => "should be numeric and <= to " + max
  },
  numericMinMax: {
    validator: (min, max) => v => customTypeValidators.numeric(v) && v >= min && v <= max,
    message: (min, max) => "should be numeric and >= to " + min + " and <= " + max
  },
  integerMin: {
    validator: min => v => customTypeValidators.integer(v) && v >= min,
    message: min => "should be an integer and >= to " + min
  },
  integerMax: {
    validator: max => v => customTypeValidators.integer(v) && v <= max,
    message: max => "should be an integer and <= to " + max
  },
  integerMinMax: {
    validator: (min, max) => v => customTypeValidators.integer(v) && v >= min && v <= max,
    message: (min, max) => "should be an integer and >= to " + min + " and <= " + max
  },
  regexp: {
    validator: regex => v => regex.test(v),
    message: regex => "should match regex " + regex
  },
  stringWithLength: {
    validator: length => v => typeValidators.string(v) && v.length === length,
    message: length => "should be a string with length " + length
  },
  stringWithLengthMin: {
    validator: minLength => v => typeValidators.string(v) && v.length >= minLength,
    message: minLength => "should be a string with length >= to " + minLength
  },
  stringWithLengthMax: {
    validator: maxLength => v => typeValidators.string(v) && v.length <= maxLength,
    message: maxLength => "should be a string with length <= to " + maxLength
  },
  stringWithLengthMinMax: {
    validator: (minLength, maxLength) => v =>
      typeValidators.string(v) && v.length >= minLength && v.length <= maxLength,
    message: (minLength, maxLength) => "should be a stringy with length >= to " + minLength + " and <= to " + maxLength
  },
  equal: {
    validator: value => v => v === value,
    message: value => "should be equal to " + printAny(value)
  },
  oneOf: {
    validator: valueArray => v => valueArray.indexOf(v) !== -1,
    message: valueArray => "should be one of " + printArray(valueArray)
  },
  oneIn: {
    validator: valueMap => v => valueMap[v] !== void 0,
    message: valueMap => "should be in " + printObject(valueMap)
  },
  notEqual: {
    validator: value => v => v !== value,
    message: value => "should not be equal to " + printAny(value)
  },
  notOneOf: {
    validator: valueArray => v => valueArray.indexOf(v) === -1,
    message: valueArray => "should not be one of " + printArray(valueArray)
  },
  notOneIn: {
    validator: valueMap => v => valueMap[v] === void 0,
    message: valueMap => "should not be in " + printObject(valueMap)
  },
  arrayWithLength: {
    validator: length => v => typeValidators.array(v) && v.length === length,
    message: length => "should be an array with length " + length
  },
  arrayWithLengthMin: {
    validator: minLength => v => typeValidators.array(v) && v.length >= minLength,
    message: minLength => "should be an array with length >= to " + minLength
  },
  arrayWithLengthMax: {
    validator: maxLength => v => typeValidators.array(v) && v.length <= maxLength,
    message: maxLength => "should be an array with length <= to " + maxLength
  },
  arrayWithLengthMinMax: {
    validator: (minLength, maxLength) => v => typeValidators.array(v) && v.length >= minLength && v.length <= maxLength,
    message: (minLength, maxLength) => "should be an array with length >= to " + minLength + " and <= to " + maxLength
  }
};

const compoundValidatorDefinitions = {
  arrayOf: {
    validator: (elementValidator, allowEmpty = false) => v => {
      if (!typeValidators.array(v) || (v.length === 0 && allowEmpty === false)) {
        return false;
      }
      let someInvalid = v.some(av => {
        if (!elementValidator(av)) {
          return true;
        }
        return false;
      });
      return !someInvalid;
    },
    message: (elementValidator, allowEmpty = false) =>
      "should be " + (allowEmpty ? "an" : "a non-empty") + " array with elements that " + elementValidator.errorMessage
  },
  objectWith: {
    validator: (properties, propertyValidator) => v => {
      if (!typeValidators.object(v) || Object.keys(v).length !== properties.length) {
        return false;
      }
      let someInvalid = properties.some(property => {
        if (!propertyValidator(v[property])) {
          return true;
        }
        return false;
      });
      return !someInvalid;
    },
    message: (properties, propertyValidator) =>
      "should be an object with properties " +
      printArray(properties) +
      " all of which " +
      propertyValidator.errorMessage
  },
  objectWithSome: {
    validator: (properties, propertyValidator) => v => {
      let valueKeys = Object.keys(v);
      if (!typeValidators.object(v) || valueKeys.length === 0 || valueKeys.length > properties.length) {
        return false;
      }
      let propertyMap = {};
      properties.forEach(property => {
        propertyMap[property] = property;
      });
      let someInvalid = valueKeys.some(valueKey => {
        if (propertyMap[valueKey] === void 0 || !propertyValidator(v[valueKey])) {
          return true;
        }
        return false;
      });
      return !someInvalid;
    },
    message: (properties, propertyValidator) =>
      "should be an object with some properties " +
      printArray(properties) +
      " all of which " +
      propertyValidator.errorMessage
  },
  objectWithShape: {
    validator: (propertyToValidatorMap, allowExtraProperties = false) => v => {
      if (!validators.object()(v)) {
        return false;
      }
      let shapeKeys = Object.keys(propertyToValidatorMap);
      let someInvalid = shapeKeys.some(shapeKey => {
        if (!propertyToValidatorMap[shapeKey](v[shapeKey])) {
          return true;
        }
        return false;
      });
      if (!someInvalid && !allowExtraProperties) {
        let valueKeys = Object.keys(v);
        someInvalid = valueKeys.some(valueKey => {
          if (propertyToValidatorMap[valueKey] === void 0) {
            return true;
          }
          return false;
        });
      }
      return !someInvalid;
    },
    message: (propertyToValidatorMap, allowExtraProperties = false) => {
      let validatorMessageMap = {};
      let shapePropertyKeys = Object.keys(propertyToValidatorMap);
      shapePropertyKeys.forEach(shapePropertyKey => {
        validatorMessageMap[shapePropertyKey] = propertyToValidatorMap[shapePropertyKey].errorMessage;
      });
      return (
        "should be an object with" +
        (allowExtraProperties ? "" : " exact") +
        " properties " +
        printObject(validatorMessageMap, false)
      );
    }
  },
  or: {
    validator: validators => v => validators.some(validator => validator(v)),
    message: validators =>
      "should be true for one of " + printArray(validators.map(validator => validator.errorMessage))
  },
  and: {
    validator: validators => v => !validators.some(validator => !validator(v)),
    message: validators =>
      "should be true for all of " + printArray(validators.map(validator => validator.errorMessage))
  },
  not: {
    validator: validator => v => !validator(v),
    message: validator => "should be false for " + validator.errorMessage
  }
};

const validatorArgsToAllowedValues = {
  equal: value => [value],
  oneOf: values => values,
  oneIn: valueMap => Object.keys(valueMap),
  or: validators => {
    let allowedValues = null;
    validators.forEach(validator => {
      if (validator.allowedValues !== null) {
        if (allowedValues === null) {
          allowedValues = validator.allowedValues.slice();
        } else {
          allowedValues = allowedValues.concat(validator.allowedValues);
        }
      }
    });
    return allowedValues;
  }
};

const validatorArgsToNestedValues = {
  objectWith: (properties, propertyValidator) => {
    let propertyToValidatorMap = {};
    properties.forEach(property => {
      propertyToValidatorMap[property] = propertyValidator;
    });
    return propertyToValidatorMap;
  },
  objectWithSome: (properties, propertyValidator) => {
    let propertyToValidatorMap = {};
    if (propertyValidator.allowedValues === null || propertyValidator.allowedValues.indexOf(void 0) === -1) {
      propertyValidator = propertyValidator.orEqual(void 0);
    }
    properties.forEach(property => {
      propertyToValidatorMap[property] = propertyValidator;
    });
    return propertyToValidatorMap;
  },
  objectWithShape: propertyToValidatorMap => propertyToValidatorMap
};

const minRangeValues = min => ({ min });
const maxRangeValues = max => ({ max });
const minMaxRangeValues = (min, max) => ({ min, max });

const validatorArgsToRangeValues = {
  numberMin: minRangeValues,
  numberMax: maxRangeValues,
  numberMinMax: minMaxRangeValues,
  numericMin: minRangeValues,
  numericMax: maxRangeValues,
  numericMinMax: minMaxRangeValues,
  integerMin: minRangeValues,
  integerMax: maxRangeValues,
  integerMinMax: minMaxRangeValues
};

const validatorArgsToIsEnum = {
  equal: value => true,
  oneOf: values => true,
  oneIn: valueMap => true,
  or: validators => !validators.some(validator => !validator.isEnum)
};

const validatorDefinitions = Object.assign(
  {},
  typeValidatorDefinitions,
  customTypeValidatorDefinitions,
  argumentTypeValidatorDefinitions,
  compoundValidatorDefinitions
);

const validatorDefinitionKeys = Object.keys(validatorDefinitions);

const validatorExtensionDefinitions = {
  orEqual: {
    validator: value => v => v === value,
    message: value => " or be equal to " + printAny(value)
  },
  orOneOf: {
    validator: valueArray => v => valueArray.indexOf(v) !== -1,
    message: valueArray => " or be one of " + printArray(valueArray)
  },
  or: {
    validator: validator => v => validator(v),
    message: validator => " or " + validator.errorMessage
  }
};

const validatorExtensionArgsToAllowedValues = {
  orEqual: value => [value],
  orOneOf: values => values,
  or: validator => validator.allowedValues
};

const validatorExtensionArgsToIsEnum = {
  orEqual: value => true,
  orOneOf: values => true,
  or: validator => validator.isEnum
};

const validatorExtensionKeys = Object.keys(validatorExtensionDefinitions);

const appendValue = (message, v) => message + ": " + printAny(v);

const validatorMessageExtensions = {
  withMessage: (messageValidatorFunction, message) => {
    messageValidatorFunction.errorMessage = message;
    messageValidatorFunction.errorMessages = [messageValidatorFunction.errorMessage];
  },
  appendMessage: (messageValidatorFunction, message) => {
    messageValidatorFunction.errorMessage = messageValidatorFunction.errorMessage + message;
    messageValidatorFunction.errorMessages = [messageValidatorFunction.errorMessage];
  },
  prependMessage: (messageValidatorFunction, message) => {
    messageValidatorFunction.errorMessage = message + messageValidatorFunction.errorMessage;
    messageValidatorFunction.errorMessages = [messageValidatorFunction.errorMessage];
  }
};

const validatorMessageExtensionKeys = Object.keys(validatorMessageExtensions);

function addExtensions(validatorFunction, messageExtensions = true, extensions = true) {
  if (messageExtensions) {
    validatorMessageExtensionKeys.forEach(messageExtensionKey => {
      validatorFunction[messageExtensionKey] = message => {
        let messageValidatorFunction = v => validatorFunction(v);
        messageValidatorFunction.validatorName = validatorFunction.validatorName;
        messageValidatorFunction.extensionNames = validatorFunction.extensionNames;
        messageValidatorFunction.customName = validatorFunction.customName;
        messageValidatorFunction.allowedValues = validatorFunction.allowedValues;
        messageValidatorFunction.isEnum = validatorFunction.isEnum;
        messageValidatorFunction.nestedValues = validatorFunction.nestedValues;
        messageValidatorFunction.rangeValues = validatorFunction.rangeValues;
        messageValidatorFunction.errorMessage = validatorFunction.errorMessage;
        messageValidatorFunction.errorMessages = validatorFunction.errorMessages;
        validatorMessageExtensions[messageExtensionKey](messageValidatorFunction, message);
        messageValidatorFunction.getErrorMessage = v => appendValue(messageValidatorFunction.errorMessage, v);
        addExtensions(messageValidatorFunction, messageExtensions, extensions);
        return messageValidatorFunction;
      };
    });
  }
  if (extensions) {
    validatorExtensionKeys.forEach(extensionKey => {
      validatorFunction[extensionKey] = (...args) => {
        let extensionFunction = v =>
          validatorFunction(v) || validatorExtensionDefinitions[extensionKey].validator(...args)(v);
        extensionFunction.validatorName = validatorFunction.validatorName;
        if (validatorFunction.extensionNames === null) {
          extensionFunction.extensionNames = [extensionKey];
        } else {
          extensionFunction.extensionNames = validatorFunction.extensionNames.concat(extensionKey);
        }
        extensionFunction.customName = validatorFunction.customName;
        extensionFunction.allowedValues = validatorFunction.allowedValues;
        extensionFunction.isEnum = false;
        extensionFunction.nestedValues = validatorFunction.nestedValues;
        extensionFunction.rangeValues = validatorFunction.rangeValues;
        if (validatorExtensionArgsToAllowedValues[extensionKey] !== void 0) {
          let extensionAllowedValues = validatorExtensionArgsToAllowedValues[extensionKey](...args);
          extensionFunction.isEnum = validatorFunction.isEnum && validatorExtensionArgsToIsEnum[extensionKey](...args);
          if (extensionAllowedValues !== null) {
            if (typeValidators.array(validatorFunction.allowedValues)) {
              extensionFunction.allowedValues = validatorFunction.allowedValues.concat(extensionAllowedValues);
            } else {
              extensionFunction.allowedValues = extensionAllowedValues;
            }
          }
        }
        extensionFunction.errorMessage =
          validatorFunction.errorMessage + validatorExtensionDefinitions[extensionKey].message(...args);
        extensionFunction.errorMessages = [extensionFunction.errorMessage];
        extensionFunction.getErrorMessage = v => appendValue(extensionFunction.errorMessage, v);
        addExtensions(extensionFunction, messageExtensions, extensions);
        return extensionFunction;
      };
    });
  }

  validatorFunction.withCustomName = customName => {
    let customNameFunction = v => validatorFunction(v);
    customNameFunction.validatorName = validatorFunction.validatorName;
    customNameFunction.extensionNames = validatorFunction.extensionNames;
    customNameFunction.customName = customName;
    customNameFunction.allowedValues = validatorFunction.allowedValues;
    customNameFunction.isEnum = validatorFunction.isEnum;
    customNameFunction.nestedValues = validatorFunction.nestedValues;
    customNameFunction.rangeValues = validatorFunction.rangeValues;
    customNameFunction.errorMessage = validatorFunction.errorMessage;
    customNameFunction.errorMessages = validatorFunction.errorMessages;
    customNameFunction.getErrorMessage = v => appendValue(customNameFunction.errorMessage, v);
    addExtensions(customNameFunction, messageExtensions, extensions);
    return customNameFunction;
  };
}

const validators = {};
validatorDefinitionKeys.forEach(validatorKey => {
  validators[validatorKey] = (...args) => {
    let validatorFunction = validatorDefinitions[validatorKey].validator(...args);
    validatorFunction.validatorName = validatorKey;
    validatorFunction.customName = null;
    validatorFunction.extensionNames = null;
    validatorFunction.allowedValues = null;
    validatorFunction.nestedValues = null;
    validatorFunction.rangeValues = null;
    validatorFunction.isEnum = false;
    if (validatorArgsToAllowedValues[validatorKey] !== void 0) {
      validatorFunction.allowedValues = validatorArgsToAllowedValues[validatorKey](...args);
      validatorFunction.isEnum = validatorArgsToIsEnum[validatorKey](...args);
    }
    if (validatorArgsToNestedValues[validatorKey] !== void 0) {
      validatorFunction.nestedValues = validatorArgsToNestedValues[validatorKey](...args);
    }
    if (validatorArgsToRangeValues[validatorKey] !== void 0) {
      validatorFunction.rangeValues = validatorArgsToRangeValues[validatorKey](...args);
    }
    validatorFunction.errorMessage = validatorDefinitions[validatorKey].message(...args);
    validatorFunction.errorMessages = [validatorFunction.errorMessage];
    validatorFunction.getErrorMessage = v => appendValue(validatorFunction.errorMessage, v);
    addExtensions(validatorFunction);
    return validatorFunction;
  };
});
const appendSuffix = (message, suffix) => (suffix !== void 0 ? message + " " + suffix : message);

validators.conditional = (rules, object) => {
  let matchedRule = rules.find(rule => rule.condition(object));
  let validatorFunction = v => matchedRule.validator(v);
  validatorFunction.validatorName = "conditional";
  validatorFunction.customName = null;
  validatorFunction.extensionNames = null;
  validatorFunction.allowedValues = null;
  validatorFunction.nestedValues = null;
  validatorFunction.rangeValues = null;
  validatorFunction.isEnum = false;
  validatorFunction.errorMessage = appendSuffix(matchedRule.validator.errorMessage, matchedRule.suffix);
  validatorFunction.errorMessages = rules.map(rule => appendSuffix(rule.validator.errorMessage, rule.suffix));
  validatorFunction.getErrorMessage = v => appendValue(validatorFunction.errorMessage, v);
  addExtensions(validatorFunction, true, false);
  return validatorFunction;
};

export default validators;
