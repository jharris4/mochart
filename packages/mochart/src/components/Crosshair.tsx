// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { getClipPathReference } from '../utils/svgUtils';

class Crosshair extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { mochartConfig, seriesLayoutInfo, groupPercentages, seriesPercentages, tooltipClipPathUniqueId } = this.props;

    if (mochartConfig.crosshairConfig.visible) {
      const { plotConfig, crosshairConfig } = mochartConfig;

      const { inverted } = plotConfig;

      let minX = seriesLayoutInfo.x;
      let maxX = minX + seriesLayoutInfo.width;
      let minY = seriesLayoutInfo.y;
      let maxY = minY + seriesLayoutInfo.height;
      let groupLines = null;
      if (crosshairConfig.showGroup) {
        groupLines = groupPercentages.map((groupPercentage, groupLineIndex) => {
          let groupOffset = groupPercentage * seriesLayoutInfo.groupExtent;
          let groupPosition = (inverted ? minY : minX) + groupOffset;
          let groupX1 = inverted ? minX : groupPosition;
          let groupX2 = inverted ? maxX : groupPosition;
          let groupY1 = inverted ? groupPosition : minY;
          let groupY2 = inverted ? groupPosition : maxY;

          return (
            <line key={groupLineIndex} className={mochartCssClasses['crosshairLine']}
              x1={groupX1} y1={groupY1} x2={groupX2} y2={groupY2} stroke={crosshairConfig.lineColor}
              strokeWidth={crosshairConfig.lineWidth} strokeDasharray={crosshairConfig.lineDashArray} />
          );
        });
      }
      let seriesLines = null;
      if (crosshairConfig.showSeries) {
        seriesLines = seriesPercentages.map((seriesPercentage, seriesLineIndex) => {
          let seriesOffset = seriesPercentage * seriesLayoutInfo.seriesExtent;
          let seriesPosition = (inverted ? minX : minY) + seriesOffset;
          let seriesX1 = inverted ? seriesPosition : minX;
          let seriesX2 = inverted ? seriesPosition : maxX;
          let seriesY1 = inverted ? minY : seriesPosition;
          let seriesY2 = inverted ? maxY : seriesPosition;

          return (
            <line key={seriesLineIndex} className={mochartCssClasses['crosshairLine']}
              x1={seriesX1} y1={seriesY1} x2={seriesX2} y2={seriesY2} stroke={crosshairConfig.lineColor}
              strokeWidth={crosshairConfig.lineWidth} strokeDasharray={crosshairConfig.lineDashArray} />
          );
        });
      }

      let clipPath = crosshairConfig.showBehindTooltip ? null : getClipPathReference(tooltipClipPathUniqueId);

      return (
        <g className={mochartCssClasses['crosshair']} clipPath={clipPath}>
          <g className={mochartCssClasses['crosshairGroupLines']}>
            {groupLines}
          </g>
          <g className={mochartCssClasses['crosshairSeriesLines']}>
            {seriesLines}
          </g>
        </g>
      );
    }
    return false;
  }
}

export default Crosshair;