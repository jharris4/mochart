export function getSeriesFocusPercentage(seriesConfig, seriesAxisFocusPercentages, seriesFocusPercentages) {
  const { id, axis, useAxisFocus } = seriesConfig;
  if (seriesAxisFocusPercentages[axis] !== void 0 && seriesFocusPercentages[id] !== void 0) {
    const seriesFocusPercentage = seriesFocusPercentages[id];
    return (useAxisFocus && seriesAxisFocusPercentages[axis] !== null) ? Math.max(seriesAxisFocusPercentages[axis], seriesFocusPercentage) : seriesFocusPercentage;
  }
  else {
    return null;
  }
}