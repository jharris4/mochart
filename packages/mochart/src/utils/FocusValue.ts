export function getFocusValue(focusPercentage, normalValue, focusedValue, defocusedValue) {
  // TODO - this assumes that focusedValue >= normalValue >= defocusedValue. This should be validated or improved...
  if (focusPercentage === null || focusPercentage === 0) {
    return normalValue;
  }
  else if (focusPercentage < 0) {
    return normalValue + focusPercentage * (normalValue - defocusedValue);
  }
  else if (focusPercentage > 0) {
    return normalValue + focusPercentage * (focusedValue - normalValue);
  }
}

export function getGroupFocusPercentage(groupFocusPercentage, seriesFocusPercentage) {
  return getCombinedFocusPercentage(groupFocusPercentage, seriesFocusPercentage);
}

function getCombinedFocusPercentage(percentageA, percentageB) {
  if (percentageA === null && percentageB === null) {
    return null;
  }
  else if (percentageA === null || percentageA === 0) {
    return percentageB;
  }
  else if (percentageB === null || percentageB === 0) {
    return percentageA;
  }
  else if (percentageA < 0 && percentageB < 0) {
    return Math.min(percentageA, percentageB);
  }
  else {
    return Math.max(percentageA, percentageB);
  }
}

export function getAggregateSeriesFocusPercentage(seriesConfigs, seriesFocusPercentages) {
  let maxPercentage = null;
  let seriesFocusPercentage;
  for (let seriesConfig of seriesConfigs) {
    seriesFocusPercentage = seriesFocusPercentages[seriesConfig.id];
    if (seriesFocusPercentage !== null) {
      if (maxPercentage === null || seriesFocusPercentage > maxPercentage) {
        maxPercentage = seriesFocusPercentage;
      }
    }
  }
  return maxPercentage;
}

export function getFocusedDefocused(focusPercentage) {
  return {
    focused: focusPercentage > 0,
    defocused: focusPercentage < 0
  };
}

export function getFocusPercentageColor(focusPercentage, normalColor, focusedColor, defocusedColor) {
  const { focused, defocused } = getFocusedDefocused(focusPercentage);
  if (focused) {
    return focusedColor;
  }
  else if (defocused) {
    return defocusedColor;
  }
  else {
    return normalColor;
  }
}

export function getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, normalColor, focusedColor, defocusedColor) {
  let color = normalColor;
  if (axisFocusPercentage !== void 0 && seriesFocusPercentage !== void 0) {
    if (axisFocusPercentage !== null) {
      color = getFocusPercentageColor(axisFocusPercentage, normalColor, focusedColor, defocusedColor);
    }
    else if (useSeriesFocus ) {
      color = getFocusPercentageColor(seriesFocusPercentage, normalColor, focusedColor, defocusedColor);
    }
  }
  return color;
}

export function getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, normalOpacity, focusedOpacity, defocusedOpacity) {
  let opacity = normalOpacity;
  if (axisFocusPercentage !== void 0 && seriesFocusPercentage !== void 0 && !(axisFocusPercentage === null && seriesFocusPercentage === null)) {
    const percentage = useSeriesFocus ? getCombinedFocusPercentage(axisFocusPercentage, seriesFocusPercentage) : axisFocusPercentage;
    opacity = getFocusValue(percentage, normalOpacity, focusedOpacity, defocusedOpacity);
  }
  return opacity;
}