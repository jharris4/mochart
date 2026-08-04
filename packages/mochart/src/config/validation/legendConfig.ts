import validators from './validators';
import { ALIGNS, AUTO, POSITIONS } from '../core/constants';

export default function getValidators() {
  return {
    visible: validators.boolean(),
    position: validators.oneOf(POSITIONS),
    truncationEnabled: validators.boolean(),
    truncationValue: validators.string(),
    alignedToAxes: validators.boolean(),
    align: validators.oneOf(ALIGNS),
    margin: validators.margin(),
    padding: validators.padding(),
    backgroundStyle: validators.style(),
    itemMargin: validators.margin(),
    itemPadding: validators.padding(),
    itemBackgroundStyle: validators.style(),
    itemTextStyle: validators.style(),
    showIconColors: validators.boolean(),
    showIconShapes: validators.boolean(),
    showIconPlaceholders: validators.boolean(),
    iconSize: validators.numberMin(0).orEqual(AUTO),
    iconSpacerSize: validators.numberMin(0),
    iconBorderSize: validators.numberMin(0),
    // svgColor, not color: the icons are svg, so 'currentColor' and 'none' are valid here.
    iconBorderColor: validators.svgColor(),
    iconBorderOpacity: validators.opacity(),
    iconFilteredColor: validators.svgColor(),
    iconUnfilteredColor: validators.svgColor(),
    showFilteringOnLabels: validators.boolean(),
    focusOnMouseOver: validators.boolean(),
    focusOnClick: validators.boolean(),
    filterOnClick: validators.boolean()
  };
}
