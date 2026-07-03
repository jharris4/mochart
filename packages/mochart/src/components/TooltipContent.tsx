// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { getGroupFormat, getSeriesFormats } from '../utils/ValueFormat';
import { getSeriesText, getSuppressedValue } from '../utils/TooltipFormat';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import { mochartCssClasses } from '../utils/ChartDom';
import { NONE } from '../config/core/constants';

import TooltipControls from './TooltipControls';
import SeriesColorIcon from './SeriesColorIcon';

const itemPadding = 2;

const MODE_FOCUS = 'focus';
const MODE_FILTER = 'filter';

const baseLineStyle = {
  whiteSpace: 'nowrap',
  padding: itemPadding,
  paddingTop: itemPadding,
  paddingRight: itemPadding,
  paddingLeft: itemPadding
};

const alignedLineStyle = {
  overflow: 'auto',
  whiteSpace: 'nowrap'
};

export default class TooltipContent extends PureComponent {
  static defaultProps = {
    adjustForSuppression: true,
    minWidth: null
  };

  constructor(props) {
    super(props);
    this.state = { mode: MODE_FILTER };
  }

  toggleMode = () => {
    let { mode } = this.state;
    if (mode === MODE_FILTER) {
      mode = MODE_FOCUS;
    }
    else if (mode === MODE_FOCUS) {
      mode = MODE_FILTER;
    }
    this.setState({ mode });
  }

  onGroupMouseEnter = (event) => {
    const { mochartConfig, tooltipGroupIndex, onFocus } = this.props;
    const { mode } = this.state;
    const { tooltipConfig } = mochartConfig;
    const { showControls, focusOnGroupMouseOver } = tooltipConfig;
    let shouldFocus = focusOnGroupMouseOver && (showControls ? mode === MODE_FILTER : true);
    if (shouldFocus) {
      onFocus({ groupIndex: tooltipGroupIndex });
    }
  }

  onGroupMouseLeave = (event) => {
    const { mochartConfig, onFocus } = this.props;
    const { mode } = this.state;
    const { tooltipConfig } = mochartConfig;
    const { showControls, focusOnGroupMouseOver } = tooltipConfig;
    let shouldFocus = focusOnGroupMouseOver && (showControls ? mode === MODE_FILTER : true);
    if (shouldFocus) {
      onFocus({ groupIndex: null });
    }
  }

  onGroupClick = (event) => {
    const { mochartConfig, tooltipGroupIndex, focusedGroupIndex, onFocus } = this.props;
    const { mode } = this.state;
    const { tooltipConfig } = mochartConfig;
    const { showControls, focusOnGroupClick } = tooltipConfig;
    let shouldFocus = showControls ? mode === MODE_FOCUS : focusOnGroupClick;
    if (shouldFocus) {
      event.stopPropagation();
      onFocus({ groupIndex: focusedGroupIndex === tooltipGroupIndex ? -1 : tooltipGroupIndex });
    }
  }

  onSeriesMouseEnter = (event, seriesId) => {
    const { mochartConfig, onFocus } = this.props;
    const { mode } = this.state;
    const { tooltipConfig } = mochartConfig;
    const { showControls, focusOnSeriesMouseOver } = tooltipConfig;
    const shouldFocus = focusOnSeriesMouseOver && (showControls ? mode === MODE_FILTER : true);
    if (shouldFocus) {
      onFocus({ seriesId });
    }
  }

  onSeriesMouseLeave = (event) => {
    const { mochartConfig, onFocus } = this.props;
    const { mode } = this.state;
    const { tooltipConfig } = mochartConfig;
    const { showControls, focusOnSeriesMouseOver } = tooltipConfig;
    let shouldFocus = focusOnSeriesMouseOver && (showControls ? mode === MODE_FILTER : true);
    if (shouldFocus) {
      onFocus({ seriesId: null });
    }
  }

  onSeriesClick = (event, seriesId) => {
    const { mode } = this.state;
    const { mochartConfig, focusedSeriesId, onFocus, onSeriesFilter } = this.props;
    const { tooltipConfig, seriesConfigs } = mochartConfig;
    const { showControls, focusOnSeriesClick, filterOnSeriesClick } = tooltipConfig;
    let shouldFocus = showControls ? mode === MODE_FOCUS : focusOnSeriesClick;
    let shouldFilter = showControls ? mode === MODE_FILTER : filterOnSeriesClick;
    if (shouldFocus || shouldFilter) {
      event.stopPropagation();
      if (shouldFocus) {
        if (focusedSeriesId !== void 0 && focusedSeriesId !== null) {
          onFocus({ seriesId: seriesId === focusedSeriesId ? null : seriesId });
        }
        else {
          onFocus({ seriesId });
        }
      }
      if (shouldFilter) {
        onSeriesFilter(seriesId);
      }
    }
  }

  onClick = (event) => {
    const { mochartConfig, onClose } = this.props;
    const { tooltipConfig } = mochartConfig;
    if (tooltipConfig.closeOnClick) {
      event.preventDefault();
      onClose();
    }
    else {
      event.stopPropagation();
    }
  }

  render() {
    const { mochartConfig, tooltipValueObject, groupCount, focusedGroupIndex, focusedSeriesId, visible, tooltipGroupIndex, updateTooltipGroupIndex,
      minWidth, adjustForSuppression, svgUniqueId, onFocus, seriesAxisFocusPercentages, seriesFocusPercentages } = this.props;
    const { mode } = this.state;

    const { tooltipConfig, groupAxisConfig, seriesAxisConfigs, seriesConfigs, seriesConfigIndicesById, colorPaletteConfig } = mochartConfig;

    const { group, series } = tooltipValueObject;
    const { raw, filteredFlags } = series;
    const { axisDomains } = raw;

    let tooltipControls = (
      <TooltipControls mochartConfig={mochartConfig} groupCount={groupCount} updateTooltipGroupIndex={updateTooltipGroupIndex}
                       tooltipGroupIndex={tooltipGroupIndex} focusedGroupIndex={focusedGroupIndex} focusedSeriesId={focusedSeriesId}
                       onFocus={onFocus} mode={mode} toggleMode={this.toggleMode} minWidth={minWidth}/>
    );
    const groupText = group.values.parsed;
    const groupFormat = getGroupFormat(groupAxisConfig);

    const lastLineStyle = minWidth !== null ? {...baseLineStyle, minWidth} : baseLineStyle;
    const lineStyle = {
      ...lastLineStyle, paddingBottom: tooltipConfig.linePadding,
    };

    const tooltipLines = [];

    const groupLabel = groupAxisConfig.valueLabel !== NONE ? groupAxisConfig.valueLabel + ": " : "";
    tooltipLines.push(
      <div className={mochartCssClasses['tooltipGroupLine']} key={'group'} style={lineStyle} onMouseEnter={(event) => this.onGroupMouseEnter(event)}
           onMouseLeave={(event) => this.onGroupMouseLeave(event)} onClick={(event) => this.onGroupClick(event)}>
        {groupLabel}{groupFormat(groupText)}
      </div>
    );

    const valueFormats = getSeriesFormats(seriesConfigs, seriesAxisConfigs, axisDomains);
    for (let seriesConfig of seriesConfigs) {
      const { id: seriesId } = seriesConfig;
      const seriesIndex = seriesConfigIndicesById[seriesId];
      const seriesIsSuppressed = filteredFlags[seriesId];
      const seriesIsFocused = seriesId === focusedSeriesId;
      const seriesIsDefocused = !seriesIsFocused && focusedSeriesId !== null;
      const seriesFocusPercentage = getSeriesFocusPercentage(seriesConfig, seriesAxisFocusPercentages, seriesFocusPercentages);
      if (!adjustForSuppression || !(seriesIsSuppressed && tooltipConfig.hideSuppressed)) {
        let seriesColorSpan = (
          <SeriesColorIcon seriesContextConfig={tooltipConfig} seriesConfig={seriesConfig} focused={seriesIsFocused} defocused={seriesIsDefocused}
                           focusPercentage={seriesFocusPercentage} colorPaletteConfig={colorPaletteConfig} seriesIndex={seriesIndex}
                           svgUniqueId={svgUniqueId + '-tooltip'} seriesShowColorProperty='showColorInTooltip'
                           seriesIsSuppressed={seriesIsSuppressed} iconClassName={mochartCssClasses['tooltipLineIcon']}
                           visible={visible} renderHTML={true}/>
        );
        let valueFormat = valueFormats[seriesId];
        let { labelText, valueText } = getSeriesText(tooltipConfig, seriesConfig, valueFormat, series, adjustForSuppression);
        if (valueText !== null) {
          let line = false;
          if (tooltipConfig.alignValues) {
            line = (
              <div style={alignedLineStyle}>
              <span style={{ float: 'left' }}>
                {seriesColorSpan}
                <span className={mochartCssClasses['tooltipLineLabel']}>{labelText}</span>
              </span>
                <span style={{ float: 'left', width: 2, height: 4}}></span>
                <span className={mochartCssClasses['tooltipLineValue']} style={{ float: 'right' }}>{valueText}</span>
              </div>
            );
          }
          else {
            line = (
              <span className={mochartCssClasses['tooltipLineIcon']}>
              {seriesColorSpan}
                <span className={mochartCssClasses['tooltipLineText']}>{labelText + valueText}</span>
            </span>
            );
          }

          tooltipLines.push(
            <div key={'series-' + seriesId} className={mochartCssClasses['tooltipSeriesLine']+seriesId} style={seriesIndex === seriesConfigs.length-1 ? lastLineStyle : lineStyle}
                 onMouseEnter={(event) => this.onSeriesMouseEnter(event, seriesId)}
                 onMouseLeave={(event) => this.onSeriesMouseLeave(event)}
                 onClick={(event) => this.onSeriesClick(event, seriesId)}>
              {line}
            </div>
          );
        }
      }
    }

    return (
      <div className={mochartCssClasses['tooltipContent']} onClick={this.onClick}>
        <div className={mochartCssClasses['tooltipControls']}>
          {tooltipControls}
        </div>
        <div className={mochartCssClasses['tooltipLines']} style={{ clear: 'both' }}>
          {tooltipLines}
        </div>
      </div>
    );
  }
}
