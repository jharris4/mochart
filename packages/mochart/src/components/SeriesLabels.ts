import { Renderer, svgEl, textEl } from '../render';

import { getSeriesLabelFormat } from '../utils/ValueFormat';
import { mochartCssClasses } from '../utils/ChartDom';
import { NONE, AUTO, LABEL_POSITION_CENTER, LABEL_POSITION_INSIDE } from '../config/core/constants';
import { translate } from '../utils/utils';
import { getSeriesLabelFillColor, getSeriesLabelStrokeColor } from '../utils/SeriesColors';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import { getFocusValue, getGroupFocusPercentage } from '../utils/FocusValue';
import type { El, ElListAdapter, TextEl } from '../render';
import type { ColorPaletteConfig, SeriesConfig } from '../types/config';
import type { FocusData } from '../types/animation';
import type { AxisScale, NullableDomain, SeriesPositionData, SeriesValueObject } from '../types/data';
import type { LabelPosition } from '../config/core/constants';

const getLabelPosition = (isAboveBase: boolean, hasBase: boolean, seriesConfig: SeriesConfig): LabelPosition => {
  let { labelPosition } = seriesConfig;
  if (hasBase) {
    const { labelAboveBasePosition, labelBelowBasePosition } = seriesConfig;
    if (isAboveBase && labelAboveBasePosition !== AUTO) {
      labelPosition = labelAboveBasePosition;
    }
    else if (!isAboveBase && labelBelowBasePosition !== AUTO) {
      labelPosition = labelBelowBasePosition;
    }
  }
  return labelPosition;
};

const getTextAnchor = (inverted: boolean, isAboveBase: boolean, position: LabelPosition): 'middle' | 'start' | 'end' => {
  return (!inverted || position === LABEL_POSITION_CENTER) ? 'middle' :
    (position === LABEL_POSITION_INSIDE ? (isAboveBase ? 'end' : 'start') : (isAboveBase ? 'start' : 'end'));
};

const getDY = (inverted: boolean, isAboveBase: boolean, position: LabelPosition): string => {
  return (inverted || position === LABEL_POSITION_CENTER) ? '0.35em' :
    (position === LABEL_POSITION_INSIDE ? (isAboveBase ? '1.35em' : '-0.65em') : (isAboveBase ? '-0.65em' : '1.35em'));
};

interface SeriesLabelData { key: string; attrs: Record<string, unknown>; text: string | number }
interface SeriesLabelHandle { root: El; value: TextEl }

const labelAdapter: ElListAdapter<SeriesLabelData, SeriesLabelHandle> = {
  key: (label: SeriesLabelData) => label.key,
  create: () => {
    const root = svgEl('text');
    const value = textEl();
    root.append(value);
    return { root, value };
  },
  update: (handle: SeriesLabelHandle, label: SeriesLabelData) => {
    handle.root.set(label.attrs);
    handle.value.set(label.text);
  }
};

interface SeriesLabelsProps {
  colorPaletteConfig: ColorPaletteConfig;
  seriesConfig: SeriesConfig;
  seriesIndex: number;
  rawSeriesAxisDomain: NullableDomain;
  seriesAxisScale: AxisScale;
  seriesPositionData: SeriesPositionData;
  filteredValues: SeriesValueObject;
  inverted: boolean;
  focusData: FocusData;
  onGroupEnter: (groupIndex: number) => void;
  onGroupLeave: (groupIndex: number) => void;
  onGroupClick: (groupIndex: number) => void;
}

export default class SeriesLabels extends Renderer<SeriesLabelsProps> {
  root = svgEl('g');
  labels = this.elList<SeriesLabelData, SeriesLabelHandle>(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { colorPaletteConfig, seriesConfig, seriesIndex, rawSeriesAxisDomain, seriesAxisScale, seriesPositionData,
      filteredValues, inverted, focusData, onGroupEnter, onGroupLeave, onGroupClick } = this.props;
    if (seriesConfig.labelProperty !== NONE) {
      const { seriesAxisConfig, skipMissing } = seriesConfig;
      const hasBase = seriesAxisConfig.base !== NONE;
      const domainMin = rawSeriesAxisDomain[0];
      const domainMax = rawSeriesAxisDomain[1];

      if (domainMin !== null && domainMax !== null) {
        const domainExtent = domainMax - domainMin;
        const base = hasBase ? Math.min(Math.max(seriesAxisConfig.base!, domainMin), domainMax) : domainMin;
        let labels: SeriesLabelData[] = [];
        const { max: maxValuesNullable, min: minValues, label: labelValuesNullable } = filteredValues;
        const maxValues = maxValuesNullable!;
        const labelValues = labelValuesNullable!;
        let labelStrokeColor, labelFillColor, labelStrokeWidth, labelStrokeOpacity, labelFillOpacity;

        let withinPercentages = (_seriesValue: number, _minSeriesValue?: number | null) => {
          return true;
        };

        const { labelOffset } = seriesConfig;

        let getOffset = (_aboveBase: boolean) => {
          return labelOffset;
        };

        if (hasBase) {
          const aboveBaseLabelOffset = seriesConfig.labelAboveBaseOffset === AUTO ? labelOffset : seriesConfig.labelAboveBaseOffset;
          const belowBaseLabelOffset = seriesConfig.labelBelowBaseOffset === AUTO ? -1 * labelOffset : seriesConfig.labelBelowBaseOffset;

          getOffset = (aboveBase: boolean) => {
            return aboveBase ? aboveBaseLabelOffset : belowBaseLabelOffset;
          };
        }

        const {
          labelMinPositionPercent, labelMaxPositionPercent, labelAboveBaseMinPositionPercent,
          labelAboveBaseMaxPositionPercent, labelBelowBaseMinPositionPercent, labelBelowBaseMaxPositionPercent } = seriesConfig;

        if ((labelMinPositionPercent !== NONE || labelMaxPositionPercent !== NONE) || (hasBase &&
            (labelAboveBaseMinPositionPercent !== NONE || labelAboveBaseMaxPositionPercent !== NONE ||
             labelBelowBaseMinPositionPercent !== NONE || labelBelowBaseMaxPositionPercent !== NONE)
          )) {

          let minValue: number | null = null;
          let maxValue: number | null = null;
          let aboveBaseMinValue: number | null = null;
          let aboveBaseMaxValue: number | null = null;
          let belowBaseMinValue: number | null = null;
          let belowBaseMaxValue: number | null = null;

          if (hasBase) {
            if (labelAboveBaseMinPositionPercent !== NONE && !(labelAboveBaseMinPositionPercent === AUTO && labelMinPositionPercent === NONE)) {
              const percent = (labelAboveBaseMinPositionPercent === AUTO ? labelMinPositionPercent : labelAboveBaseMinPositionPercent)!;
              aboveBaseMinValue = domainExtent === 0 ? (domainMin + 1) : (base + percent * domainExtent);
            }
            if (labelAboveBaseMaxPositionPercent !== NONE && !(labelAboveBaseMaxPositionPercent === AUTO && labelMaxPositionPercent === NONE)) {
              const percent = (labelAboveBaseMaxPositionPercent === AUTO ? labelMaxPositionPercent : labelAboveBaseMaxPositionPercent)!;
              aboveBaseMaxValue = domainExtent === 0 ? (domainMax - 1) : (domainMax - percent * domainExtent);
            }
            if (labelBelowBaseMinPositionPercent !== NONE && !(labelBelowBaseMinPositionPercent === AUTO && labelMinPositionPercent === NONE)) {
              const percent = (labelBelowBaseMinPositionPercent === AUTO ? labelMinPositionPercent : labelBelowBaseMinPositionPercent)!;
              belowBaseMinValue = domainExtent === 0 ? (domainMin + 1) : (base - percent * domainExtent);
            }
            if (labelBelowBaseMaxPositionPercent !== NONE && !(labelBelowBaseMaxPositionPercent === AUTO && labelMaxPositionPercent === NONE)) {
              const percent = (labelBelowBaseMaxPositionPercent === AUTO ? labelMaxPositionPercent : labelBelowBaseMaxPositionPercent)!;
              belowBaseMaxValue = domainExtent === 0 ? (domainMax - 1) : (domainMin + percent * domainExtent);
            }
            withinPercentages = (seriesValue: number) => {
              if (seriesValue >= base) {
                return (aboveBaseMinValue === null || seriesValue >= aboveBaseMinValue) && (aboveBaseMaxValue === null || seriesValue <= aboveBaseMaxValue);
              }
              else {
                return (belowBaseMinValue === null || seriesValue <= belowBaseMinValue) && (belowBaseMaxValue === null || seriesValue >= belowBaseMaxValue);
              }
            };
          }
          else {
            if (labelMinPositionPercent !== NONE) {
              minValue = domainExtent === 0 ? domainMin + 1 : domainMin + labelMinPositionPercent * domainExtent;
            }
            if (labelMaxPositionPercent !== NONE) {
              maxValue = domainExtent === 0 ? domainMax - 1 : domainMax - labelMaxPositionPercent * domainExtent;
            }

            withinPercentages = (seriesValue: number) => {
              return (minValue === null || seriesValue >= minValue) && (maxValue === null || seriesValue <= maxValue);
            };
          }
        }
        if (seriesConfig.labelMinRangePercent !== NONE) {
          const oldWithinPercentages = withinPercentages;
          const hasStack = seriesConfig.stack !== NONE;
          let minAbsoluteValue = domainExtent === 0 ? domainMin + 1 : seriesConfig.labelMinRangePercent * domainExtent;

          if (hasStack) {
            if (hasBase) {
              withinPercentages = (maxSeriesValue: number, minSeriesValue?: number | null) => {
                let valueMin = base;
                if (minSeriesValue !== null && minSeriesValue !== undefined) {
                  valueMin = minSeriesValue;
                }
                return oldWithinPercentages(maxSeriesValue) && (maxSeriesValue - valueMin) >= minAbsoluteValue;
              };
            }
            else {
              withinPercentages = (maxSeriesValue: number, minSeriesValue?: number | null) => {
                let valueMin = domainMin;
                if (minSeriesValue !== null && minSeriesValue !== undefined) {
                  valueMin = minSeriesValue;
                }
                return oldWithinPercentages(maxSeriesValue) && (maxSeriesValue - valueMin) >= minAbsoluteValue;
              };
            }
          }
          else {
            withinPercentages = (maxSeriesValue: number, minSeriesValue?: number | null) => {
              let valueMin = maxSeriesValue;
              if (minSeriesValue !== undefined) {
                // Preserve the original numeric coercion: a null minimum
                // represents the zero baseline for an unstacked value.
                valueMin = minSeriesValue ?? 0;
              }
              return oldWithinPercentages(maxSeriesValue) && Math.abs(maxSeriesValue - valueMin) >= minAbsoluteValue;
            };
          }
        }

        const valueFormat = getSeriesLabelFormat(seriesConfig, seriesAxisConfig, seriesAxisScale);

        const { groupFocusPercentages, seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
        const seriesFocusPercentage = getSeriesFocusPercentage(seriesConfig, seriesAxisFocusPercentages, seriesFocusPercentages);

        let focusPercentage, aboveBase, textAnchor, dy, seriesPosition, x, y;
        const position = getLabelPosition(inverted, hasBase, seriesConfig);
        const aboveBaseTextAnchor = getTextAnchor(inverted, true, position);
        const belowBaseTextAnchor = getTextAnchor(inverted, false, position);
        const aboveBaseDY = getDY(inverted, true, seriesConfig.labelPosition);
        const belowBaseDY = getDY(inverted, false, seriesConfig.labelPosition);

        const { length, getDefined, getSeriesPosition, getGroupPosition, skipGroupIndexMap } = seriesPositionData;

        for (let i = 0; i < length; i++) {
          let skipI = skipMissing ? skipGroupIndexMap[i] : i;
          if (getDefined(null, i) && labelValues[skipI] !== undefined && withinPercentages(maxValues[skipI]!, minValues ? minValues[skipI] : null)) {
            aboveBase = !hasBase || maxValues[skipI]! >= base;
            textAnchor = aboveBase ? aboveBaseTextAnchor : belowBaseTextAnchor;
            dy = aboveBase ? aboveBaseDY : belowBaseDY;

            focusPercentage = getGroupFocusPercentage(groupFocusPercentages[skipI], seriesFocusPercentage);
            labelFillColor = getSeriesLabelFillColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, null, i);
            labelStrokeColor = getSeriesLabelStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, null, i);
            labelStrokeWidth = getFocusValue(focusPercentage, seriesConfig.labelStrokeWidth, seriesConfig.labelFocusedStrokeWidth, seriesConfig.labelDefocusedStrokeWidth);
            labelStrokeOpacity = getFocusValue(focusPercentage, seriesConfig.labelStrokeOpacity, seriesConfig.labelFocusedStrokeOpacity, seriesConfig.labelDefocusedStrokeOpacity);
            labelFillOpacity = getFocusValue(focusPercentage, seriesConfig.labelFillOpacity, seriesConfig.labelFocusedFillOpacity, seriesConfig.labelDefocusedFillOpacity);
            seriesPosition = getSeriesPosition(null, i)! + getOffset(aboveBase);
            x = inverted ? seriesPosition : getGroupPosition(null, i)!;
            y = inverted ? getGroupPosition(null, i)! : seriesPosition;
            labels.push({
              key: 'label-' + i,
              attrs: { className: mochartCssClasses['seriesLabel'] + i, transform: translate(x, y),
                textAnchor, dy, stroke: labelStrokeColor, fill: labelFillColor, fillOpacity: labelFillOpacity, strokeOpacity: labelStrokeOpacity,
                strokeWidth: labelStrokeWidth, onMouseEnter: () => onGroupEnter(i), onMouseLeave: () => onGroupLeave(i), onClick: () => onGroupClick(i) },
              text: String(valueFormat(labelValues[skipI]!))
            });
          }
        }
        this.setPresent(true);
        this.root.set({ className: mochartCssClasses['seriesLabels'] });
        this.labels.sync(labels, labelAdapter);
        return;
      }
    }
    this.setPresent(false);
  }
}
