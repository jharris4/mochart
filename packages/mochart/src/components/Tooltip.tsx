// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import TooltipContent from './TooltipContent';

import { mochartCssClasses } from '../utils/ChartDom';

export default class Tooltip extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { mochartConfig, tooltipVisible, tooltipGroupIndex } = this.props;
    if (mochartConfig.tooltipConfig.visible && tooltipVisible && tooltipGroupIndex >= 0) {
      const { svgUniqueId, groupCount, focusedGroupIndex, tooltipBounds, tooltipValueObject, focusedSeriesId,
        seriesAxisFocusPercentages, seriesFocusPercentages, tooltipLayoutInfo, onClose, updateTooltipGroupIndex, onFocus, onSeriesFilter } = this.props;

      const { tooltipConfig } = mochartConfig;

      const { x, y } = tooltipLayoutInfo;

      const boxShadowStyle = tooltipConfig.dropShadowOffsetX + 'px ' + tooltipConfig.dropShadowOffsetY + 'px ' +
        tooltipConfig.dropShadowBlurRadius + 'px ' + tooltipConfig.dropShadowColor;

      const tooltipSizerStyle = {
        position: 'absolute',
        left: 0,
        top: 0,
        visibility: 'hidden'
      };

      const tooltipStyle = {
        position: 'absolute',
        left: x,
        top: y,
        background: tooltipConfig.backgroundColor,
        borderStyle: 'solid',
        padding: tooltipConfig.padding,
        borderWidth: tooltipConfig.borderWidth,
        borderColor: tooltipConfig.borderColor,
        borderRadius: tooltipConfig.borderRadius,
        boxShadow: boxShadowStyle,
        visibility: tooltipBounds !== null ? 'visible' : 'hidden'
      };

      const sizeForSuppression = tooltipConfig.adjustSizeForSuppression;

      return (
        <div className={mochartCssClasses['tooltipContainer']}>
          <div className={mochartCssClasses['tooltipSizer']} style={tooltipSizerStyle}>
            <TooltipContent mochartConfig={mochartConfig} tooltipValueObject={tooltipValueObject} tooltipGroupIndex={tooltipGroupIndex} focusedGroupIndex={focusedGroupIndex}
                            focusedSeriesId={focusedSeriesId} seriesAxisFocusPercentages={seriesAxisFocusPercentages} seriesFocusPercentages={seriesFocusPercentages}
                            adjustForSuppression={sizeForSuppression} svgUniqueId={svgUniqueId} updateTooltipGroupIndex={updateTooltipGroupIndex}
                            onClose={onClose} onFocus={onFocus} onSeriesFilter={onSeriesFilter} groupCount={groupCount} visible={false}/>
          </div>
          <div className={mochartCssClasses['tooltip']} style={tooltipStyle}>
            <TooltipContent mochartConfig={mochartConfig} tooltipValueObject={tooltipValueObject} tooltipGroupIndex={tooltipGroupIndex} focusedGroupIndex={focusedGroupIndex}
                            focusedSeriesId={focusedSeriesId} seriesAxisFocusPercentages={seriesAxisFocusPercentages} seriesFocusPercentages={seriesFocusPercentages}
                            minWidth={tooltipBounds ? tooltipBounds.width : null} svgUniqueId={svgUniqueId} updateTooltipGroupIndex={updateTooltipGroupIndex}
                            onClose={onClose} onFocus={onFocus} onSeriesFilter={onSeriesFilter} groupCount={groupCount} visible={true}/>
          </div>
        </div>
      );
    }
    return false;
  }
}
