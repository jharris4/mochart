import validators from './validators';
import { POSITIONS, ALIGNS } from '../core/constants';

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
    showIconColors: validators.boolean(),
    showIconShapes: validators.boolean(),
    showIconPlaceholders: validators.boolean(),
    iconSize: validators.numberMin(0),
    iconSpacerSize: validators.numberMin(0),
    iconBorderSize: validators.numberMin(0),
    iconBorderColor: validators.color(),
    iconSuppressedColor: validators.color(),
    iconUnsuppressedColor: validators.color(),
    focusOnMouseOver: validators.boolean(),
    focusOnClick: validators.boolean(),
    filterOnClick: validators.boolean()
  };
}