import validators from './validators';


export default function getValidators() {
  return {
    visible: validators.boolean(),
    applyFocus: validators.boolean(),
    showCategory: validators.boolean(),
    showSeries: validators.boolean(),
    categoryLineStyle: validators.strokeStyle(),
    seriesLineStyle: validators.strokeStyle(),
    showBehindTooltip: validators.boolean()
  };
}