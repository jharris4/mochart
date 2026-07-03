export const idAccessor = ({ id }) => id;

export function arrayToMap(theArray, keyAccessor, valueFormatter = element => element) {
  let map = {};
  for (let element of theArray) {
    map[keyAccessor(element)] = valueFormatter(element);
  }
  return map;
}

export function mapMap(map, mapFunction) {
  let mapKeys = Object.keys(map);
  let newMap = {};
  for (let mapKey of mapKeys) {
    newMap[mapKey] = mapFunction(map[mapKey]);
  }
  return newMap;
}

export function onClickDisabled(e) {
  e.preventDefault();
}

export function translate(x, y) {
  return 'translate(' + x + ',' + y + ')';
}

export function rotate(a) {
  return 'rotate(' + a + ')';
}

export function translateRotate(x, y, a = 0) {
  return translate(x, y) + (a === 0 ? '' : ' ' + rotate(a));
}

export function translateObject({ x, y }) {
  return translate(x, y);
}

export const textDY = '0.35em'; // more or less centers the text vertically http://stackoverflow.com/questions/12250403/vertical-alignment-of-text-element-in-svg

export function centerTextY(textBounds) {
  const dy = textDY;
  const { x = 0, y = 0, height } = textBounds;
  const transform = translate(x, Math.floor(y + height / 2.0));
  return {
    dy,
    transform
  };
}

export function createArrayFilledWithUndefined(count) {
  let i, theArray = [];
  for (i=0; i<count; i++) {
    theArray.push(void 0);
  }
  return theArray;
}

export function createArrayFilledWithZero(count) {
  let i, theArray = [];
  for (i=0; i<count; i++) {
    theArray.push(0);
  }
  return theArray;
}

export function createArrayWithValueIfNotUndefined(source, value) {
  let i, theArray = [];
  let count = source.length;
  for (i=0; i<count; i++) {
    if (source[i] !== void 0) {
      theArray.push(value);
    }
    else {
      theArray.push(void 0);
    }
  }
  return theArray;
}

export function copyArrayWithValueIfNotUndefined(source, otherSource) {
  let i, theArray = [];
  let count = source.length;
  for (i=0; i<count; i++) {
    if (otherSource[i] === void 0) {
      theArray.push(void 0);
    }
    else {
      theArray.push(source[i]);
    }
  }
  return theArray;
}

export function replaceArrayUndefinedWithValue(array, value) {
  let i, count = array.length;
  for (i=0; i<count; i++) {
    if (array[i] === void 0) {
      array[i] = value;
    }
  }
}

export function copyWithValueOnlyIfOtherUndefined(source, otherSource, value) {
  let i, found = -1;
  let count = source.length;
  for (i=0; i<count; i++) {
    if (otherSource[i] === void 0) {
      found = i;
      break;
    }
  }
  if (found >= 0) {
    let copy = source.slice();
    for (i=found; i<count; i++) {
      if (otherSource[i] === void 0) {
        copy[i] = value;
      }
    }
    return copy;
  }
  else {
    return source;
  }
}

export function areMapsEqual(mapA, mapB) {
  let keys = Object.keys(mapA);
  for (let key of keys) {
    if(mapA[key] !== mapB[key]) {
      return false;
    }
  }
  return true;
}

export function areArraysAndEqual(oldValue, newValue) {
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    if (oldValue.length === newValue.length) {
      let count = oldValue.length;
      for (let i=0; i<count; i++) {
        if (oldValue[i] !== newValue[i]) {
          return false;
        }
      }
      return true;
    }
    else {
      return false;
    }
  }
  else {
    return false;
  }
}

export function getValuesAtIndices(source, indices) {
  let values = [];
  let i, count = indices.length;
  for (i=0; i<count; i++) {
    values.push(source[indices[i]]);
  }
  return values;
}

export function setArrayValuesIfOneIsUndefined(array, otherArray, value) {
  let i, count = array.length;
  for (i=0; i<count; i++) {
    if (array[i] !== otherArray[i]) {
      if (array[i] === void 0) {
        array[i] = value;
      }
      else if (otherArray[i] === void 0) {
        otherArray[i] = value;
      }
    }
  }
}

export function setArrayValuesFromSourcesIfOneIsUndefined(array, otherArray, sourceArray, otherSourceArray) {
  let i, count = array.length;
  for (i=0; i<count; i++) {
    if (array[i] !== otherArray[i]) {
      if (array[i] === void 0) {
        array[i] = sourceArray[i];
      }
      else if (otherArray[i] === void 0) {
        otherArray[i] = otherSourceArray[i];
      }
    }
  }
}

export function setArrayValuesForRange(array, min, max, value) {
  let i;
  for (i=min; i<max; i++) {
    array[i] = value;
  }
}

export function hasUndefinedForRange(array, min, max) {
  let i;
  for (i=min; i<max; i++) {
    if (array[i] === void 0) {
      return true;
    }
  }
  return false;
}

export function getMaxAbsoluteValue(values) {
  let max = 0;
  if (values !== null) {
    let count = values.length;
    let i, temp;
    for (i=0; i<count; i++) {
      temp = values[i];
      if (temp && Math.abs(temp) > max) {
        max = Math.abs(temp);
      }
    }
  }
  return max;
}

export function getArrayDeltas(array, otherArray) {
  let count = array.length;
  let deltas = [];
  for (let i=0; i<count; i++) {
    if (otherArray[i] !== void 0) { // if one is undefined, both should be undefined
      deltas.push(otherArray[i] - array[i]);
    }
    else {
      deltas.push(0);
    }
  }
  return deltas;
}