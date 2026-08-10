import validators from './validators';
import { AUTO } from '../core/constants';

export default function getValidators() {
  return {
    inverted: validators.boolean(),
    margin: validators.margin(),
    padding: validators.padding(),
    clipOverflow: validators.margin(),

    showClipIndicator: validators.boolean(),
    clipIndicatorSize: validators.numberMin(0).orEqual(AUTO),
    clipIndicatorPadding: validators.numberMin(0),
    clipIndicatorStyle: validators.style(),
    clipIndicatorFront: validators.boolean(),
    backgroundStyle: validators.style()
  };
}