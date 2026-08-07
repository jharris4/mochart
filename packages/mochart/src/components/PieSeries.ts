import { arc } from 'd3-shape';

import { Renderer, svgEl, textEl } from '../render';

import { degreesToRadians } from '../data/PieData';
import { getSeriesFillColor, getSeriesStrokeColor, getSeriesLabelFillColor, getSeriesLabelStrokeColor } from '../utils/SeriesColors';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import { getFocusValue, getFocusStrokeWidth } from '../utils/FocusValue';
import { getGradientReference } from '../utils/svgUtils';
import { mochartCssClasses } from '../utils/ChartDom';
import { translate, textDY } from '../utils/utils';
import { NONE } from '../config/core/constants';
import { formatPieLabelType, getPieLabelFormats } from '../data/PieLabel';

import type { ColorPaletteConfig, PieConfig } from '../types/config';
import type { EnhancedSeriesConfig } from '../types/enhanced';
import type { FocusData } from '../types/animation';
import type { LayoutInfo } from '../types/layout';
import type { PieSliceAngles } from '../data/PieData';
import type { RadialLayoutInfo } from '../layout/RadialLayout';

const noOp = () => {};

interface PieSeriesFocusUpdate {
  seriesId?: string | null;
}

interface PieSeriesProps {
  colorPaletteConfig: ColorPaletteConfig;
  pieConfig: PieConfig;
  seriesConfig: EnhancedSeriesConfig;
  seriesIndex: number;
  seriesLayoutInfo: LayoutInfo;
  radialLayoutInfo: RadialLayoutInfo;
  sliceAngles: PieSliceAngles | undefined;
  /**
   * The fraction driving the label content and min-angle threshold: the
   * slice's share of the unfiltered total, or of the full raw total when
   * adjustLabelsForFiltering is off.
   */
  labelFraction: number;
  focusData: FocusData | null;
  gradientIdMap: Record<string, string>;
  /** Filter labels while the initial sweep-in is running. */
  hideLabels: boolean;
  onFocus: (focus: PieSeriesFocusUpdate) => void;
  /** Click-only slice event for selection; independent of the focus flags. */
  onSliceClick?: (payload: { seriesId: string }) => void;
  /** Master switch for the slice's keyboard and screen-reader semantics. */
  accessibility: boolean;
  /** The roving tab stop: one slice is Tab-reachable, arrows move between slices. */
  tabStop: boolean;
}

interface PieSeriesState {
  onSeriesEnter: () => void;
  onSeriesLeave: () => void;
  onSeriesClick: () => void;
}

function getPieLabelText(pieConfig: PieConfig, seriesConfig: EnhancedSeriesConfig, sliceAngles: PieSliceAngles, labelFraction: number): string {
  const { valueFormat, percentFormat } = getPieLabelFormats(pieConfig);
  return formatPieLabelType(pieConfig.labelType, {
    title: seriesConfig.title ?? seriesConfig.id,
    value: valueFormat(sliceAngles.value),
    percent: percentFormat(labelFraction)
  });
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
    const { seriesConfig, focusData, onFocus, onSliceClick } = props;
    let focusedSeriesChanged = false;
    if (prevProps !== null && focusData !== prevProps.focusData) {
      focusedSeriesChanged = focusData === null || prevProps.focusData === null ||
        focusData.focusedSeriesId !== prevProps.focusData.focusedSeriesId;
    }
    if (prevProps !== null && seriesConfig === prevProps.seriesConfig && onFocus === prevProps.onFocus &&
        onSliceClick === prevProps.onSliceClick && !focusedSeriesChanged) {
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
    if (seriesConfig.focusOnClick || onSliceClick) {
      onSeriesClick = () => {
        if (seriesConfig.focusOnClick) {
          onFocus({ seriesId: seriesId === focusedSeriesId ? null : seriesId });
        }
        onSliceClick?.({ seriesId });
      };
    }
    return { onSeriesEnter, onSeriesLeave, onSeriesClick };
  }

  onKeyDown = (event: Event) => {
    const { key } = event as KeyboardEvent;
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      // keyboard activation = a real click at the slice's center, so the
      // bubbled chart-level behavior (tooltip toggle) fires like a mouse click
      const shapeNode = this.root.node.querySelector('.' + mochartCssClasses['seriesSlice']);
      if (shapeNode !== null) {
        const bounds = shapeNode.getBoundingClientRect();
        shapeNode.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true,
          clientX: bounds.x + bounds.width / 2, clientY: bounds.y + bounds.height / 2 }));
      }
    }
  }

  create() {
    return this.root.node;
  }

  sync() {
    const { colorPaletteConfig, pieConfig, seriesConfig, seriesIndex, seriesLayoutInfo, radialLayoutInfo,
      sliceAngles, labelFraction, focusData, gradientIdMap, hideLabels, onSliceClick, accessibility, tabStop } = this.props;
    const { onSeriesEnter, onSeriesLeave, onSeriesClick } = this.state;

    if (sliceAngles === undefined || sliceAngles.fraction <= 0 || focusData === null) {
      this.setPresent(false);
      return;
    }

    const { valueAxisFocusPercentages, seriesFocusPercentages } = focusData;
    const seriesFocusPercentage = getSeriesFocusPercentage(seriesConfig, valueAxisFocusPercentages, seriesFocusPercentages);

    const strokeColor = getSeriesStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, seriesFocusPercentage);
    let fillColor = getSeriesFillColor(colorPaletteConfig, seriesConfig, seriesIndex, seriesFocusPercentage);
    if (seriesConfig.gradient !== NONE) {
      fillColor = getGradientReference(gradientIdMap[seriesConfig.gradient]);
    }
    const { normal: shapeNormal, focused: shapeFocused, defocused: shapeDefocused } = seriesConfig.shapeStyle;
    const strokeWidth = getFocusStrokeWidth(seriesFocusPercentage, shapeNormal.strokeWidth, shapeFocused.strokeWidth, shapeDefocused.strokeWidth);
    const strokeOpacity = getFocusValue(seriesFocusPercentage, shapeNormal.strokeOpacity!, shapeFocused.strokeOpacity!, shapeDefocused.strokeOpacity!);
    const fillOpacity = getFocusValue(seriesFocusPercentage, shapeNormal.fillOpacity!, shapeFocused.fillOpacity!, shapeDefocused.fillOpacity!);

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
    if (pieConfig.focusOffsetFraction > 0 && seriesFocusPercentage !== null && seriesFocusPercentage > 0) {
      const offsetMidAngle = (startAngle + endAngle) / 2;
      const offset = seriesFocusPercentage * pieConfig.focusOffsetFraction * radialLayoutInfo.outerRadius;
      offsetX = offset * Math.sin(offsetMidAngle);
      offsetY = -offset * Math.cos(offsetMidAngle);
    }

    this.setPresent(true);
    // clicking does something (focus or selection), so the slice is keyboard-reachable;
    // keyboard focus shows only the ring — mirroring hover would reorder the DOM under the focused node
    const interactive = accessibility && (seriesConfig.focusOnClick || onSliceClick !== undefined);
    const { percentFormat } = getPieLabelFormats(pieConfig);
    this.root.set({ className: mochartCssClasses['series'] + seriesConfig.id,
      ariaHidden: accessibility && !interactive ? 'true' : null,
      dataSeriesId: interactive ? seriesConfig.id : null,
      tabindex: interactive ? (tabStop ? '0' : '-1') : null,
      role: interactive ? 'button' : null,
      ariaLabel: interactive ? (seriesConfig.title ?? seriesConfig.id) + ', ' + percentFormat(labelFraction) : null,
      onKeyDown: interactive ? this.onKeyDown : null,
      transform: translate(seriesLayoutInfo.x + radialLayoutInfo.cx + offsetX, seriesLayoutInfo.y + radialLayoutInfo.cy + offsetY) });

    this.shape.set('slice', () => svgEl('path'))!.set({
      d: arcGenerator({ startAngle, endAngle }), className: mochartCssClasses['seriesSlice'],
      onMouseEnter: onSeriesEnter, onMouseLeave: onSeriesLeave, onClick: onSeriesClick,
      stroke: strokeColor, strokeWidth, strokeOpacity,
      fill: fillColor, fillOpacity });

    if (pieConfig.showLabels && !hideLabels && labelFraction >= pieConfig.labelMinFraction) {
      const midAngle = (startAngle + endAngle) / 2;
      const labelRadius = radialLayoutInfo.innerRadius + (radialLayoutInfo.outerRadius - radialLayoutInfo.innerRadius) * pieConfig.labelRadiusFraction;
      const labelFillColor = getSeriesLabelFillColor(colorPaletteConfig, seriesConfig, seriesIndex, seriesFocusPercentage);
      const labelStrokeColor = getSeriesLabelStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, seriesFocusPercentage);
      const { normal: labelNormal, focused: labelFocused, defocused: labelDefocused } = seriesConfig.labelTextStyle;
      const labelStrokeWidth = getFocusStrokeWidth(seriesFocusPercentage, labelNormal.strokeWidth, labelFocused.strokeWidth, labelDefocused.strokeWidth);
      const labelStrokeOpacity = getFocusValue(seriesFocusPercentage, labelNormal.strokeOpacity!, labelFocused.strokeOpacity!, labelDefocused.strokeOpacity!);
      const labelFillOpacity = getFocusValue(seriesFocusPercentage, labelNormal.fillOpacity!, labelFocused.fillOpacity!, labelDefocused.fillOpacity!);

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
