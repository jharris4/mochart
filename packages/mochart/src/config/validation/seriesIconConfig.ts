import validators from './validators';
import { AUTO } from '../core/constants';

// The SeriesIconConfig members, spread into the legend and tooltip validators.
export default function getValidators() {
  return {
    showIconColors: validators.boolean(),
    showIconShapes: validators.boolean(),
    showIconPlaceholders: validators.boolean(),
    iconSize: validators.numberMin(0).orEqual(AUTO),
    iconSpacerSize: validators.numberMin(0),
    iconBorderSize: validators.numberMin(0),
    // svgColor, not color / cssColor: the icons are svg (even inside the html tooltip), so 'currentColor' and 'none' are valid here.
    iconBorderColor: validators.svgColor(),
    iconBorderOpacity: validators.opacity(),
    iconFilteredColor: validators.svgColor(),
    iconUnfilteredColor: validators.svgColor()
  };
}
