// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { layoutInfoExtentChanged } from '../layout/LayoutInfo';
import { prepareTruncation, getTruncatedText, updateTruncation } from '../utils/TextTruncation';
import { getClipPathReference } from '../utils/svgUtils';
import { getAxisFocusColor, getAxisFocusOpacity } from '../utils/FocusValue';
import { NONE } from '../config/core/constants';
import Background from './Background';

export default class AxisTitle extends PureComponent {

  constructor(props) {
    super(props);

    // refs created on render
    this.titleRef = null;

    this.state = { truncationData: null };
    this.truncationData = null;
    this.checkTruncation = props.axisConfig.titleTruncationEnabled;
  }

  componentWillReceiveProps(nextProps) {
    const { axisConfig, axisLayoutInfo } = nextProps;
    const truncationEnabled = axisConfig.title !== NONE && axisConfig.titleTruncationEnabled;
    const truncationChanged = truncationEnabled && layoutInfoExtentChanged(this.props.axisLayoutInfo, axisLayoutInfo);
    if (this.props.axisConfig.title !== axisConfig.title) {
      this.truncationData = null;
    }
    const { checkTruncation, truncationData } = prepareTruncation(truncationEnabled, truncationChanged, this.truncationData);

    this.setState({ truncationData });
    this.truncationData = truncationData;
    if (this.checkTruncation === false && checkTruncation === true) {
      this.checkTruncation = true;
    }
  }

  setTitleRef = (ref) => {
    this.titleRef = ref;
  }

  render() {
    const { axisConfig } = this.props;
    if (axisConfig.title !== NONE) {
      const { axisLayoutInfo, titleClipPathUniqueId, axisFocusPercentage, seriesFocusPercentage } = this.props;
      const { truncationData } = this.state;
      const title = getTruncatedText(axisConfig.titleTruncationEnabled, axisConfig.titleTruncationValue, axisConfig.title, truncationData);

      const titleTextDY = '0.35em'; // more or less centers the text vertically http://stackoverflow.com/questions/12250403/vertical-alignment-of-text-element-in-svg
      const titleTextAnchor = 'middle';
      const { titleTextX, titleTextY, titleTextAngle } = axisLayoutInfo;
      const titleTextTransform = 'translate(' + Math.floor(titleTextX) + ',' + Math.floor(titleTextY) + ') rotate(' + titleTextAngle + ')';

      const clipPath = axisConfig.titleTruncationEnabled ? getClipPathReference(titleClipPathUniqueId) : null;

      const stroke = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
        axisConfig.titleStrokeColor, axisConfig.titleFocusedStrokeColor, axisConfig.titleDefocusedStrokeColor);
      const fill = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
        axisConfig.titleFillColor, axisConfig.titleFocusedFillColor, axisConfig.titleDefocusedFillColor);
      const strokeOpacity = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
        axisConfig.titleStrokeOpacity, axisConfig.titleFocusedStrokeOpacity, axisConfig.titleDefocusedStrokeOpacity);
      const fillOpacity = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
        axisConfig.titleFillOpacity, axisConfig.titleFocusedFillOpacity, axisConfig.titleDefocusedFillOpacity);

      return (
        <g className={mochartCssClasses['axisTitle']} clipPath={clipPath} ref={this.setTitleRef}>
          <Background config={axisConfig} configStyleKey={'titleBackgroundStyle'} classKey='axisTitleBackground' spacingRelative={false} spacingLayoutInfo={axisLayoutInfo.titleLayoutInfo} />
          <text transform={titleTextTransform} textAnchor={titleTextAnchor} dy={titleTextDY}
                stroke={stroke} strokeOpacity={strokeOpacity}
                fill={fill} fillOpacity={fillOpacity} strokeWidth={axisConfig.titleStrokeWidth}>
            {title}
          </text>
        </g>
      );
    }
    return false;
  }

  componentDidUpdate() {
    if (this.checkTruncation && this.titleRef) {
      const domElement = this.titleRef.querySelector(getAxisTitleCssSelector());
      const { axisConfig, axisLayoutInfo } = this.props;
      let maxLength = axisLayoutInfo.vertical ? axisLayoutInfo.height : axisLayoutInfo.width;
      const { title, titleTruncationValue } = axisConfig;
      const { checkTruncation, truncationData } = updateTruncation(titleTruncationValue, this.state.truncationData, title, maxLength, domElement);
      if (checkTruncation) {
        this.setState({ truncationData });
        this.truncationData = truncationData;
      }
      this.checkTruncation = checkTruncation;
    }
  }
}

function getAxisTitleCssSelector() {
  return 'text';
}
