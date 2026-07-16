// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl, textEl } from '../render';

import { getSeriesLabelFormat } from '../utils/ValueFormat';
import { mochartCssClasses } from '../utils/ChartDom';
import { NONE, AUTO, LABEL_POSITION_CENTER, LABEL_POSITION_INSIDE } from '../config/core/constants';
import { translate } from '../utils/utils';
import { getSeriesLabelFillColor, getSeriesLabelStrokeColor } from '../utils/SeriesColors';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import { getFocusValue, getGroupFocusPercentage } from '../utils/FocusValue';

const getLabelPosition = (isAboveBase, hasBase, seriesConfig) => {
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

const getTextAnchor = (inverted, isAboveBase, position) => {
  return (!inverted || position === LABEL_POSITION_CENTER) ? 'middle' :
    (position === LABEL_POSITION_INSIDE ? (isAboveBase ? 'end' : 'start') : (isAboveBase ? 'start' : 'end'));
};

const getDY = (inverted, isAboveBase, position) => {
  return (inverted || position === LABEL_POSITION_CENTER) ? '0.35em' :
    (position === LABEL_POSITION_INSIDE ? (isAboveBase ? '1.35em' : '-0.65em') : (isAboveBase ? '-0.65em' : '1.35em'));
};

const labelAdapter = {
  key: (label) => label.key,
  create: () => {
    const root = svgEl('text');
    const value = textEl();
    root.append(value);
    return { root, value };
  },
  update: (handle, label) => {
    handle.root.set(label.attrs);
    handle.value.set(label.text);
  }
};

export default class SeriesLabels extends Renderer {
  root = svgEl('g');
  labels = this.elList(this.root);

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
      const domainExtent = domainMax - domainMin;
      const base = hasBase ? Math.min(Math.max(seriesAxisConfig.base, domainMin), domainMax) : domainMin;

      if (domainMin !== null) {
        let labels = [];
        const { max: maxValues, min: minValues, label: labelValues } = filteredValues;
        let labelStrokeColor, labelFillColor, labelStrokeWidth, labelStrokeOpacity, labelFillOpacity;

        let withinPercentages = (seriesValue) => {
          return true;
        };

        const { labelOffset } = seriesConfig;

        let getOffset = (aboveBase) => {
          return labelOffset;
        };

        if (hasBase) {
          const aboveBaseLabelOffset = seriesConfig.labelAboveBaseOffset === AUTO ? labelOffset : seriesConfig.labelAboveBaseOffset;
          const belowBaseLabelOffset = seriesConfig.labelBelowBaseOffset === AUTO ? -1 * labelOffset : seriesConfig.labelBelowBaseOffset;

          getOffset = (aboveBase) => {
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

          let minValue = null;
          let maxValue = null;
          let aboveBaseMinValue = null;
          let aboveBaseMaxValue = null;
          let belowBaseMinValue = null;
          let belowBaseMaxValue = null;

          if (hasBase) {
            if (labelAboveBaseMinPositionPercent !== NONE && !(labelAboveBaseMinPositionPercent === AUTO && labelMinPositionPercent === NONE)) {
              let percent = labelAboveBaseMinPositionPercent === AUTO ? labelMinPositionPercent : labelAboveBaseMinPositionPercent;
              aboveBaseMinValue = domainExtent === 0 ? (domainMin + 1) : (base + percent * domainExtent);
            }
            if (labelAboveBaseMaxPositionPercent !== NONE && !(labelAboveBaseMaxPositionPercent === AUTO && labelMaxPositionPercent === NONE)) {
              let percent = labelAboveBaseMaxPositionPercent === AUTO ? labelMaxPositionPercent : labelAboveBaseMaxPositionPercent;
              aboveBaseMaxValue = domainExtent === 0 ? (domainMax - 1) : (domainMax - percent * domainExtent);
            }
            if (labelBelowBaseMinPositionPercent !== NONE && !(labelBelowBaseMinPositionPercent === AUTO && labelMinPositionPercent === NONE)) {
              let percent = labelBelowBaseMinPositionPercent === AUTO ? labelMinPositionPercent : labelBelowBaseMinPositionPercent;
              belowBaseMinValue = domainExtent === 0 ? (domainMin + 1) : (base - percent * domainExtent);
            }
            if (labelBelowBaseMaxPositionPercent !== NONE && !(labelBelowBaseMaxPositionPercent === AUTO && labelMaxPositionPercent === NONE)) {
              let percent = labelBelowBaseMaxPositionPercent === AUTO ? labelMaxPositionPercent : labelBelowBaseMaxPositionPercent;
              belowBaseMaxValue = domainExtent === 0 ? (domainMax - 1) : (domainMin + percent * domainExtent);
            }
            withinPercentages = (seriesValue) => {
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

            withinPercentages = (seriesValue) => {
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
              withinPercentages = (maxSeriesValue, minSeriesValue) => {
                let valueMin = base;
                if (minSeriesValue !== null && minSeriesValue !== void 0) {
                  valueMin = minSeriesValue;
                }
                return oldWithinPercentages(maxSeriesValue) && (maxSeriesValue - valueMin) >= minAbsoluteValue;
              };
            }
            else {
              withinPercentages = (maxSeriesValue, minSeriesValue) => {
                let valueMin = domainMin;
                if (minSeriesValue !== null && minSeriesValue !== void 0) {
                  valueMin = minSeriesValue;
                }
                return oldWithinPercentages(maxSeriesValue) && (maxSeriesValue - valueMin) >= minAbsoluteValue;
              };
            }
          }
          else {
            withinPercentages = (maxSeriesValue, minSeriesValue) => {
              let valueMin = maxSeriesValue;
              if (minSeriesValue !== void 0) {
                valueMin = minSeriesValue;
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
          if (getDefined(null, i) && labelValues[skipI] !== void 0 && withinPercentages(maxValues[skipI], minValues ? minValues[skipI] : null)) {
            aboveBase = !hasBase || maxValues[skipI] >= base;
            textAnchor = aboveBase ? aboveBaseTextAnchor : belowBaseTextAnchor;
            dy = aboveBase ? aboveBaseDY : belowBaseDY;

            focusPercentage = getGroupFocusPercentage(groupFocusPercentages[skipI], seriesFocusPercentage);
            labelFillColor = getSeriesLabelFillColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, null, i);
            labelStrokeColor = getSeriesLabelStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, null, i);
            labelStrokeWidth = getFocusValue(focusPercentage, seriesConfig.labelStrokeWidth, seriesConfig.labelFocusedStrokeWidth, seriesConfig.labelDefocusedStrokeWidth);
            labelStrokeOpacity = getFocusValue(focusPercentage, seriesConfig.labelStrokeOpacity, seriesConfig.labelFocusedStrokeOpacity, seriesConfig.labelDefocusedStrokeOpacity);
            labelFillOpacity = getFocusValue(focusPercentage, seriesConfig.labelFillOpacity, seriesConfig.labelFocusedFillOpacity, seriesConfig.labelDefocusedFillOpacity);
            seriesPosition = getSeriesPosition(null, i) + getOffset(aboveBase);
            x = inverted ? seriesPosition : getGroupPosition(null, i);
            y = inverted ? getGroupPosition(null, i) : seriesPosition;
            labels.push({
              key: 'label-' + i,
              attrs: { className: mochartCssClasses['seriesLabel'] + i, transform: translate(x, y),
                textAnchor, dy, stroke: labelStrokeColor, fill: labelFillColor, fillOpacity: labelFillOpacity, strokeOpacity: labelStrokeOpacity,
                strokeWidth: labelStrokeWidth, onMouseEnter: () => onGroupEnter(i), onMouseLeave: () => onGroupLeave(i), onClick: () => onGroupClick(i) },
              text: valueFormat(labelValues[skipI])
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
