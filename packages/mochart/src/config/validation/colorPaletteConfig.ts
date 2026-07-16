
import validators from './validators';

export default function getValidators() {
  return {
    series: validators.objectWith(['strokeColors', 'fillColors'], validators.arrayOf(validators.color(), false)),
    seriesFocused: validators.objectWith(['strokeColors', 'fillColors'], validators.arrayOf(validators.color(), false)),
    seriesDefocused: validators.objectWith(['strokeColors', 'fillColors'], validators.arrayOf(validators.color(), false)),
    marker: validators.objectWith(['strokeColors', 'fillColors'], validators.arrayOf(validators.color(), false)),
    markerFocused: validators.objectWith(['strokeColors', 'fillColors'], validators.arrayOf(validators.color(), false)),
    markerDefocused: validators.objectWith(['strokeColors', 'fillColors'], validators.arrayOf(validators.color(), false)),
    label: validators.objectWith(['strokeColors', 'fillColors'], validators.arrayOf(validators.color(), false)),
    labelFocused: validators.objectWith(['strokeColors', 'fillColors'], validators.arrayOf(validators.color(), false)),
    labelDefocused: validators.objectWith(['strokeColors', 'fillColors'], validators.arrayOf(validators.color(), false))
  };
}