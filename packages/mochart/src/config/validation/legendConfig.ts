import validators from './validators';
import getSeriesIconValidators from './seriesIconConfig';
import { ALIGNS, POSITIONS } from '../core/constants';

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
    ...getSeriesIconValidators(),
    showFilteringOnLabels: validators.boolean(),
    focusOnMouseOver: validators.boolean(),
    focusOnClick: validators.boolean(),
    filterOnClick: validators.boolean()
  };
}
