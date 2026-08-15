import validators from './validators';
import getSeriesIconValidators from './seriesIconConfig';

import { NONE } from '../core/constants';

export default function getValidators() {
  return {
    visible: validators.boolean(),
    applyFocus: validators.boolean(),
    snapToCategory: validators.boolean(),
    followPointer: validators.boolean(),
    closeOnClick: validators.boolean(),
    filterSeriesOnClick: validators.boolean(),
    focusCategoryOnClick: validators.boolean(),
    focusSeriesOnClick: validators.boolean(),
    focusCategoryOnMouseOver: validators.boolean(),
    focusSeriesOnMouseOver: validators.boolean(),
    showCategory: validators.boolean(),
    showControls: validators.boolean(),
    filterModeText: validators.string(),
    focusModeText: validators.string(),
    keepInside: validators.boolean(),
    padding: validators.padding(),
    linePadding: validators.numberMin(0),
    rightAlignValues: validators.boolean(),
    // cssStyle / cssColor, not style / color: the tooltip is html, so 'none' is not a valid color here.
    backgroundStyle: validators.cssStyle(),
    borderRadius: validators.numberMin(0),
    dropShadowColor: validators.cssColor(),
    // negative offsets cast the css box-shadow up/left; only the blur radius must stay >= 0
    dropShadowOffsetX: validators.number(),
    dropShadowOffsetY: validators.number(),
    dropShadowBlurRadius: validators.numberMin(0),
    ...getSeriesIconValidators(),
    showFilteringOnLabels: validators.boolean(),
    adjustForFiltering: validators.boolean(),
    adjustSizeForFiltering: validators.boolean(),
    hideFiltered: validators.boolean(),
    showMissingValues: validators.boolean(),
    missingValueText: validators.string(),
    filteredValueText: validators.string().orEqual(NONE),
    filteredValueCharacter: validators.stringWithLength(1).orEqual(NONE),
    rangeValueSeparator: validators.string()
  };
}
