import validators from './validators';
import { AUTO } from '../core/constants';

// The SeriesIconConfig members, the `icon` group of the legend and tooltip validators.
export default function getValidators() {
  return {
    showColors: validators.boolean(),
    showShapes: validators.boolean(),
    showPlaceholders: validators.boolean(),
    size: validators.numberMin(0).orEqual(AUTO),
    spacerSize: validators.numberMin(0),
    borderSize: validators.numberMin(0),
    // svgColor, not color / cssColor: the icons are svg (even inside the html tooltip), so 'currentColor' and 'none' are valid here.
    borderColor: validators.svgColor(),
    borderOpacity: validators.opacity(),
    filteredColor: validators.svgColor(),
    unfilteredColor: validators.svgColor()
  };
}
