/** Shared label guards for the chart-shape helpers. */

/**
 * Category values must be unique — `getDataErrors` rejects duplicates, and the default chart
 * input then swaps in the empty error provider, blanking the whole chart.
 */
export function checkUniqueLabels(helperName: string, what: string, labels: readonly string[]): void {
  const duplicates = labels.filter((label, index) => labels.indexOf(label) !== index);
  if (duplicates.length > 0) {
    throw new Error(`${helperName}: ${what} must be unique, duplicates: ` + [...new Set(duplicates)].join(', '));
  }
}
