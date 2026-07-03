// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';

const buttonWidth = 35;

export default class TooltipControls extends PureComponent {
  static defaultProps = {
    minWidth: null
  };

  constructor(props) {
    super(props);
  }

  onGroupPrevClick = (event) => {
    const { mochartConfig, tooltipGroupIndex, onFocus, updateTooltipGroupIndex } = this.props;
    event.stopPropagation();
    if (tooltipGroupIndex > 0) {
      const groupIndex = tooltipGroupIndex - 1;
      if (mochartConfig.tooltipConfig.applyFocus) {
        onFocus({ groupIndex });
      }
      updateTooltipGroupIndex(groupIndex);
    }
  }

  onGroupNextClick = (event) => {
    const { mochartConfig, groupCount, tooltipGroupIndex, onFocus, updateTooltipGroupIndex } = this.props;
    event.stopPropagation();
    if (tooltipGroupIndex >= 0 && tooltipGroupIndex < groupCount -1) {
      const groupIndex = tooltipGroupIndex + 1;
      if (mochartConfig.tooltipConfig.applyFocus) {
        onFocus({ groupIndex });
      }
      updateTooltipGroupIndex(groupIndex);
    }
  }

  onTooltipModeClick = (event) => {
    event.stopPropagation();
    const { toggleMode } = this.props;
    toggleMode();
  }

  render() {
    const { mochartConfig, minWidth, mode } = this.props;
    if (mochartConfig.tooltipConfig.showControls) {
      let modeWidth = 'calc(100% - ' + (buttonWidth * 2) + 'px)';
      let prevButton = (
        <div style={{float: 'left', minWidth: buttonWidth, width: buttonWidth}} onClick={this.onGroupPrevClick}>
          <button style={{ width: '100%'}}>p</button>
        </div>
      );
      let modeButton = (
        <div style={{float: 'left', minWidth: modeWidth, width: modeWidth}} onClick={this.onTooltipModeClick}>
          <button style={{width: '100%'}}>{mode}</button>
        </div>
      );
      let nextButton = (
        <div style={{float: 'right', minWidth: buttonWidth, width: buttonWidth}} onClick={this.onGroupNextClick}>
          <button style={{ width: '100%'}}>n</button>
        </div>
      );
      let controlsStyle = {
        float: 'left',
        clear: 'both',
        width: '100%'
      };
      if (minWidth !== null) {
        controlsStyle.width = minWidth;
        controlsStyle.minWidth = minWidth;
      }
      return (
        <div className={mochartCssClasses['tooltipControls']} style={controlsStyle}>
          {prevButton}
          {modeButton}
          {nextButton}
        </div>
      );
    }
    return false;
  }
}