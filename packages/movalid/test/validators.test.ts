import { describe, it, expect } from "vitest";

import baseValidators from "../src/validators";
import type { CustomValidator } from "../src/validators";

// Deep equality that treats structurally identical functions as equal —
// vitest's toEqual compares functions by reference, which would fail the
// nestedValues comparisons against freshly created validators.
const isEqual = (a: any, b: any): boolean => {
  if (Object.is(a, b)) {
    return true;
  }
  if (typeof a === "function" && typeof b === "function") {
    return a.name === b.name && String(a) === String(b);
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((value, i) => isEqual(value, b[i]));
  }
  if (a !== null && b !== null && typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    return aKeys.length === bKeys.length && aKeys.every(key => isEqual(a[key], b[key]));
  }
  return false;
};

declare module "vitest" {
  interface Matchers<T = any> {
    toIsEqual(expected: any, context?: string): T;
  }
}

expect.extend({
  toIsEqual(received: any, expected: any, context?: string) {
    const pass = isEqual(received, expected);
    return {
      pass,
      message: () =>
        "Expected " +
        received +
        (pass ? " not" : "") +
        " to be isEqual to " +
        expected +
        (context !== undefined ? " (" + context + ")" : "")
    };
  }
});

class AClass {}

const customValidator: CustomValidator = v => v === 123;
customValidator.message = "should be the magic number 123!";

describe("validators", () => {
  const validatorInputs: Record<string, { args: any[]; valid?: any; invalid?: any }> = {
    boolean: { args: [], valid: true, invalid: "true" },
    number: { args: [], valid: 123.45, invalid: "123.45" },
    string: { args: [], valid: "hello", invalid: true },
    array: { args: [], valid: [], invalid: {} },
    object: { args: [], valid: {}, invalid: "" },
    any: { args: [], valid: undefined, invalid: undefined },
    numeric: { args: [], valid: "123.45", invalid: "a" },
    integer: { args: [], valid: 123, invalid: 123.45 },
    color: { args: [], valid: "#FFF", invalid: "#FFFF" },
    dateISO: { args: [], valid: "2016-09-01T00:00:00Z", invalid: "1234567" },
    dateAny: { args: [], valid: 1, invalid: "1234567" },
    instanceOf: { args: [AClass], valid: new AClass(), invalid: "abc" },
    typeOf: { args: ["object"], valid: {}, invalid: 123 },
    custom: { args: [customValidator], valid: 123, invalid: 1234 },
    numberMin: { args: [0], valid: 0, invalid: -1 },
    numberMax: { args: [100], valid: 0, invalid: 101 },
    numberMinMax: { args: [0, 50], valid: 0, invalid: 51 },
    numericMin: { args: [0], valid: "0", invalid: "-1" },
    numericMax: { args: [100], valid: "0", invalid: "101" },
    numericMinMax: { args: [0, 50], valid: "0", invalid: "51" },
    integerMin: { args: [0], valid: 0, invalid: -1 },
    integerMax: { args: [100], valid: 0, invalid: 101 },
    integerMinMax: { args: [0, 50], valid: 0, invalid: 51 },
    regexp: { args: [/(match)/], valid: "match", invalid: "march" },
    stringWithLength: { args: [3], valid: "abc", invalid: "ab" },
    stringWithLengthMin: { args: [5], valid: "abcde", invalid: "abcd" },
    stringWithLengthMax: { args: [4], valid: "abcd", invalid: "abcde" },
    stringWithLengthMinMax: { args: [2, 4], valid: "abc", invalid: "" },
    equal: { args: ["equal"], valid: "equal", invalid: "not" },
    oneOf: { args: [["one", "two"]], valid: "one", invalid: "three" },
    oneIn: { args: [{ in: true, there: "yes" }], valid: "in", invalid: "absent" },
    notEqual: { args: ["equal"], valid: "not", invalid: "equal" },
    notOneOf: { args: [["one", "two"]], valid: "three", invalid: "one" },
    notOneIn: { args: [{ in: true, there: "yes" }], valid: "absent", invalid: "in" },
    arrayWithLength: { args: [3], valid: [1, 6, 11], invalid: [1, 6] },
    arrayWithLengthMin: { args: [5], valid: [1, 6, 11, 16, 21], invalid: [1, 6, 11, 16] },
    arrayWithLengthMax: { args: [4], valid: [1, 6, 11, 16], invalid: [1, 6, 11, 16, 21] },
    arrayWithLengthMinMax: { args: [2, 4], valid: [1, 6, 11, 16], invalid: [1, 6, 11, 16, 21] },
    arrayOf: { args: [baseValidators.string()], valid: ["", ""], invalid: [1, 2] },
    objectWith: {
      args: [["a", "b", "c"], baseValidators.string()],
      valid: { a: "", b: "", c: "" },
      invalid: { a: "", c: "" }
    },
    objectWithSome: {
      args: [["a", "b", "c"], baseValidators.string()],
      valid: { a: "", c: "" },
      invalid: { a: "", d: "" }
    },
    objectWithShape: {
      args: [{ a: baseValidators.numberMin(5), b: baseValidators.numberMin(10) }],
      valid: { a: 10, b: 15 },
      invalid: { a: 4, b: 15 }
    },
    or: { args: [[baseValidators.equal("one"), baseValidators.equal("two")]], valid: "one", invalid: "three" },
    and: { args: [[baseValidators.numberMin(5), baseValidators.numberMax(15)]], valid: 10, invalid: 16 },
    not: { args: [baseValidators.equal("equal")], valid: "not", invalid: "equal" },
    conditional: {
      args: [[{ condition: () => true, validator: baseValidators.notEqual(null) }], {}],
      valid: 123,
      invalid: null
    }
  };
  const irregularValidatorKeys = ["conditional", "any"];
  const extensionInputs = {
    orEqual: { args: ["good"], valid: "good" },
    orOneOf: { args: [["good", "great"]], valid: "great" },
    or: { args: [baseValidators.equal("amazing")], valid: "amazing" }
  };

  const validatorKeys = Object.keys(baseValidators);
  const regularValidatorKeys = validatorKeys.filter(key => irregularValidatorKeys.indexOf(key) === -1);

  const extensionKeys = Object.keys(extensionInputs);
  const isEnumValidatorNames = {
    equal: true,
    oneOf: true,
    oneIn: true,
    or: true
  };
  const isRangedValidatorNames = {
    numberMin: true,
    numberMax: true,
    numberMinMax: true,
    numericMin: true,
    numericMax: true,
    numericMinMax: true,
    integerMin: true,
    integerMax: true,
    integerMinMax: true
  };

  describe("type validators", () => {
    describe("boolean", () => {
      it("should allow true", () => {
        expect(baseValidators.boolean()(true)).toBe(true);
      });

      it("should allow false", () => {
        expect(baseValidators.boolean()(false)).toBe(true);
      });

      it("should not allow arrays", () => {
        expect(baseValidators.boolean()([])).toBe(false);
      });

      it('should not allow "false"', () => {
        expect(baseValidators.boolean()("false")).toBe(false);
      });

      it('should not allow "true"', () => {
        expect(baseValidators.boolean()("true")).toBe(false);
      });

      it("should not allow null", () => {
        expect(baseValidators.boolean()(null)).toBe(false);
      });

      it("should not allow undefined", () => {
        expect(baseValidators.boolean()(undefined)).toBe(false);
      });

      it("should not allow 0", () => {
        expect(baseValidators.boolean()(0)).toBe(false);
      });
    });

    describe("number", () => {
      it("should allow negative numbers", () => {
        expect(baseValidators.number()(-1)).toBe(true);
      });

      it("should allow positive numbers", () => {
        expect(baseValidators.number()(1)).toBe(true);
      });

      it("should allow 0", () => {
        expect(baseValidators.number()(0)).toBe(true);
      });

      it("should allow decimals", () => {
        expect(baseValidators.number()(123.4567)).toBe(true);
      });

      it("should allow exponential number notation", () => {
        expect(baseValidators.number()(1e3)).toBe(true);
      });

      it("should not allow numbers provided as strings", () => {
        expect(baseValidators.number()("123.456789")).toBe(false);
      });

      it("should not allow numbers provided as strings that end with text", () => {
        expect(baseValidators.number()("123.456789aba")).toBe(false);
      });

      it("should not allow arrays", () => {
        expect(baseValidators.number()([])).toBe(false);
      });

      it("should not allow NaN", () => {
        expect(baseValidators.number()(NaN)).toBe(false);
      });

      it("should not allow Infinity", () => {
        expect(baseValidators.number()(Infinity)).toBe(false);
      });

      it("should not allow -Infinity", () => {
        expect(baseValidators.number()(-Infinity)).toBe(false);
      });

      it("should not allow a boolean", () => {
        expect(baseValidators.number()(false)).toBe(false);
      });

      it("should not allow undefined", () => {
        expect(baseValidators.number()(undefined)).toBe(false);
      });

      it("should not allow null", () => {
        expect(baseValidators.number()(null)).toBe(false);
      });

      it("should not allow a string", () => {
        expect(baseValidators.number()("abc")).toBe(false);
      });
    });

    describe("string", () => {
      it("should not allow undefined", () => {
        expect(baseValidators.string()(undefined)).toBe(false);
      });

      it("should not allow null", () => {
        expect(baseValidators.string()(null)).toBe(false);
      });

      it("should allow empty string", () => {
        expect(baseValidators.string()("")).toBe(true);
      });

      it("should allow a random string", () => {
        expect(baseValidators.string()("_# !@#$^&%^$%^ ajd")).toBe(true);
      });

      it("should not allow arrays", () => {
        expect(baseValidators.string()([])).toBe(false);
      });

      it("should not allow a boolean", () => {
        expect(baseValidators.string()(true)).toBe(false);
      });

      it("should not allow a number", () => {
        expect(baseValidators.string()(345345)).toBe(false);
      });
    });

    describe("array", () => {
      it("should not allow empty objects", () => {
        expect(baseValidators.array()({})).toBe(false);
      });

      it("should not allow undefined", () => {
        expect(baseValidators.array()(undefined)).toBe(false);
      });

      it("should not allow null", () => {
        expect(baseValidators.array()(null)).toBe(false);
      });

      it("should not allow strings", () => {
        expect(baseValidators.array()("")).toBe(false);
      });

      it("should not allow strings that look like arrays", () => {
        expect(baseValidators.array()("[]")).toBe(false);
      });

      it("should not allow booleans", () => {
        expect(baseValidators.array()(false)).toBe(false);
      });

      it("should not allow numbers", () => {
        expect(baseValidators.array()(1)).toBe(false);
      });

      it("should allow arrays", () => {
        expect(baseValidators.array()([])).toBe(true);
      });
    });

    describe("object", () => {
      it("should allow empty objects", () => {
        expect(baseValidators.object()({})).toBe(true);
      });

      it("should not allow undefined", () => {
        expect(baseValidators.object()(undefined)).toBe(false);
      });

      it("should not allow null", () => {
        expect(baseValidators.object()(null)).toBe(false);
      });

      it("should not allow strings", () => {
        expect(baseValidators.object()("")).toBe(false);
      });

      it("should not allow strings that look like objects", () => {
        expect(baseValidators.array()("{}")).toBe(false);
      });

      it("should not allow booleans", () => {
        expect(baseValidators.object()(false)).toBe(false);
      });

      it("should not allow numbers", () => {
        expect(baseValidators.object()(1)).toBe(false);
      });

      it("should allow arrays", () => {
        expect(baseValidators.object()([])).toBe(true);
      });
    });

    describe("any", () => {
      it("should allow any value", () => {
        expect(baseValidators.any()(undefined)).toBe(true);
        expect(baseValidators.any()(null)).toBe(true);
        expect(baseValidators.any()(123)).toBe(true);
        expect(baseValidators.any()({})).toBe(true);
        expect(baseValidators.any()([])).toBe(true);
        expect(baseValidators.any()("")).toBe(true);
        expect(baseValidators.any()(/aregex/)).toBe(true);
      });
    });
  });

  describe("custom type validators", () => {
    describe("numeric", () => {
      it("should allow negative numbers", () => {
        expect(baseValidators.numeric()(-1)).toBe(true);
      });

      it("should allow positive numbers", () => {
        expect(baseValidators.numeric()(1)).toBe(true);
      });

      it("should allow 0", () => {
        expect(baseValidators.numeric()(0)).toBe(true);
      });

      it("should allow decimals", () => {
        expect(baseValidators.numeric()(123.4567)).toBe(true);
      });

      it("should allow exponential number notation", () => {
        expect(baseValidators.numeric()(1e3)).toBe(true);
      });

      it("should allow numbers provided as strings", () => {
        expect(baseValidators.numeric()("123.456789")).toBe(true);
      });

      it("show allow negative numbers provided as string", () => {
        expect(baseValidators.numeric()("-1")).toBe(true);
      });

      it("should allow numbers in exponential notation provided as strings", () => {
        expect(baseValidators.numeric()("5.56789e+0")).toBe(true);
      });

      it("should allow negative numbers in exponential notation provided as strings", () => {
        expect(baseValidators.numeric()("-5.56789e+0")).toBe(true);
      });

      it("should allow trailing decimal points", () => {
        expect(baseValidators.numeric()("123.")).toBe(true);
      });

      it("should allow leading decimal points", () => {
        expect(baseValidators.numeric()(".123")).toBe(true);
      });

      it("should not allow two decimal points", () => {
        expect(baseValidators.numeric()(".123.")).toBe(false);
      });

      it("should not allow two trailing decimal points", () => {
        expect(baseValidators.numeric()("123..")).toBe(false);
      });

      it("should not allow two leading decimal points", () => {
        expect(baseValidators.numeric()("..123")).toBe(false);
      });

      it("should not allow numbers provided as strings that end with text", () => {
        expect(baseValidators.numeric()("123.456789aba")).toBe(false);
      });

      it("should not allow numbers provided as strings that begin with text", () => {
        expect(baseValidators.numeric()("aba123.456789")).toBe(false);
      });

      it("should not allow numbers in exponential notation provided as strings that end with text", () => {
        expect(baseValidators.numeric()("5.56789e+0ee")).toBe(false);
      });

      it("should not allow numbers in exponential notation provided as strings that begin with text", () => {
        expect(baseValidators.numeric()("ee5.56789e+0")).toBe(false);
      });

      it("should not allow arrays", () => {
        expect(baseValidators.numeric()([])).toBe(false);
      });

      it("should not allow NaN", () => {
        expect(baseValidators.numeric()(NaN)).toBe(false);
      });

      it("should not allow Infinity", () => {
        expect(baseValidators.numeric()(Infinity)).toBe(false);
      });

      it("should not allow -Infinity", () => {
        expect(baseValidators.numeric()(-Infinity)).toBe(false);
      });

      it("should not allow a boolean", () => {
        expect(baseValidators.numeric()(false)).toBe(false);
      });

      it("should not allow undefined", () => {
        expect(baseValidators.numeric()(undefined)).toBe(false);
      });

      it("should not allow null", () => {
        expect(baseValidators.numeric()(null)).toBe(false);
      });

      it("should not allow a string", () => {
        expect(baseValidators.numeric()("abc")).toBe(false);
      });
    });

    describe("integer", () => {
      it("should allow integers", () => {
        expect(baseValidators.integer()(1)).toBe(true);
      });

      it("should allow zero", () => {
        expect(baseValidators.integer()(0)).toBe(true);
      });

      it("should not allow decimals", () => {
        expect(baseValidators.integer()(1.3)).toBe(false);
      });

      it("should not allow exponential number notation if it is not an integer", () => {
        expect(baseValidators.integer()((0.07).toExponential())).toBe(false);
      });

      it("should allow exponential number notation if it is an integer", () => {
        expect(baseValidators.integer()(1e3)).toBe(true);
      });
    });

    describe("color", () => {
      it("should not allow a boolean", () => {
        expect(baseValidators.color()(false)).toBe(false);
      });

      it("should not allow undefined", () => {
        expect(baseValidators.color()(undefined)).toBe(false);
      });

      it("should not allow arrays", () => {
        expect(baseValidators.color()([])).toBe(false);
      });

      it("should not allow null", () => {
        expect(baseValidators.color()(null)).toBe(false);
      });

      it("should not allow a random string", () => {
        expect(baseValidators.color()("0a")).toBe(false);
      });

      it("should not allow a number", () => {
        expect(baseValidators.color()(345345)).toBe(false);
      });

      it("should allow 3 digit hex strings", () => {
        expect(baseValidators.color()("#123")).toBe(true);
      });

      it("should allow 6 digit hex strings", () => {
        expect(baseValidators.color()("#123456")).toBe(true);
      });

      it("should not allow 5 digit hex strings", () => {
        expect(baseValidators.color()("#12345")).toBe(false);
      });

      it("should not allow 7 digit hex strings", () => {
        expect(baseValidators.color()("#1234567")).toBe(false);
      });

      it("should not allow 2 digit hex strings", () => {
        expect(baseValidators.color()("#12")).toBe(false);
      });

      it("should not allow 0 digit hex strings", () => {
        expect(baseValidators.color()("#")).toBe(false);
      });

      it("should not allow a number", () => {
        expect(baseValidators.color()(345345)).toBe(false);
      });

      it("should allow rgb notation strings", () => {
        expect(baseValidators.color()("rgb(123,123,123)")).toBe(true);
      });

      it("should not allow rgb notation strings when a color value is greater than 255", () => {
        expect(baseValidators.color()("rgb(123,256,123)")).toBe(false);
      });

      it("should not allow rgb notation strings when a color value is less than 0", () => {
        expect(baseValidators.color()("rgb(123,-123,123)")).toBe(false);
      });

      it("should not allow rgb notation strings when a color value is not numeric", () => {
        expect(baseValidators.color()("rgb(a123,123,123)")).toBe(false);
      });

      it("should allow rgba notation strings", () => {
        expect(baseValidators.color()("rgba(123,123,123, 1)")).toBe(true);
      });

      it("should not allow rgba notation strings when the alpha value is greater than 1", () => {
        expect(baseValidators.color()("rgba(123,256,123,1.1)")).toBe(false);
      });

      it("should not allow rgba notation strings when the alpha value is less than 0", () => {
        expect(baseValidators.color()("rgba(123,123,123,-1)")).toBe(false);
      });

      it("should not allow rgba notation strings when the alpha value is not numeric", () => {
        expect(baseValidators.color()("rgb(123,123,123,a)")).toBe(false);
      });
    });

    describe("dateISO", () => {
      it("should not allow a boolean", () => {
        expect(baseValidators.dateISO()(false)).toBe(false);
      });

      it("should not allow undefined", () => {
        expect(baseValidators.dateISO()(undefined)).toBe(false);
      });

      it("should not allow arrays", () => {
        expect(baseValidators.dateISO()([])).toBe(false);
      });

      it("should not allow null", () => {
        expect(baseValidators.dateISO()(null)).toBe(false);
      });

      it("should not allow a random string", () => {
        expect(baseValidators.dateISO()("0a")).toBe(false);
      });

      it("should not allow a number", () => {
        expect(baseValidators.dateISO()(345345)).toBe(false);
      });

      it("should not allow a number", () => {
        expect(baseValidators.dateISO()(345345)).toBe(false);
      });

      it("should not allow a date string when the month is 13", () => {
        expect(baseValidators.dateISO()("2015-13-05T12:35:45Z")).toBe(false);
      });

      it("should not allow a date string with slashes instead of dashes", () => {
        expect(baseValidators.dateISO()("2016/09/01T00:00:00Z")).toBe(false);
      });

      it("should allow a date string with only the year", () => {
        expect(baseValidators.dateISO()("2016")).toBe(true);
      });

      it("should allow a date string with only the date", () => {
        expect(baseValidators.dateISO()("2016-09-01")).toBe(true);
      });

      it("should allow a date string with only the date and time", () => {
        expect(baseValidators.dateISO()("2016-09-01T00:00")).toBe(true);
      });

      it("should allow a full date string", () => {
        expect(baseValidators.dateISO()("2016-09-01T00:00:00Z")).toBe(true);
      });
    });

    describe("dateAny", () => {
      it("should not allow a boolean", () => {
        expect(baseValidators.dateAny()(false)).toBe(false);
      });

      it("should not allow undefined", () => {
        expect(baseValidators.dateAny()(undefined)).toBe(false);
      });

      it("should not allow arrays", () => {
        expect(baseValidators.dateAny()([])).toBe(false);
      });

      it("should not allow null", () => {
        expect(baseValidators.dateAny()(null)).toBe(false);
      });

      it("should allow a number", () => {
        expect(baseValidators.dateAny()(123)).toBe(true);
      });

      it("should allow a full date string", () => {
        expect(baseValidators.dateAny()("2016-09-01T00:00:00Z")).toBe(true);
      });

      it("should not allow a date string with slashes instead of dashes", () => {
        expect(baseValidators.dateAny()("2016/09/01T00:00:00Z")).toBe(false);
      });
    });
  });

  describe("argument type validators", () => {
    describe("instance of", () => {
      it("should allow values that are an instance of the specified type", () => {
        class AClass {}
        expect(baseValidators.instanceOf(AClass)(new AClass())).toBe(true);
      });

      it("should not allow values that are not an instance of the specified type", () => {
        class AClass {}
        class BClass {}
        expect(baseValidators.instanceOf(AClass)(new BClass())).toBe(false);
      });
    });

    describe("type of", () => {
      it("should allow values whose type is the specified type", () => {
        expect(baseValidators.typeOf("object")({})).toBe(true);
      });

      it("should not allow values whose type is not the specified type", () => {
        expect(baseValidators.typeOf("object")(123)).toBe(false);
      });
    });

    describe("custom validator", () => {
      it("should allow values for which the custom validator function returns true", () => {
        expect(baseValidators.custom(v => v === 123)(123)).toBe(true);
      });

      it("should not allow values for which the custom validator function returns false", () => {
        expect(baseValidators.custom(v => v === 123)(124)).toBe(false);
      });
    });

    describe("number min", () => {
      it("should not allow undefined", () => {
        expect(baseValidators.numberMin(0)(undefined)).toBe(false);
      });

      it("should not allow numbers less than the argument", () => {
        expect(baseValidators.numberMin(0)(-2)).toBe(false);
      });

      it("should allow numbers greater than the argument", () => {
        expect(baseValidators.numberMin(4)(5)).toBe(true);
      });

      it("should allow numbers equal to the argument", () => {
        expect(baseValidators.numberMin(4)(4)).toBe(true);
      });
    });

    describe("number max", () => {
      it("should not allow undefined", () => {
        expect(baseValidators.numberMax(0)(undefined)).toBe(false);
      });

      it("should not allow numbers greater than the argument", () => {
        expect(baseValidators.numberMax(0)(2)).toBe(false);
      });

      it("should allow numbers less than the argument", () => {
        expect(baseValidators.numberMax(4)(3)).toBe(true);
      });

      it("should allow numbers equal to the argument", () => {
        expect(baseValidators.numberMax(4)(4)).toBe(true);
      });
    });

    describe("number min max", () => {
      it("should not allow undefined", () => {
        expect(baseValidators.numberMinMax(0, 0)(undefined)).toBe(false);
      });

      it("should not allow numbers greater than the max argument", () => {
        expect(baseValidators.numberMinMax(0, 1)(2)).toBe(false);
      });

      it("should not allow numbers less than the min argument", () => {
        expect(baseValidators.numberMinMax(0, 1)(-1)).toBe(false);
      });

      it("should allow numbers between the min and maxargument", () => {
        expect(baseValidators.numberMinMax(3, 4)(3.5)).toBe(true);
      });

      it("should allow numbers equal to the min argument", () => {
        expect(baseValidators.numberMinMax(0, 4)(0)).toBe(true);
      });

      it("should allow numbers equal to the max argument", () => {
        expect(baseValidators.numberMinMax(0, 4)(4)).toBe(true);
      });

      it("should allow numbers equal to both arguments", () => {
        expect(baseValidators.numberMinMax(2, 2)(2)).toBe(true);
      });
    });

    describe("numeric min", () => {
      it("should not allow undefined", () => {
        expect(baseValidators.numericMin(0)(undefined)).toBe(false);
      });

      it("should not allow numbers less than the argument", () => {
        expect(baseValidators.numericMin(0)("-2")).toBe(false);
      });

      it("should allow numbers greater than the argument", () => {
        expect(baseValidators.numericMin(4)("5")).toBe(true);
      });

      it("should allow numbers equal to the argument", () => {
        expect(baseValidators.numericMin(4)("4")).toBe(true);
      });
    });

    describe("numeric max", () => {
      it("should not allow undefined", () => {
        expect(baseValidators.numericMax(0)(undefined)).toBe(false);
      });

      it("should not allow numbers greater than the argument", () => {
        expect(baseValidators.numericMax(0)("2")).toBe(false);
      });

      it("should allow numbers less than the argument", () => {
        expect(baseValidators.numericMax(4)("3")).toBe(true);
      });

      it("should allow numbers equal to the argument", () => {
        expect(baseValidators.numericMax(4)("4")).toBe(true);
      });
    });

    describe("numeric min max", () => {
      it("should not allow undefined", () => {
        expect(baseValidators.numericMinMax(0, 0)(undefined)).toBe(false);
      });

      it("should not allow numbers greater than the max argument", () => {
        expect(baseValidators.numericMinMax(0, 1)("2")).toBe(false);
      });

      it("should not allow numbers less than the min argument", () => {
        expect(baseValidators.numericMinMax(0, 1)("-1")).toBe(false);
      });

      it("should allow numbers between the min and maxargument", () => {
        expect(baseValidators.numericMinMax(3, 4)("3.5")).toBe(true);
      });

      it("should allow numbers equal to the min argument", () => {
        expect(baseValidators.numericMinMax(0, 4)("0")).toBe(true);
      });

      it("should allow numbers equal to the max argument", () => {
        expect(baseValidators.numericMinMax(0, 4)("4")).toBe(true);
      });

      it("should allow numbers equal to both arguments", () => {
        expect(baseValidators.numericMinMax(2, 2)("2")).toBe(true);
      });
    });

    describe("integer min", () => {
      it("should not allow undefined", () => {
        expect(baseValidators.integerMin(0)(undefined)).toBe(false);
      });

      it("should not allow decimals", () => {
        expect(baseValidators.integerMin(0)(1.2)).toBe(false);
      });

      it("should not allow numbers less than the argument", () => {
        expect(baseValidators.integerMin(0)(-2)).toBe(false);
      });

      it("should allow numbers greater than the argument", () => {
        expect(baseValidators.integerMin(4)(5)).toBe(true);
      });

      it("should allow numbers equal to the argument", () => {
        expect(baseValidators.integerMin(4)(4)).toBe(true);
      });
    });

    describe("integer max", () => {
      it("should not allow undefined", () => {
        expect(baseValidators.integerMax(0)(undefined)).toBe(false);
      });

      it("should not allow decimals", () => {
        expect(baseValidators.integerMax(2)(1.2)).toBe(false);
      });

      it("should not allow numbers greater than the argument", () => {
        expect(baseValidators.integerMax(0)(2)).toBe(false);
      });

      it("should allow numbers less than the argument", () => {
        expect(baseValidators.integerMax(4)(3)).toBe(true);
      });

      it("should allow numbers equal to the argument", () => {
        expect(baseValidators.integerMax(4)(4)).toBe(true);
      });
    });

    describe("integer min max", () => {
      it("should not allow undefined", () => {
        expect(baseValidators.integerMinMax(0, 0)(undefined)).toBe(false);
      });

      it("should not allow decimals", () => {
        expect(baseValidators.integerMinMax(0, 2)(1.2)).toBe(false);
      });

      it("should not allow numbers greater than the max argument", () => {
        expect(baseValidators.integerMinMax(0, 1)(2)).toBe(false);
      });

      it("should not allow numbers less than the min argument", () => {
        expect(baseValidators.integerMinMax(0, 1)(-1)).toBe(false);
      });

      it("should allow numbers between the min and maxargument", () => {
        expect(baseValidators.integerMinMax(2, 4)(3)).toBe(true);
      });

      it("should allow numbers equal to the min argument", () => {
        expect(baseValidators.integerMinMax(0, 4)(0)).toBe(true);
      });

      it("should allow numbers equal to the max argument", () => {
        expect(baseValidators.integerMinMax(0, 4)(4)).toBe(true);
      });

      it("should allow numbers equal to both arguments", () => {
        expect(baseValidators.integerMinMax(2, 2)(2)).toBe(true);
      });
    });

    describe("regexp", () => {
      it("should not allow undefined", () => {
        expect(baseValidators.regexp(/[.]/)(undefined)).toBe(false);
      });

      it("show allow numbers", () => {
        expect(baseValidators.regexp(/[0-9]+/)(92234)).toBe(true);
      });

      it("should allow empty strings if the regex allow it", () => {
        expect(baseValidators.regexp(/[.]*/)("")).toBe(true);
      });

      it("should allow strings that match the regex", () => {
        expect(baseValidators.regexp(/[abc]+/)("ababacca")).toBe(true);
      });

      it("should not allow strings that do not match the regex", () => {
        expect(baseValidators.regexp(/^[abc]+$/)("ababadcca")).toBe(false);
      });
    });

    describe("string with length", () => {
      it("should not allow values that are not a string", () => {
        expect(baseValidators.stringWithLength(0)(null)).toBe(false);
      });

      it("should not allow values that are a string with invalid length", () => {
        expect(baseValidators.stringWithLength(1)("")).toBe(false);
      });

      it("should allow values that are a string with the specified length", () => {
        expect(baseValidators.stringWithLength(1)("a")).toBe(true);
      });
    });

    describe("string with length min", () => {
      it("should not allow values that are not a string", () => {
        expect(baseValidators.stringWithLengthMin(0)(null)).toBe(false);
      });

      it("should not allow values that are a string with invalid length", () => {
        expect(baseValidators.stringWithLengthMin(1)("")).toBe(false);
      });

      it("should allow values that are a string with the specified length", () => {
        expect(baseValidators.stringWithLengthMin(0)("")).toBe(true);
      });

      it("should allow values that are a string with length greater than the specified length", () => {
        expect(baseValidators.stringWithLengthMin(1)("ab")).toBe(true);
      });
    });

    describe("string with length max", () => {
      it("should not allow values that are not a string", () => {
        expect(baseValidators.stringWithLengthMax(0)(null)).toBe(false);
      });

      it("should not allow values that are a string with invalid length", () => {
        expect(baseValidators.stringWithLengthMax(1)("ab")).toBe(false);
      });

      it("should allow values that are a string with the specified length", () => {
        expect(baseValidators.stringWithLengthMax(0)("")).toBe(true);
      });

      it("should allow values that are a string with length less than the specified length", () => {
        expect(baseValidators.stringWithLengthMax(3)("ab")).toBe(true);
      });
    });

    describe("string with length min max", () => {
      it("should not allow values that are not a string", () => {
        expect(baseValidators.stringWithLengthMinMax(0, 1)(null)).toBe(false);
      });

      it("should not allow values that are a string with length greater than max", () => {
        expect(baseValidators.stringWithLengthMinMax(0, 1)("ab")).toBe(false);
      });

      it("should not allow values that are a string with length less than min", () => {
        expect(baseValidators.stringWithLengthMinMax(3, 5)("ab")).toBe(false);
      });

      it("should allow values that are a string with the max length", () => {
        expect(baseValidators.stringWithLengthMinMax(0, 2)("ab")).toBe(true);
      });

      it("should allow values that are a string with the min length", () => {
        expect(baseValidators.stringWithLengthMinMax(0, 2)("")).toBe(true);
      });

      it("should allow values that are an array with length between the specified min and max", () => {
        expect(baseValidators.stringWithLengthMinMax(1, 3)("ab")).toBe(true);
      });
    });

    describe("equal", () => {
      it("should allow values that are equal to the argument", () => {
        expect(baseValidators.equal(undefined)(undefined)).toBe(true);
      });

      it("should not allow values that are not equal to the argument", () => {
        expect(baseValidators.equal(undefined)(1)).toBe(false);
      });
    });

    describe("one of", () => {
      it("should allow values that are equal to one of the array of arguments", () => {
        expect(baseValidators.oneOf([undefined, 1, null])(1)).toBe(true);
      });

      it("should allow values that are equal to the first value in the array of arguments", () => {
        expect(baseValidators.oneOf([undefined, 1, null])(undefined)).toBe(true);
      });

      it("should allow values that are equal to the last value in the array of arguments", () => {
        expect(baseValidators.oneOf([undefined, 1, null])(null)).toBe(true);
      });

      it("should not allow values that are not equal to one of the array of arguments", () => {
        expect(baseValidators.oneOf([undefined, 1, null])(2)).toBe(false);
      });

      it("should not allow values that are not equal to the first value in the array of arguments", () => {
        expect(baseValidators.oneOf([1, undefined, null])(2)).toBe(false);
      });

      it("should not allow values that are not equal to the last value in the array of arguments", () => {
        expect(baseValidators.oneOf([undefined, null, 1])(2)).toBe(false);
      });
    });

    describe("one in", () => {
      it("should allow values that are equal to one of the map of arguments", () => {
        expect(baseValidators.oneIn({ a: true, b: 2 })("a")).toBe(true);
      });

      it("should allow values that are numbers whose string value is equal to one of the map of arguments", () => {
        expect(baseValidators.oneIn({ "1": true, b: 2 })(1)).toBe(true);
      });

      it("should not allow values that are not equal to one of the map of arguments", () => {
        expect(baseValidators.oneIn({ a: true, b: 2 })(4)).toBe(false);
      });
    });

    describe("not equal", () => {
      it("should allow values that are not equal to the argument", () => {
        expect(baseValidators.notEqual(undefined)(1)).toBe(true);
      });

      it("should not allow values that are equal to the argument", () => {
        expect(baseValidators.notEqual(undefined)(undefined)).toBe(false);
      });
    });

    describe("not one of", () => {
      it("should not allow values that are equal to one of the array of arguments", () => {
        expect(baseValidators.notOneOf([undefined, 1, null])(1)).toBe(false);
      });

      it("should not allow values that are equal to the first value in the array of arguments", () => {
        expect(baseValidators.notOneOf([undefined, 1, null])(undefined)).toBe(false);
      });

      it("should not allow values that are equal to the last value in the array of arguments", () => {
        expect(baseValidators.notOneOf([undefined, 1, null])(null)).toBe(false);
      });

      it("should allow values that are not equal to one of the array of arguments", () => {
        expect(baseValidators.notOneOf([undefined, 1, null])(2)).toBe(true);
      });

      it("should allow values that are not equal to the first value in the array of arguments", () => {
        expect(baseValidators.notOneOf([1, undefined, null])(2)).toBe(true);
      });

      it("should allow values that are not equal to the last value in the array of arguments", () => {
        expect(baseValidators.notOneOf([undefined, null, 1])(2)).toBe(true);
      });
    });

    describe("not one in", () => {
      it("should not allow values that are equal to one of the map of arguments", () => {
        expect(baseValidators.notOneIn({ a: true, b: 2 })("a")).toBe(false);
      });

      it("should not allow values that are numbers whose string value is equal to one of the map of arguments", () => {
        expect(baseValidators.notOneIn({ "1": true, b: 2 })(1)).toBe(false);
      });

      it("should allow values that are not equal to one of the map of arguments", () => {
        expect(baseValidators.notOneIn({ a: true, b: 2 })(4)).toBe(true);
      });
    });

    describe("array with length", () => {
      it("should not allow values that are not an array", () => {
        expect(baseValidators.arrayWithLength(0)(null)).toBe(false);
      });

      it("should not allow values that are an array with invalid length", () => {
        expect(baseValidators.arrayWithLength(1)([])).toBe(false);
      });

      it("should allow values that are an array with the specified length", () => {
        expect(baseValidators.arrayWithLength(0)([])).toBe(true);
      });
    });

    describe("array with length min", () => {
      it("should not allow values that are not an array", () => {
        expect(baseValidators.arrayWithLengthMin(0)(null)).toBe(false);
      });

      it("should not allow values that are an array with invalid length", () => {
        expect(baseValidators.arrayWithLengthMin(1)([])).toBe(false);
      });

      it("should allow values that are an array with the specified length", () => {
        expect(baseValidators.arrayWithLengthMin(0)([])).toBe(true);
      });

      it("should allow values that are an array with length greater than the specified length", () => {
        expect(baseValidators.arrayWithLengthMin(1)([1, 2])).toBe(true);
      });
    });

    describe("array with length max", () => {
      it("should not allow values that are not an array", () => {
        expect(baseValidators.arrayWithLengthMax(0)(null)).toBe(false);
      });

      it("should not allow values that are an array with invalid length", () => {
        expect(baseValidators.arrayWithLengthMax(1)(["a", "b"])).toBe(false);
      });

      it("should allow values that are an array with the specified length", () => {
        expect(baseValidators.arrayWithLengthMax(0)([])).toBe(true);
      });

      it("should allow values that are an array with length less than the specified length", () => {
        expect(baseValidators.arrayWithLengthMax(3)(["a", "b"])).toBe(true);
      });
    });

    describe("array with length min max", () => {
      it("should not allow values that are not an array", () => {
        expect(baseValidators.arrayWithLengthMinMax(0, 1)(null)).toBe(false);
      });

      it("should not allow values that are an array with length greater than max", () => {
        expect(baseValidators.arrayWithLengthMinMax(0, 1)(["a", "b"])).toBe(false);
      });

      it("should not allow values that are an array with length less than min", () => {
        expect(baseValidators.arrayWithLengthMinMax(3, 5)(["a", "b"])).toBe(false);
      });

      it("should allow values that are an array with the max length", () => {
        expect(baseValidators.arrayWithLengthMinMax(0, 2)(["a"])).toBe(true);
      });

      it("should allow values that are an array with the min length", () => {
        expect(baseValidators.arrayWithLengthMinMax(0, 2)([])).toBe(true);
      });

      it("should allow values that are an array with length between the specified min and max", () => {
        expect(baseValidators.arrayWithLengthMinMax(1, 3)(["a", "b"])).toBe(true);
      });
    });
  });

  describe("compound validators", () => {
    describe("array of", () => {
      it("exposes the item validator as metadata", () => {
        const itemValidator = baseValidators.string();
        expect(baseValidators.arrayOf(itemValidator).itemValidator).toBe(itemValidator);
      });

      it("should allow an array of undefined values if they are permitted", () => {
        expect(baseValidators.arrayOf(baseValidators.notEqual(null))([undefined, undefined])).toBe(true);
      });

      it("should allow empty arrays if they are permitted", () => {
        expect(baseValidators.arrayOf(baseValidators.notEqual(null), true)([])).toBe(true);
      });

      it("should not allow empty arrays if they are forbidden", () => {
        expect(baseValidators.arrayOf(baseValidators.notEqual(null), false)([])).toBe(false);
      });

      it("should allow arrays when all elements match the element validator", () => {
        expect(baseValidators.arrayOf(baseValidators.notEqual(null))([1, 2, 3])).toBe(true);
      });

      it("should not allow arrays when some element does not match the element validator", () => {
        expect(baseValidators.arrayOf(baseValidators.notEqual(null))([1, null, 3])).toBe(false);
      });
    });

    describe("object with", () => {
      it("should not allow empty ojects", () => {
        expect(baseValidators.objectWith(["a", "b"], baseValidators.equal(undefined))({})).toBe(false);
      });

      it("should allow an object with exact properties and values that match the property validator", () => {
        expect(baseValidators.objectWith(["a", "b"], baseValidators.numberMin(5))({ a: 6, b: 7 })).toBe(true);
      });

      it("should not allow an object when some properties and values do not match the property validator", () => {
        expect(baseValidators.objectWith(["a", "b"], baseValidators.numberMin(5))({ a: 6, b: 4 })).toBe(false);
      });

      it("should not allow an object if any of the properties are missing", () => {
        expect(baseValidators.objectWith(["a", "b", "c"], baseValidators.notEqual(null))({ a: 6, c: 4 })).toBe(false);
      });

      it("should not allow an object if extra properties are present", () => {
        expect(
          baseValidators.objectWith(["a", "b", "c"], baseValidators.notEqual(null))({ a: 6, b: 2, c: 4, d: 5 })
        ).toBe(false);
      });

      it("should not allow an object if extra properties are present and some are missing", () => {
        expect(
          baseValidators.objectWith(["a", "b", "c"], baseValidators.notEqual(null))({ a: 6, bbb: 2, c: 4, d: 5 })
        ).toBe(false);
      });
    });

    describe("object with some", () => {
      it("should not allow empty ojects", () => {
        expect(baseValidators.objectWithSome(["a", "b"], baseValidators.equal(undefined))({})).toBe(false);
      });

      it("should allow an object with exact properties and values that match the property validator", () => {
        expect(baseValidators.objectWithSome(["a", "b"], baseValidators.numberMin(5))({ a: 6, b: 7 })).toBe(true);
      });

      it("should not allow an object when some properties and values do not match the property validator", () => {
        expect(baseValidators.objectWithSome(["a", "b"], baseValidators.numberMin(5))({ a: 6, b: 4 })).toBe(false);
      });

      it("should allow an object if some of the properties are missing", () => {
        expect(baseValidators.objectWithSome(["a", "b", "c"], baseValidators.notEqual(null))({ a: 6, c: 4 })).toBe(
          true
        );
      });

      it("should not allow an object if extra properties are present", () => {
        expect(
          baseValidators.objectWithSome(["a", "b", "c"], baseValidators.notEqual(null))({ a: 6, b: 2, c: 4, d: 5 })
        ).toBe(false);
      });

      it("should not allow an object if extra properties are present and some are missing", () => {
        expect(
          baseValidators.objectWithSome(["a", "b", "c"], baseValidators.notEqual(null))({ a: 6, bbb: 2, c: 4, d: 5 })
        ).toBe(false);
      });
    });

    describe("object with shape", () => {
      it("should not allow empty objects", () => {
        expect(baseValidators.objectWithShape({ a: baseValidators.notEqual(undefined) })({})).toBe(false);
      });

      it("should allow empty objects if that matches all property validators", () => {
        expect(baseValidators.objectWithShape({ a: baseValidators.equal(undefined) })({})).toBe(true);
      });

      it("should allow an object with exact properties and values that match the property validator", () => {
        expect(
          baseValidators.objectWithShape({ a: baseValidators.numberMin(5), b: baseValidators.numberMin(5) })({
            a: 6,
            b: 7
          })
        ).toBe(true);
      });

      it("should not allow an object when some properties and values do not match the property validator", () => {
        expect(
          baseValidators.objectWithShape({ a: baseValidators.numberMin(5), b: baseValidators.numberMin(5) })({
            a: 6,
            b: 4
          })
        ).toBe(false);
      });

      it("should allow an object if some of the properties are missing", () => {
        expect(
          baseValidators.objectWithShape({
            a: baseValidators.notEqual(null),
            b: baseValidators.notEqual(null),
            c: baseValidators.notEqual(null)
          })({ a: 6, c: 4 })
        ).toBe(true);
      });

      it("should not allow an object if extra properties are present", () => {
        expect(
          baseValidators.objectWithShape({
            a: baseValidators.notEqual(null),
            b: baseValidators.notEqual(null),
            c: baseValidators.notEqual(null)
          })({ a: 6, b: 2, c: 4, d: 5 })
        ).toBe(false);
      });

      it("should not allow an object if extra properties are present and some are missing", () => {
        expect(
          baseValidators.objectWithShape({
            a: baseValidators.notEqual(null),
            b: baseValidators.notEqual(null),
            c: baseValidators.notEqual(null)
          })({ a: 6, bbb: 2, c: 4, d: 5 })
        ).toBe(false);
      });

      it("should allow an object if extra properties are present and they are permitted", () => {
        expect(
          baseValidators.objectWithShape(
            { a: baseValidators.notEqual(null), b: baseValidators.notEqual(null), c: baseValidators.notEqual(null) },
            true
          )({ a: 6, b: 2, c: 4, d: 5 })
        ).toBe(true);
      });
    });

    describe("or", () => {
      it("exposes its alternative validators as metadata", () => {
        const alternatives = [baseValidators.equal(1), baseValidators.equal(2)];
        expect(baseValidators.or(alternatives).alternativeValidators).toEqual(alternatives);
      });

      it("should not allow values when all validators return false", () => {
        expect(baseValidators.or([baseValidators.equal(1), baseValidators.equal(2)])(3)).toIsEqual(false);
      });

      it("should allow values when one validator returns true", () => {
        expect(baseValidators.or([baseValidators.equal(1), baseValidators.equal(2)])(2)).toIsEqual(true);
      });
    });

    describe("and", () => {
      it("does not expose intersections as alternatives", () => {
        const validators = [baseValidators.numberMin(1), baseValidators.numberMax(3)];
        expect(baseValidators.and(validators).alternativeValidators).toBeNull();
      });

      it("should not allow values when all validators return false", () => {
        expect(baseValidators.and([baseValidators.equal(1), baseValidators.equal(2)])(3)).toIsEqual(false);
      });

      it("should not allow values when only one validator returns true", () => {
        expect(baseValidators.and([baseValidators.equal(1), baseValidators.equal(2)])(2)).toIsEqual(false);
      });

      it("should allow values when all validators return true", () => {
        expect(baseValidators.and([baseValidators.numberMin(1), baseValidators.numberMax(3)])(2)).toIsEqual(true);
      });
    });

    describe("not", () => {
      it("does not expose a negated validator as an alternative", () => {
        expect(baseValidators.not(baseValidators.equal(1)).alternativeValidators).toBeNull();
      });

      it("should allow values that are invalid", () => {
        expect(baseValidators.not(baseValidators.equal(1))(2)).toIsEqual(true);
      });

      it("should not allow values that are valid", () => {
        expect(baseValidators.not(baseValidators.equal(1))(1)).toIsEqual(false);
      });
    });
  });

  describe("conditional validator", () => {
    it("exposes every possible rule validator as an alternative", () => {
      const alternatives = [baseValidators.string(), baseValidators.number()];
      const rules = [
        { condition: ({ type }) => type === "string", validator: alternatives[0] },
        { condition: () => true, validator: alternatives[1] }
      ];
      expect(baseValidators.conditional(rules, { type: "string" }).alternativeValidators).toEqual(alternatives);
    });

    it("should allow values that are allowed by the validator for the matched rule", () => {
      const rules = [
        {
          condition: ({ type }) => type === "string",
          suffix: "when type is string",
          validator: baseValidators.string()
        }
      ];
      const object = { type: "string" };
      expect(baseValidators.conditional(rules, object)("a")).toIsEqual(true);
    });

    it("should not allow values that are not allowed by the validator for the matched rule", () => {
      const rules = [
        {
          condition: ({ type }) => type === "string",
          suffix: "when type is string",
          validator: baseValidators.string()
        }
      ];
      const object = { type: "string" };
      expect(baseValidators.conditional(rules, object)(1)).toIsEqual(false);
    });

    it("should use the validator for the first matched rule", () => {
      const rules = [
        {
          condition: ({ type }) => type === "string",
          suffix: "when type is string",
          validator: baseValidators.string()
        },
        { condition: () => true, validator: baseValidators.equal(123) }
      ];
      const object = { type: "string" };
      expect(baseValidators.conditional(rules, object)("a")).toIsEqual(true);
      expect(baseValidators.conditional(rules, object)(123)).toIsEqual(false);
    });

    it("should check the conditions for all rules until a match is found", () => {
      let count = 0;
      const rules = [
        {
          condition: ({ type }) => {
            count++;
            return type === "string";
          },
          suffix: "when type is string",
          validator: baseValidators.string()
        },
        {
          condition: ({ type }) => {
            count++;
            return type === "number";
          },
          suffix: "when type is number",
          validator: baseValidators.number()
        },
        {
          condition: () => {
            count++;
            return true;
          },
          validator: baseValidators.equal(123)
        }
      ];
      const object = { type: "abc" };
      expect(baseValidators.conditional(rules, object)(123)).toIsEqual(true);
      expect(count).toIsEqual(rules.length);
    });

    it("should have an errorMessages array with one message per rule", () => {
      const rules = [
        {
          condition: ({ type }) => type === "string",
          suffix: "when type is string",
          validator: baseValidators.string()
        },
        {
          condition: ({ type }) => type === "number",
          suffix: "when type is number",
          validator: baseValidators.number()
        },
        { condition: () => true, validator: baseValidators.equal(123) }
      ];
      const object = {};
      const validator = baseValidators.conditional(rules, object);
      expect(validator.errorMessages.length).toIsEqual(3);
      expect(validator.errorMessages).toIsEqual([
        "should be a string when type is string",
        "should be a number when type is number",
        "should be equal to 123"
      ]);
    });

    it("should set the error message to the message of the validator for the matched rule", () => {
      const rules = [
        {
          condition: ({ type }) => type === "string",
          suffix: "when type is string",
          validator: baseValidators.string()
        },
        {
          condition: ({ type }) => type === "number",
          suffix: "when type is number",
          validator: baseValidators.number()
        },
        { condition: () => true, validator: baseValidators.equal(123) }
      ];
      const object = {};
      const validator = baseValidators.conditional(rules, object);
      expect(validator.errorMessage).toIsEqual("should be equal to 123");
    });
  });

  describe("messages", () => {
    it("should output validator messages for all validators", () => {
      let validator;
      validatorKeys.forEach(validatorKey => {
        validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
        expect(validator).toBeInstanceOf(Function);
        expect(validator.errorMessage).toBeTruthy();
        expect(validator.errorMessages).toBeInstanceOf(Array);
        expect(validator.getErrorMessage).toBeInstanceOf(Function);
        expect(validator.getErrorMessage()).toBeTruthy();
      });
    });

    it("should have an errorMessages array with one error message for regular validators", () => {
      let validator;
      regularValidatorKeys.forEach(validatorKey => {
        validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
        expect(validator).toBeInstanceOf(Function);
        expect(validator.errorMessage).toBeTruthy();
        expect(validator.errorMessages).toBeInstanceOf(Array);
        expect([validator.errorMessage]).toIsEqual(validator.errorMessages);
      });
    });

    it("should allow a custom message via a message property on a custom validator function", () => {
      const validator = baseValidators.custom(customValidator);
      expect(validator.errorMessage).toBe(customValidator.message);
      expect(validator.errorMessages).toBeInstanceOf(Array);
      expect([validator.errorMessage]).toIsEqual(validator.errorMessages);
      expect(validator.getErrorMessage).toBeInstanceOf(Function);
      expect(validator.getErrorMessage()).toBe(customValidator.message + ": undefined");
    });

    it("should allow appending to a custom message on a custom validator function", () => {
      const appendToMessage = "and more";
      const validator = baseValidators.custom(customValidator).appendMessage(appendToMessage);
      expect(validator.errorMessage).toBe(customValidator.message + appendToMessage);
      expect(validator.errorMessages).toBeInstanceOf(Array);
      expect([validator.errorMessage]).toIsEqual(validator.errorMessages);
      expect(validator.getErrorMessage).toBeInstanceOf(Function);
      expect(validator.getErrorMessage()).toBe(customValidator.message + appendToMessage + ": undefined");
    });
  });

  describe("allowedValues", () => {
    it("should return the value for equal", () => {
      expect(baseValidators.equal("hello").allowedValues).toIsEqual(["hello"]);
    });

    it("should return all allowed values for oneOf", () => {
      expect(baseValidators.oneOf(["hello", "there"]).allowedValues).toIsEqual(["hello", "there"]);
    });

    it("should return all allowed values for or when all argument validators are isEnum", () => {
      expect(
        baseValidators.or([baseValidators.equal("why"), baseValidators.oneOf(["hello", "there"])]).allowedValues
      ).toIsEqual(["why", "hello", "there"]);
    });

    it("should not return some null allowed values for or when some argument validators are isEnum but others are not", () => {
      expect(
        baseValidators.or([baseValidators.number(), baseValidators.oneOf(["hello", "there"])]).allowedValues
      ).toIsEqual(["hello", "there"]);
    });

    it("should only return a single null value for or when no argument validators are isEnum", () => {
      expect(baseValidators.or([baseValidators.number(), baseValidators.string()]).allowedValues).toIsEqual(null);
    });

    it("should return null for all validators that do not have allowed values", () => {
      let validator;
      regularValidatorKeys.forEach(validatorKey => {
        validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
        if (
          validator.validatorName !== "equal" &&
          validator.validatorName !== "oneOf" &&
          validator.validatorName !== "oneIn" &&
          validator.validatorName !== "or"
        ) {
          expect(validator.allowedValues).toIsEqual(null);
        }
      });
    });
  });

  describe("isEnum", () => {
    it("should return true for equal", () => {
      expect(baseValidators.equal("hello").isEnum).toIsEqual(true);
    });

    it("should return true for oneOf", () => {
      expect(baseValidators.oneOf(["hello", "there"]).isEnum).toIsEqual(true);
    });

    it("should return true for or when all argument validators are isEnum", () => {
      expect(
        baseValidators.or([baseValidators.equal("why"), baseValidators.oneOf(["hello", "there"])]).isEnum
      ).toIsEqual(true);
    });

    it("should return false for or when some argument validators are isEnum but others are not", () => {
      expect(baseValidators.or([baseValidators.number(), baseValidators.oneOf(["hello", "there"])]).isEnum).toIsEqual(
        false
      );
    });

    it("should return false for or when no argument validators are isEnum", () => {
      expect(baseValidators.or([baseValidators.number(), baseValidators.string()]).isEnum).toIsEqual(false);
    });

    it("should return false for all validators that do not have allowed values", () => {
      let validator;
      regularValidatorKeys.forEach(validatorKey => {
        if (isEnumValidatorNames[validatorKey] !== true) {
          validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
          expect(validator.isEnum).toIsEqual(false);
        }
      });
    });
  });

  describe("nestedValues", () => {
    it("should return the nested value map for objectWith", () => {
      expect(baseValidators.objectWith(["a", "b", "c"], baseValidators.number()).nestedValues).toIsEqual({
        a: baseValidators.number(),
        b: baseValidators.number(),
        c: baseValidators.number()
      });
    });

    it("should return the nested value map for objectWithSome", () => {
      expect(baseValidators.objectWithSome(["a", "b", "c"], baseValidators.number()).nestedValues).toIsEqual({
        a: baseValidators.number().orEqual(undefined),
        b: baseValidators.number().orEqual(undefined),
        c: baseValidators.number().orEqual(undefined)
      });
    });

    it("should return the nested value map for objectWithSome", () => {
      expect(
        baseValidators.objectWithShape({
          a: baseValidators.number(),
          b: baseValidators.number(),
          c: baseValidators.number()
        }).nestedValues
      ).toIsEqual({
        a: baseValidators.number(),
        b: baseValidators.number(),
        c: baseValidators.number()
      });
    });

    it("should return null for all validators that do not have nestedValues", () => {
      const nestedValidatorNames = { objectWith: true, objectWithSome: true, objectWithShape: true };
      let validator;
      regularValidatorKeys.forEach(validatorKey => {
        if (nestedValidatorNames[validatorKey] !== true) {
          validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
          expect(validator.nestedValues).toIsEqual(null);
        }
      });
    });
  });

  describe("extensions", () => {
    const getErrorMessageEnd = ": undefined";

    it("should output validator extensions for all validators", () => {
      let validator;
      regularValidatorKeys.forEach(validatorKey => {
        validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
        expect(validator).toBeInstanceOf(Function);
        extensionKeys.forEach(extensionKey => {
          const extension = validator[extensionKey](...extensionInputs[extensionKey].args);
          expect(extension).toBeInstanceOf(Function);
          expect(extension.errorMessage).toBeTruthy();
          expect(extension.getErrorMessage).toBeInstanceOf(Function);
          expect(extension.getErrorMessage()).toBeTruthy();
        });
      });
    });

    it("should change the validation result when the extension warrants it", () => {
      const validator = baseValidators.number();
      expect(validator("abc")).toBe(false);
      expect(validator.orEqual("abc")("abc")).toBe(true);
      expect(validator.orOneOf(["ab", "abcd"])("abcd")).toBe(true);
      expect(validator.or(baseValidators.equal("abcd"))("abcd")).toBe(true);
    });

    it("should expose validators added with or as alternatives", () => {
      const base = baseValidators.string();
      const alternative = baseValidators.number();
      expect(base.or(alternative).alternativeValidators).toEqual([base, alternative]);
    });

    it("should not change the validation result when the extension does not warrant it", () => {
      const validator = baseValidators.number();
      expect(validator("abc")).toBe(false);
      expect(validator.orEqual(5)("abc")).toBe(false);
      expect(validator.orOneOf(["ab", "abc"])("abcd")).toBe(false);
      expect(validator.or(baseValidators.equal("abc"))("abcd")).toBe(false);
    });

    it("should append the extension error message to the validator error message", () => {
      const validator = baseValidators.number();
      expect(validator.errorMessage).toBeTruthy();
      const extension = validator.orEqual(1);
      expect(extension.errorMessage).toBeTruthy();
      expect(extension.errorMessage.startsWith(validator.errorMessage)).toBe(true);
    });

    it("should support changing all validator messages", () => {
      const customMessage = "hello";

      let validator;
      validatorKeys.forEach(validatorKey => {
        validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
        validator = validator.withMessage(customMessage);

        expect(validator).toBeInstanceOf(Function);
        expect(validator(validatorInputs[validatorKey].valid)).toIsEqual(true, validatorKey);
        if (validatorKey !== "any") {
          expect(validator(validatorInputs[validatorKey].invalid)).toIsEqual(false, validatorKey);
        }
        expect(validator.errorMessage).toIsEqual(customMessage);
        expect(validator.getErrorMessage).toBeInstanceOf(Function);
        expect(validator.getErrorMessage()).toIsEqual(customMessage + getErrorMessageEnd);
      });
    });

    it("should support changing all validator extension messages", () => {
      const customMessage = "hello";

      let validator;
      regularValidatorKeys.forEach(validatorKey => {
        validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
        expect(validator).toBeInstanceOf(Function);
        extensionKeys.forEach(extensionKey => {
          let extension = validator[extensionKey](...extensionInputs[extensionKey].args);
          extension = extension.withMessage(customMessage);

          expect(extension).toBeInstanceOf(Function);
          expect(extension(extensionInputs[extensionKey].valid)).toIsEqual(true, validatorKey + " - " + extensionKey);
          if (validatorKey !== "any") {
            expect(validator(validatorInputs[validatorKey].invalid)).toIsEqual(
              false,
              validatorKey + " - " + extensionKey
            );
          }
          expect(extension.errorMessage).toIsEqual(customMessage);
          expect(extension.getErrorMessage).toBeInstanceOf(Function);
          expect(extension.getErrorMessage()).toIsEqual(customMessage + ": undefined");
        });
      });
    });

    it("should support prepending to all validator messages", () => {
      const customMessage = "hello";

      let validator;
      validatorKeys.forEach(validatorKey => {
        validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
        validator = validator.prependMessage(customMessage);

        expect(validator).toBeInstanceOf(Function);
        expect(validator(validatorInputs[validatorKey].valid)).toIsEqual(true, validatorKey);
        if (validatorKey !== "any") {
          expect(validator(validatorInputs[validatorKey].invalid)).toIsEqual(false, validatorKey);
        }
        expect(validator.errorMessage.substring(0, customMessage.length)).toIsEqual(customMessage);
        expect(validator.getErrorMessage).toBeInstanceOf(Function);
        expect(validator.getErrorMessage().substring(0, customMessage.length)).toIsEqual(customMessage);
      });
    });

    it("should support prepending to all validator extension messages", () => {
      const customMessage = "hello";

      let validator;
      regularValidatorKeys.forEach(validatorKey => {
        validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
        expect(validator).toBeInstanceOf(Function);
        extensionKeys.forEach(extensionKey => {
          let extension = validator[extensionKey](...extensionInputs[extensionKey].args);
          extension = extension.prependMessage(customMessage);

          expect(extension).toBeInstanceOf(Function);
          expect(extension(extensionInputs[extensionKey].valid)).toIsEqual(true);
          expect(extension(validatorInputs[validatorKey].invalid)).toIsEqual(false);
          expect(extension.errorMessage.substring(0, customMessage.length)).toIsEqual(customMessage);
          expect(extension.getErrorMessage).toBeInstanceOf(Function);
          expect(extension.getErrorMessage().substring(0, customMessage.length)).toIsEqual(customMessage);
        });
      });
    });

    it("should support appending to all validator messages", () => {
      const customMessage = "hello";

      let validator;
      validatorKeys.forEach(validatorKey => {
        validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
        validator = validator.appendMessage(customMessage);

        expect(validator).toBeInstanceOf(Function);
        expect(validator(validatorInputs[validatorKey].valid)).toIsEqual(true, validatorKey);
        if (validatorKey !== "any") {
          expect(validator(validatorInputs[validatorKey].invalid)).toIsEqual(false, validatorKey);
        }
        expect(
          validator.errorMessage.substring(
            validator.errorMessage.length - customMessage.length,
            validator.errorMessage.length
          )
        ).toIsEqual(customMessage);
        expect(validator.getErrorMessage).toBeInstanceOf(Function);
        const fullErrorMessage = validator.getErrorMessage();
        const expectedCustomMessageStart = fullErrorMessage.length - getErrorMessageEnd.length - customMessage.length;
        expect(
          fullErrorMessage.substring(expectedCustomMessageStart, expectedCustomMessageStart + customMessage.length)
        ).toIsEqual(customMessage);
      });
    });

    it("should support appending to all validator extension messages", () => {
      const customMessage = "hello";

      let validator;
      regularValidatorKeys.forEach(validatorKey => {
        validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
        expect(validator).toBeInstanceOf(Function);
        extensionKeys.forEach(extensionKey => {
          let extension = validator[extensionKey](...extensionInputs[extensionKey].args);
          extension = extension.appendMessage(customMessage);

          expect(extension).toBeInstanceOf(Function);
          expect(extension(extensionInputs[extensionKey].valid)).toIsEqual(true, validatorKey + " - " + extensionKey);
          expect(extension(validatorInputs[validatorKey].valid)).toIsEqual(true, validatorKey + " - " + extensionKey);
          expect(
            extension.errorMessage.substring(
              extension.errorMessage.length - customMessage.length,
              extension.errorMessage.length
            )
          ).toIsEqual(customMessage);
          expect(extension.getErrorMessage).toBeInstanceOf(Function);
          const fullErrorMessage = extension.getErrorMessage();
          const expectedCustomMessageStart = fullErrorMessage.length - getErrorMessageEnd.length - customMessage.length;
          expect(
            extension
              .getErrorMessage()
              .substring(expectedCustomMessageStart, expectedCustomMessageStart + customMessage.length)
          ).toIsEqual(customMessage);
        });
      });
    });

    describe("allowedValues", () => {
      it("should return the value for orEqual on a validator with no allowedValues", () => {
        expect(baseValidators.string().orEqual("hello").allowedValues).toIsEqual(["hello"]);
      });

      it("should append the value for orEqual on a validator with allowedValues", () => {
        expect(baseValidators.equal("hello").orEqual("there").allowedValues).toIsEqual(["hello", "there"]);
      });

      it("should return all allowed values for orOneOf on a validator with no allowedValues", () => {
        expect(baseValidators.string().orOneOf(["hello", "there"]).allowedValues).toIsEqual(["hello", "there"]);
      });

      it("should append all allowed values for orOneOf on a validator with allowedValues", () => {
        expect(baseValidators.oneOf(["why", "yes"]).orOneOf(["hello", "there"]).allowedValues).toIsEqual([
          "why",
          "yes",
          "hello",
          "there"
        ]);
      });

      it("should return all allowed values for .or with allowedValues on a validator with no allowedValues", () => {
        expect(baseValidators.string().or(baseValidators.oneOf(["hello", "there"])).allowedValues).toIsEqual([
          "hello",
          "there"
        ]);
      });

      it("should append all allowed values for .or with allowedValues on a validator with no allowedValues", () => {
        expect(baseValidators.equal("why").or(baseValidators.oneOf(["hello", "there"])).allowedValues).toIsEqual([
          "why",
          "hello",
          "there"
        ]);
      });

      it("should not append any values for .or with no allowedValues on a validator with allowedValues", () => {
        expect(baseValidators.equal("hey").or(baseValidators.string()).allowedValues).toIsEqual(["hey"]);
      });

      it("should return null for a .or with no allowedValues on a validator with no allowedValues", () => {
        expect(baseValidators.string().or(baseValidators.number()).allowedValues).toIsEqual(null);
      });

      it("should not modify the original validator", () => {
        let validator, extension;
        let validatorAllowedValues, extensionAllowedValues;
        regularValidatorKeys.forEach(validatorKey => {
          validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
          validatorAllowedValues = validator.allowedValues;
          extensionKeys.forEach(extensionKey => {
            extension = validator[extensionKey](...extensionInputs[extensionKey].args);
            extensionAllowedValues = extension.allowedValues;
            extensionKeys.forEach(extraExtensionKey => {
              extension[extraExtensionKey](...extensionInputs[extraExtensionKey].args);
              expect(validator.allowedValues).toIsEqual(validatorAllowedValues);
              expect(extension.allowedValues).toIsEqual(extensionAllowedValues);
            });
          });
        });
      });
    });

    describe("rangeValues", () => {
      it("should return null for all validators that do not have ranged values", () => {
        validatorKeys.forEach(validatorKey => {
          if (isRangedValidatorNames[validatorKey] !== true) {
            expect(baseValidators[validatorKey](...validatorInputs[validatorKey].args).rangeValues).toIsEqual(null);
          }
        });
      });

      it("should return the range values for all validators that have them", () => {
        validatorKeys.forEach(validatorKey => {
          if (isRangedValidatorNames[validatorKey] === true) {
            const args = validatorInputs[validatorKey].args;
            const rangeValues = baseValidators[validatorKey](...args).rangeValues;
            expect(rangeValues).not.toIsEqual(null);
            if (validatorKey.indexOf("MinMax") !== -1) {
              expect(rangeValues.min).toIsEqual(args[0]);
              expect(rangeValues.max).toIsEqual(args[1]);
            } else if (validatorKey.indexOf("Min") !== -1) {
              expect(rangeValues.min).toIsEqual(args[0]);
            } else if (validatorKey.indexOf("Max") !== -1) {
              expect(rangeValues.max).toIsEqual(args[0]);
            } else {
              throw new Error("The tests expect all range validators to have Min or Max in their validatorName");
            }
          }
        });
      });
    });

    describe("isEnum", () => {
      it("should false for orEqual on a validator with no allowedValues", () => {
        expect(baseValidators.string().orEqual("hello").isEnum).toIsEqual(false);
      });

      it("should return true for orEqual on a validator with allowedValues", () => {
        expect(baseValidators.equal("hello").orEqual("there").isEnum).toIsEqual(true);
      });

      it("should return false for orOneOf on a validator with no allowedValues", () => {
        expect(baseValidators.string().orOneOf(["hello", "there"]).isEnum).toIsEqual(false);
      });

      it("should return true for orOneOf on a validator with allowedValues", () => {
        expect(baseValidators.oneOf(["why", "yes"]).orOneOf(["hello", "there"]).isEnum).toIsEqual(true);
      });

      it("should return false for .or with allowedValues on a validator with no allowedValues", () => {
        expect(baseValidators.string().or(baseValidators.oneOf(["hello", "there"])).isEnum).toIsEqual(false);
      });

      it("should return true for .or with allowedValues on a validator with no allowedValues", () => {
        expect(baseValidators.equal("why").or(baseValidators.oneOf(["hello", "there"])).isEnum).toIsEqual(true);
      });

      it("should return false for .or with no allowedValues on a validator with allowedValues", () => {
        expect(baseValidators.equal("hey").or(baseValidators.string()).isEnum).toIsEqual(false);
      });

      it("should return false for a .or with no allowedValues on a validator with no allowedValues", () => {
        expect(baseValidators.string().or(baseValidators.number()).isEnum).toIsEqual(false);
      });

      it("should not modify the original validator", () => {
        let validator, extension;
        let validatorWasEnum, extensionWasEnum;
        regularValidatorKeys.forEach(validatorKey => {
          validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
          validatorWasEnum = validator.isEnum;
          extensionKeys.forEach(extensionKey => {
            extension = validator[extensionKey](...extensionInputs[extensionKey].args);
            extensionWasEnum = extension.isEnum;
            extensionKeys.forEach(extraExtensionKey => {
              extension[extraExtensionKey](...extensionInputs[extraExtensionKey].args);
              expect(validator.isEnum).toIsEqual(validatorWasEnum);
              expect(extension.isEnum).toIsEqual(extensionWasEnum);
            });
          });
        });
      });
    });

    it("should support nested extensions", () => {
      const validator = baseValidators
        .equal("a")
        .appendMessage(" <a>")
        .orEqual("b")
        .appendMessage(" <b>")
        .orEqual("c")
        .appendMessage(" <c>");

      expect(validator("a")).toIsEqual(true);
      expect(validator("b")).toIsEqual(true);
      expect(validator("c")).toIsEqual(true);
      expect(validator("d")).toIsEqual(false);
      expect(validator.errorMessage).toIsEqual(
        'should be equal to "a" <a> or be equal to "b" <b> or be equal to "c" <c>'
      );
      expect(validator.getErrorMessage("d")).toIsEqual(
        'should be equal to "a" <a> or be equal to "b" <b> or be equal to "c" <c>: "d"'
      );
    });
  });

  describe("names", () => {
    describe("validator names", () => {
      it("should match the validator key for all validators", () => {
        let validator;
        validatorKeys.forEach(validatorKey => {
          validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
          expect(validator.validatorName).toIsEqual(validatorKey);
        });
      });

      it("should not be modified when extensions are used", () => {
        let validator;
        regularValidatorKeys.forEach(validatorKey => {
          validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
          extensionKeys.forEach(extensionKey => {
            const extension = validator[extensionKey](...extensionInputs[extensionKey].args);
            expect(extension.validatorName).toIsEqual(validatorKey);
          });
        });
      });

      it("should not modify the original validator", () => {
        let validator, extension, extraExtension;
        regularValidatorKeys.forEach(validatorKey => {
          validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
          extensionKeys.forEach(extensionKey => {
            extension = validator[extensionKey](...extensionInputs[extensionKey].args);
            extensionKeys.forEach(extraExtensionKey => {
              extraExtension = extension[extraExtensionKey](...extensionInputs[extraExtensionKey].args);
              expect(validator.validatorName).toIsEqual(validatorKey);
              expect(extension.validatorName).toIsEqual(validatorKey);
              expect(extraExtension.validatorName).toIsEqual(validatorKey);
            });
          });
        });
      });
    });

    describe("extension names", () => {
      it("should be null if no extension has been used", () => {
        let validator;
        regularValidatorKeys.forEach(validatorKey => {
          validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
          expect(validator.extensionNames).toIsEqual(null);
        });
      });

      it("should not modify the original validator", () => {
        let validator, extension, extraExtension;
        regularValidatorKeys.forEach(validatorKey => {
          validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
          extensionKeys.forEach(extensionKey => {
            extension = validator[extensionKey](...extensionInputs[extensionKey].args);
            extensionKeys.forEach(extraExtensionKey => {
              extraExtension = extension[extraExtensionKey](...extensionInputs[extraExtensionKey].args);
              expect(validator.extensionNames).toIsEqual(null);
              expect(extension.extensionNames).toIsEqual([extensionKey]);
              expect(extraExtension.extensionNames).toIsEqual([extensionKey, extraExtensionKey]);
            });
          });
        });
      });

      it("should contain the extension name if one extension is used", () => {
        let validator;
        regularValidatorKeys.forEach(validatorKey => {
          validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
          extensionKeys.forEach(extensionKey => {
            const extension = validator[extensionKey](...extensionInputs[extensionKey].args);
            expect(extension.extensionNames).toIsEqual([extensionKey]);
          });
        });
      });

      it("should contain as many extension names as were used", () => {
        let validator;
        regularValidatorKeys.forEach(validatorKey => {
          validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
          extensionKeys.forEach(extensionKey => {
            let extension = validator[extensionKey](...extensionInputs[extensionKey].args);
            extensionKeys.forEach(extraExtensionKey => {
              extension = extension[extraExtensionKey](...extensionInputs[extraExtensionKey].args);
            });
            expect(extension.extensionNames).toIsEqual([extensionKey].concat(extensionKeys));
          });
        });
      });
    });

    describe("custom names", () => {
      it("should be null if withCustomName has not been called", () => {
        let validator;
        validatorKeys.forEach(validatorKey => {
          validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
          expect(validator.customName).toIsEqual(null);
        });
      });

      it("should not modify the original validator", () => {
        let validatorA, validatorB, validatorC;
        validatorKeys.forEach(validatorKey => {
          validatorA = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
          validatorB = validatorA.withCustomName("a");
          validatorC = validatorB.withCustomName("b");
          expect(validatorA.customName).toIsEqual(null);
          expect(validatorB.customName).toIsEqual("a");
          expect(validatorC.customName).toIsEqual("b");
        });
      });

      it("should be settable for all validators", () => {
        let validator;
        validatorKeys.forEach(validatorKey => {
          validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
          expect(validator.withCustomName("custom" + validatorKey).customName).toIsEqual("custom" + validatorKey);
        });
      });

      it("should be settable for all extended validators", () => {
        let validator;
        regularValidatorKeys.forEach(validatorKey => {
          validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args);
          extensionKeys.forEach(extensionKey => {
            const extension = validator[extensionKey](...extensionInputs[extensionKey].args);
            expect(extension.withCustomName("custom" + validatorKey).customName).toIsEqual("custom" + validatorKey);
          });
        });
      });

      it("should not be modified when other extensions are used", () => {
        let validator;
        regularValidatorKeys.forEach(validatorKey => {
          validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args).withCustomName(
            "custom" + validatorKey
          );
          extensionKeys.forEach(extensionKey => {
            const extension = validator[extensionKey](...extensionInputs[extensionKey].args);
            expect(extension.customName).toIsEqual("custom" + validatorKey);
          });
        });
      });

      it("should allow the message to be changed after the custom name is set", () => {
        const theMessage = "a message";
        let validator;
        regularValidatorKeys.forEach(validatorKey => {
          validator = baseValidators[validatorKey](...validatorInputs[validatorKey].args)
            .withCustomName("custom" + validatorKey)
            .withMessage(theMessage);
          expect(validator.customName).toIsEqual("custom" + validatorKey);
          expect(validator.errorMessage).toIsEqual(theMessage);
          expect(validator.errorMessages).toIsEqual([theMessage]);
        });
      });
    });
  });
});
