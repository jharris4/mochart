import { arc } from 'd3-shape';
import { format } from 'd3-format';

import { Renderer, svgEl, textEl } from '../render';

import { degreesToRadians } from '../data/PieData';
import { getSeriesFillColor, getSeriesStrokeColor, getSeriesLabelFillColor, getSeriesLabelStrokeColor } from '../utils/SeriesColors';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import { getFocusValue } from '../utils/FocusValue';
import { getGradientReference } from '../utils/svgUtils';
import { mochartCssClasses } from '../utils/ChartDom';
import { translate, textDY } from '../utils/utils';
import { NONE, AUTO, PIE_LABEL_TYPE_TITLE, PIE_LABEL_TYPE_PERCENT } from '../config/core/constants';

import type { ColorPaletteConfig, PieConfig, SeriesConfig } from '../types/config';
import type { FocusData } from '../types/animation';
import type { LayoutInfo } from '../types/layout';
import type { PieSliceAngles } from '../data/PieData';
import type { RadialLayoutInfo } from '../layout/RadialLayout';

const noOp = () => {};

// Auto formats: whole percents for percent labels, SI-abbreviated values for
// value labels (pie slices rarely have room for more digits).
const AUTO_PERCENT_FORMAT = '.0%';
const AUTO_VALUE_FORMAT = '~s';

interface PieSeriesFocusUpdate {
  seriesId?: string | null;
}

interface PieSeriesProps {
  colorPaletteConfig: ColorPaletteConfig;
  pieConfig: PieConfig;
  seriesConfig: SeriesConfig;
  seriesIndex: number;
  seriesLayoutInfo: LayoutInfo;
  radialLayoutInfo: RadialLayoutInfo;
  sliceAngles: PieSliceAngles | undefined;
  /**
   * The fraction driving the label content and min-angle threshold: the
   * slice's share of the unsuppressed total, or of the full raw total when
   * adjustLabelsForSuppression is off.
   */
  labelFraction: number;
  focusData: FocusData | null;
  gradientIdMap: Record<string, string>;
  /** Suppress labels while the initial sweep-in is running. */
  hideLabels: boolean;
  onFocus: (focus: PieSeriesFocusUpdate) => void;
}

interface PieSeriesState {
  onSeriesEnter: () => void;
  onSeriesLeave: () => void;
  onSeriesClick: () => void;
}

function getPieLabelText(pieConfig: PieConfig, seriesConfig: SeriesConfig, sliceAngles: PieSliceAngles, labelFraction: number): string {
  if (pieConfig.labelType === PIE_LABEL_TYPE_TITLE) {
    return seriesConfig.title ?? seriesConfig.id;
  }
  if (pieConfig.labelType === PIE_LABEL_TYPE_PERCENT) {
    const specifier = pieConfig.labelFormat === AUTO ? AUTO_PERCENT_FORMAT : pieConfig.labelFormat;
    return format(specifier)(labelFraction);
  }
  const specifier = pieConfig.labelFormat === AUTO ? AUTO_VALUE_FORMAT : pieConfig.labelFormat;
  return format(specifier)(sliceAngles.value);
}

/** One pie/donut slice: an arc path plus an optional centroid label. */
export default class PieSeries extends Renderer<PieSeriesProps, PieSeriesState> {
  root = svgEl('g');
  shape = this.elSlot(this.root);
  label = this.elSlot(this.root);
  labelText = textEl();

  constructor() {
    super();
    this.state = { onSeriesEnter: noOp, onSeriesLeave: noOp, onSeriesClick: noOp };
  }

  derive(props: PieSeriesProps, _state: PieSeriesState, prevProps: PieSeriesProps | null): Partial<PieSeriesState> | null {
    const { seriesConfig, focusData, onFocus } = props;
    let focusedSeriesChanged = false;
    if (prevProps !== null && focusData !== prevProps.focusData) {
      focusedSeriesChanged = focusData === null || prevProps.focusData === null ||
        focusData.focusedSeriesId !== prevProps.focusData.focusedSeriesId;
    }
    if (prevProps !== null && seriesConfig === prevProps.seriesConfig && onFocus === prevProps.onFocus && !focusedSeriesChanged) {
      return null;
    }
    // a follower series (followSeries) focuses as its leader, matching Series
    const seriesId = seriesConfig.followSeries ?? seriesConfig.id;
    const focusedSeriesId = focusData ? focusData.focusedSeriesId : null;

    let onSeriesEnter = noOp;
    let onSeriesLeave = noOp;
    let onSeriesClick = noOp;
    if (seriesConfig.focusOnMouseOver) {
      onSeriesEnter = () => { onFocus({ seriesId }); };
      onSeriesLeave = () => { onFocus({ seriesId: null }); };
    }
    if (seriesConfig.focusOnClick) {
      onSeriesClick = () => { onFocus({ seriesId: seriesId === focusedSeriesId ? null : seriesId }); };
    }
    return { onSeriesEnter, onSeriesLeave, onSeriesClick };
  }

  create() {
    return this.root.node;
  }

  sync() {
    const { colorPaletteConfig, pieConfig, seriesConfig, seriesIndex, seriesLayoutInfo, radialLayoutInfo,
      sliceAngles, labelFraction, focusData, gradientIdMap, hideLabels } = this.props;
    const { onSeriesEnter, onSeriesLeave, onSeriesClick } = this.state;

    if (sliceAngles === undefined || sliceAngles.fraction <= 0 || focusData === null) {
      this.setPresent(false);
      return;
    }

    const { seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
    const seriesFocusPercentage = getSeriesFocusPercentage(seriesConfig, seriesAxisFocusPercentages, seriesFocusPercentages);

    const strokeColor = getSeriesStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, seriesFocusPercentage);
    let fillColor = getSeriesFillColor(colorPaletteConfig, seriesConfig, seriesIndex, seriesFocusPercentage);
    if (seriesConfig.gradient !== NONE) {
      fillColor = getGradientReference(gradientIdMap[seriesConfig.gradient]);
    }
    const strokeWidth = getFocusValue(seriesFocusPercentage, seriesConfig.strokeWidth, seriesConfig.focusedStrokeWidth, seriesConfig.defocusedStrokeWidth);
    const strokeOpacity = getFocusValue(seriesFocusPercentage, seriesConfig.strokeOpacity, seriesConfig.focusedStrokeOpacity, seriesConfig.defocusedStrokeOpacity);
    const fillOpacity = getFocusValue(seriesFocusPercentage, seriesConfig.fillOpacity, seriesConfig.focusedFillOpacity, seriesConfig.defocusedFillOpacity);

    const arcGenerator = arc()
      .innerRadius(radialLayoutInfo.innerRadius)
      .outerRadius(radialLayoutInfo.outerRadius)
      .cornerRadius(pieConfig.cornerRadius)
      .padAngle(degreesToRadians(pieConfig.padAngle));
    const { startAngle, endAngle } = sliceAngles;

    // The focused slice "explodes" along its mid-angle; the tweened focus
    // percentage animates the offset in and out.
    let offsetX = 0;
    let offsetY = 0;
    if (pieConfig.focusOffsetPercent > 0 && seriesFocusPercentage !== null && seriesFocusPercentage > 0) {
      const offsetMidAngle = (startAngle + endAngle) / 2;
      const offset = seriesFocusPercentage * pieConfig.focusOffsetPercent * radialLayoutInfo.outerRadius;
      offsetX = offset * Math.sin(offsetMidAngle);
      offsetY = -offset * Math.cos(offsetMidAngle);
    }

    this.setPresent(true);
    this.root.set({ className: mochartCssClasses['series'] + seriesConfig.id,
      transform: translate(seriesLayoutInfo.x + radialLayoutInfo.cx + offsetX, seriesLayoutInfo.y + radialLayoutInfo.cy + offsetY) });

    this.shape.set('slice', () => svgEl('path'))!.set({
      d: arcGenerator({ startAngle, endAngle }), className: mochartCssClasses['seriesSlice'],
      onMouseEnter: onSeriesEnter, onMouseLeave: onSeriesLeave, onClick: onSeriesClick,
      stroke: strokeColor, strokeWidth, strokeOpacity,
      fill: fillColor, fillOpacity });

    if (pieConfig.showLabels && !hideLabels && labelFraction >= pieConfig.labelMinAnglePercent) {
      const midAngle = (startAngle + endAngle) / 2;
      const labelRadius = radialLayoutInfo.innerRadius + (radialLayoutInfo.outerRadius - radialLayoutInfo.innerRadius) * pieConfig.labelRadiusPercent;
      const labelFillColor = getSeriesLabelFillColor(colorPaletteConfig, seriesConfig, seriesIndex, seriesFocusPercentage);
      const labelStrokeColor = getSeriesLabelStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, seriesFocusPercentage);
      const labelStrokeWidth = getFocusValue(seriesFocusPercentage, seriesConfig.labelStrokeWidth, seriesConfig.labelFocusedStrokeWidth, seriesConfig.labelDefocusedStrokeWidth);
      const labelStrokeOpacity = getFocusValue(seriesFocusPercentage, seriesConfig.labelStrokeOpacity, seriesConfig.labelFocusedStrokeOpacity, seriesConfig.labelDefocusedStrokeOpacity);
      const labelFillOpacity = getFocusValue(seriesFocusPercentage, seriesConfig.labelFillOpacity, seriesConfig.labelFocusedFillOpacity, seriesConfig.labelDefocusedFillOpacity);

      const labelEl = this.label.set('text', () => {
        const el = svgEl('text');
        el.append(this.labelText);
        return el;
      });
      labelEl!.set({ className: mochartCssClasses['seriesSliceLabel'],
        transform: translate(labelRadius * Math.sin(midAngle), -labelRadius * Math.cos(midAngle)),
        textAnchor: 'middle', dy: textDY,
        stroke: labelStrokeColor, strokeWidth: labelStrokeWidth, strokeOpacity: labelStrokeOpacity,
        fill: labelFillColor, fillOpacity: labelFillOpacity });
      this.labelText.set(getPieLabelText(pieConfig, seriesConfig, sliceAngles, labelFraction));
    }
    else {
      this.label.set(null);
    }
  }
}
