import validators from './validators';

import { NONE, POSITIONS, ALIGNS, VERTICAL_ALIGNS } from '../core/constants';

export default function getValidators() {
  return {
    title: validators.string().orEqual(NONE),
    position: validators.oneOf(POSITIONS),
    titlePrefix: validators.string().orEqual(NONE),
    titleSuffix: validators.string().orEqual(NONE),
    link: validators.string().orEqual(NONE),
    linkDisabled: validators.boolean(),
    truncationEnabled: validators.boolean(),
    truncationValue: validators.string(),
    alignedToAxes: validators.boolean(),
    align: validators.oneOf(ALIGNS),
    verticalAlign: validators.oneOf(VERTICAL_ALIGNS),
    verticalExpand: validators.boolean(),
    margin: validators.margin(),
    padding: validators.padding(),
    textMargin: validators.margin(),
    textPadding: validators.padding(),
    prefixMargin: validators.margin(),
    prefixPadding: validators.padding(),
    suffixMargin: validators.margin(),
    suffixPadding: validators.padding(),
    backgroundStyle: validators.style(),
    titleBackgroundStyle: validators.style(),
    titleTextStyle: validators.style(),
    prefixBackgroundStyle: validators.style(),
    prefixTextStyle: validators.style(),
    suffixBackgroundStyle: validators.style(),
    suffixTextStyle: validators.style()
  };
}