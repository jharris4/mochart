import { Renderer, svgEl, textEl } from '../render';

import { getSeriesLabelFormat } from '../utils/ValueFormat';
import { mochartCssClasses } from '../utils/ChartDom';
import { NONE, AUTO, LABEL_POSITION_CENTER, LABEL_POSITION_INSIDE } from '../config/core/constants';
import { translate, isMissingValue } from '../utils/utils';
import { getSeriesLabelFillColor, getSeriesLabelStrokeColor } from '../utils/SeriesColors';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import { getFocusStyle, getCategoryFocusPercentage } from '../utils/FocusValue';
import type { El, ElListAdapter, TextEl } from '../render';
import type { ColorPaletteConfig } from '../types/config';
import type { EnhancedSeriesConfig } from '../types/enhanced';
import type { FocusData } from '../types/animation';
import type { AxisScale, NullableDomain, SeriesPositionData, SeriesValueObject } from '../types/data';
import type { LabelPosition } from '../config/core/constants';

const getLabelPosition = (isAboveBase: boolean, hasBase: boolean, seriesConfig: EnhancedSeriesConfig): LabelPosition => {
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
  seriesConfig: EnhancedSeriesConfig;
  seriesIndex: number;
  rawValueAxisDomain: NullableDomain;
  valueAxisScale: AxisScale;
  seriesPositionData: SeriesPositionData;
  filteredValues: SeriesValueObject;
  inverted: boolean;
  focusData: FocusData;
  accessibility: boolean;
  onCategoryEnter: (categoryIndex: number) => void;
  onCategoryLeave: (categoryIndex: number) => void;
  onCategoryClick: (categoryIndex: number, event: Event) => void;
}

export default class SeriesLabels extends Renderer<SeriesLabelsProps> {
  root = svgEl('g');
  labels = this.elList<SeriesLabelData, SeriesLabelHandle>(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { colorPaletteConfig, seriesConfig, seriesIndex, rawValueAxisDomain, valueAxisScale, seriesPositionData,
      filteredValues, inverted, focusData, accessibility, onCategoryEnter, onCategoryLeave, onCategoryClick } = this.props;
    if (seriesConfig.labelProperty !== NONE) {
      const { valueAxisConfig } = seriesConfig;
      const hasBase = valueAxisConfig.base !== NONE;
      const domainMin = rawValueAxisDomain[0];
      const domainMax = rawValueAxisDomain[1];

      if (domainMin !== null && domainMax !== null) {
        const domainExtent = domainMax - domainMin;
        const base = hasBase ? Math.min(Math.max(valueAxisConfig.base!, domainMin), domainMax) : domainMin;
        const labels: SeriesLabelData[] = [];
        const { max: maxValuesNullable, min: minValues, label: labelValuesNullable } = filteredValues;
        const maxValues = maxValuesNullable!;
        const labelValues = labelValuesNullable!;
        let labelStrokeColor, labelFillColor;

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
          labelMinPositionFraction, labelMaxPositionFraction, labelAboveBaseMinPositionFraction,
          labelAboveBaseMaxPositionFraction, labelBelowBaseMinPositionFraction, labelBelowBaseMaxPositionFraction } = seriesConfig;

        if ((labelMinPositionFraction !== NONE || labelMaxPositionFraction !== NONE) || (hasBase &&
            (labelAboveBaseMinPositionFraction !== NONE || labelAboveBaseMaxPositionFraction !== NONE ||
             labelBelowBaseMinPositionFraction !== NONE || labelBelowBaseMaxPositionFraction !== NONE)
          )) {

          let minValue: number | null = null;
          let maxValue: number | null = null;
          let aboveBaseMinValue: number | null = null;
          let aboveBaseMaxValue: number | null = null;
          let belowBaseMinValue: number | null = null;
          let belowBaseMaxValue: number | null = null;

          if (hasBase) {
            if (labelAboveBaseMinPositionFraction !== NONE && !(labelAboveBaseMinPositionFraction === AUTO && labelMinPositionFraction === NONE)) {
              const percent = (labelAboveBaseMinPositionFraction === AUTO ? labelMinPositionFraction : labelAboveBaseMinPositionFraction)!;
              aboveBaseMinValue = domainExtent === 0 ? (domainMin + 1) : (base + percent * domainExtent);
            }
            if (labelAboveBaseMaxPositionFraction !== NONE && !(labelAboveBaseMaxPositionFraction === AUTO && labelMaxPositionFraction === NONE)) {
              const percent = (labelAboveBaseMaxPositionFraction === AUTO ? labelMaxPositionFraction : labelAboveBaseMaxPositionFraction)!;
              aboveBaseMaxValue = domainExtent === 0 ? (domainMax - 1) : (domainMax - percent * domainExtent);
            }
            if (labelBelowBaseMinPositionFraction !== NONE && !(labelBelowBaseMinPositionFraction === AUTO && labelMinPositionFraction === NONE)) {
              const percent = (labelBelowBaseMinPositionFraction === AUTO ? labelMinPositionFraction : labelBelowBaseMinPositionFraction)!;
              belowBaseMinValue = domainExtent === 0 ? (domainMin + 1) : (base - percent * domainExtent);
            }
            if (labelBelowBaseMaxPositionFraction !== NONE && !(labelBelowBaseMaxPositionFraction === AUTO && labelMaxPositionFraction === NONE)) {
              const percent = (labelBelowBaseMaxPositionFraction === AUTO ? labelMaxPositionFraction : labelBelowBaseMaxPositionFraction)!;
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
            if (labelMinPositionFraction !== NONE) {
              minValue = domainExtent === 0 ? domainMin + 1 : domainMin + labelMinPositionFraction * domainExtent;
            }
            if (labelMaxPositionFraction !== NONE) {
              maxValue = domainExtent === 0 ? domainMax - 1 : domainMax - labelMaxPositionFraction * domainExtent;
            }

            withinPercentages = (seriesValue: number) => {
              return (minValue === null || seriesValue >= minValue) && (maxValue === null || seriesValue <= maxValue);
            };
          }
        }
        if (seriesConfig.labelMinRangeFraction !== NONE) {
          const oldWithinPercentages = withinPercentages;
          const hasStack = seriesConfig.stack !== NONE;
          const minAbsoluteValue = domainExtent === 0 ? domainMin + 1 : seriesConfig.labelMinRangeFraction * domainExtent;

          if (hasStack) {
            if (hasBase) {
              withinPercentages = (maxSeriesValue: number, minSeriesValue?: number | null) => {
                let valueMin = base;
                if (minSeriesValue !== null && minSeriesValue !== undefined) {
                  valueMin = minSeriesValue;
                }
                return oldWithinPercentages(maxSeriesValue) && Math.abs(maxSeriesValue - valueMin) >= minAbsoluteValue;
              };
            }
            else {
              withinPercentages = (maxSeriesValue: number, minSeriesValue?: number | null) => {
                let valueMin = domainMin;
                if (minSeriesValue !== null && minSeriesValue !== undefined) {
                  valueMin = minSeriesValue;
                }
                return oldWithinPercentages(maxSeriesValue) && Math.abs(maxSeriesValue - valueMin) >= minAbsoluteValue;
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

        const valueFormat = getSeriesLabelFormat(seriesConfig, valueAxisConfig, valueAxisScale);

        const { categoryFocusPercentages, valueAxisFocusPercentages, seriesFocusPercentages } = focusData;
        const seriesFocusPercentage = getSeriesFocusPercentage(seriesConfig, valueAxisFocusPercentages, seriesFocusPercentages);

        let focusPercentage, aboveBase, textAnchor, dy, seriesPosition, x, y;
        // Each side resolves its own position (labelAboveBasePosition/
        // labelBelowBasePosition fall back to labelPosition).
        const aboveBasePosition = getLabelPosition(true, hasBase, seriesConfig);
        const belowBasePosition = getLabelPosition(false, hasBase, seriesConfig);
        const aboveBaseTextAnchor = getTextAnchor(inverted, true, aboveBasePosition);
        const belowBaseTextAnchor = getTextAnchor(inverted, false, belowBasePosition);
        const aboveBaseDY = getDY(inverted, true, aboveBasePosition);
        const belowBaseDY = getDY(inverted, false, belowBasePosition);

        const { length, getDefined, getSeriesPosition, getCategoryPosition, skipped, skipCategoryIndexMap } = seriesPositionData;

        for (let i = 0; i < length; i++) {
          const skipI = skipped ? skipCategoryIndexMap[i] : i;
          // a missing prior (NaN) reads as undefined here so the base/domain fallbacks above apply
          const minValue = minValues ? (isMissingValue(minValues[skipI]) ? undefined : minValues[skipI]) : null;
          if (getDefined(null, i) && !isMissingValue(labelValues[skipI]) && withinPercentages(maxValues[skipI]!, minValue)) {
            aboveBase = !hasBase || maxValues[skipI]! >= base;
            textAnchor = aboveBase ? aboveBaseTextAnchor : belowBaseTextAnchor;
            dy = aboveBase ? aboveBaseDY : belowBaseDY;

            focusPercentage = getCategoryFocusPercentage(categoryFocusPercentages[skipI], seriesFocusPercentage);
            labelFillColor = getSeriesLabelFillColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, null, skipI);
            labelStrokeColor = getSeriesLabelStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, null, skipI);
            const { strokeWidth: labelStrokeWidth, strokeOpacity: labelStrokeOpacity, fillOpacity: labelFillOpacity } = getFocusStyle(focusPercentage, seriesConfig.labelTextStyle);
            seriesPosition = getSeriesPosition(null, i)! + getOffset(aboveBase);
            x = inverted ? seriesPosition : getCategoryPosition(null, i)!;
            y = inverted ? getCategoryPosition(null, i)! : seriesPosition;
            labels.push({
              key: 'label-' + i,
              attrs: { className: mochartCssClasses['seriesLabel'] + i, transform: translate(x, y),
                textAnchor, dy, stroke: labelStrokeColor, fill: labelFillColor, fillOpacity: labelFillOpacity, strokeOpacity: labelStrokeOpacity,
                strokeWidth: labelStrokeWidth, onMouseEnter: () => onCategoryEnter(i), onMouseLeave: () => onCategoryLeave(i), onClick: (event: Event) => onCategoryClick(i, event) },
              text: String(valueFormat(labelValues[skipI]!))
            });
          }
        }
        this.setPresent(true);
        // unattributed values, interpolated mid-animation: the tooltip live region reads the settled ones
        this.root.set({ className: mochartCssClasses['seriesLabels'],
          ariaHidden: accessibility ? 'true' : null });
        this.labels.sync(labels, labelAdapter);
        return;
      }
    }
    this.setPresent(false);
  }
}
