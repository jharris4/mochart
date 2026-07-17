import { NONE } from '../config/core/constants';
import type { SeriesConfig } from '../types/config';

export const getSeriesTitle = ({ id, title }: SeriesConfig): string => title !== NONE ? title : `Series ${id}`;

export const labelSuffix = ": ";
export const noLabel = "";

export const getSeriesLabel = (seriesConfig: SeriesConfig, suffix = labelSuffix): string => {
  const { valueLabel, useTitleForValueLabel } = seriesConfig;
  const label = valueLabel !== NONE ? valueLabel : useTitleForValueLabel ? getSeriesTitle(seriesConfig) : noLabel;
  return label === noLabel ? label : label + suffix;
};
