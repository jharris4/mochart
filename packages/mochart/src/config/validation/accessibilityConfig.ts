import validators from './validators';

export default function getValidators() {
  return {
    enabled: validators.boolean(),
    hidden: validators.boolean(),
    respectReducedMotion: validators.boolean(),
    chartLabel: validators.string(),
    chartRoleDescription: validators.string(),
    plotLabel: validators.string(),
    legendLabel: validators.string(),
    tooltipPreviousLabel: validators.string(),
    tooltipNextLabel: validators.string()
  };
}
