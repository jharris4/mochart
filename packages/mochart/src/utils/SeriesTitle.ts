import { NONE } from '../config/core/constants';

export const getSeriesTitle = ({ id, title }) => title !== NONE ? title : `Series ${id}`;

export const labelSuffix = ": ";
export const noLabel = "";

export const getSeriesLabel = (seriesConfig, suffix = labelSuffix) => {
  const { valueLabel, useTitleForValueLabel } = seriesConfig;
  const label = valueLabel !== NONE ? valueLabel : useTitleForValueLabel ? getSeriesTitle(seriesConfig) : noLabel;
  return label === noLabel ? label : label + suffix;
};