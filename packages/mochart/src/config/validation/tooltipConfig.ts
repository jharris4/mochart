import validators from './validators';

import { AUTO, NONE } from '../core/constants';

export default function getValidators() {
  return {
    visible: validators.boolean(),
    applyFocus: validators.boolean(),
    snapToCategory: validators.boolean(),
    mouseOver: validators.boolean(),
    closeOnClick: validators.boolean(),
    filterOnSeriesClick: validators.boolean(),
    focusOnCategoryClick: validators.boolean(),
    focusOnSeriesClick: validators.boolean(),
    focusOnCategoryMouseOver: validators.boolean(),
    focusOnSeriesMouseOver: validators.boolean(),
    showCategory: validators.boolean(),
    showControls: validators.boolean(),
    keepInside: validators.boolean(),
    minWidth: validators.numberMin(0),
    padding: validators.numberMin(0),
    linePadding: validators.numberMin(0),
    alignValues: validators.boolean(),
    // cssStyle / cssColor, not style / color: the tooltip is html, so 'none' is not a valid color here.
    backgroundStyle: validators.cssStyle(),
    borderRadius: validators.numberMin(0),
    dropShadowColor: validators.cssColor(),
    dropShadowOffsetX: validators.numberMin(0),
    dropShadowOffsetY: validators.numberMin(0),
    dropShadowBlurRadius: validators.numberMin(0),
    showIconColors: validators.boolean(),
    showIconShapes: validators.boolean(),
    showIconPlaceholders: validators.boolean(),
    iconSize: validators.numberMin(0).orEqual(AUTO),
    iconSpacerSize: validators.numberMin(0),
    iconBorderSize: validators.numberMin(0),
    // svgColor, not the cssColor above: the series icons are svg even inside the html tooltip.
    iconBorderColor: validators.svgColor(),
    iconBorderOpacity: validators.opacity(),
    iconFilteredColor: validators.svgColor(),
    iconUnfilteredColor: validators.svgColor(),
    showFilteringOnLabels: validators.boolean(),
    adjustForFiltering: validators.boolean(),
    adjustSizeForFiltering: validators.boolean(),
    hideFiltered: validators.boolean(),
    showMissingValues: validators.boolean(),
    missingValueText: validators.string(),
    filteredValueText: validators.string().orEqual(NONE),
    filteredValueCharacter: validators.stringWithLength(1).orEqual(NONE),
    rangeValueText: validators.string()
  };
}
