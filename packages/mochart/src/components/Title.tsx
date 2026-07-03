// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { layoutInfoExtentChanged } from '../layout/LayoutInfo';
import { prepareTruncation, getTruncatedText, updateTruncation } from '../utils/TextTruncation';
import { NONE } from '../config/core/constants';
import { onClickDisabled, centerTextY, translate, translateObject } from '../utils/utils';
import { getClipPathReference } from '../utils/svgUtils';
import { getSpacingWidth } from '../layout/SpacingLayoutInfo';
import Background from './Background';

function renderText(titleKey, titleBackgroundKey, titleValue, titleSectionLayoutInfo, textMargin, textPadding, backgroundStyle, textStyle, visible, clipPath = null) {
  if (titleValue) {
    const { paddingBounds } = titleSectionLayoutInfo;
    const { dy, transform } = centerTextY(paddingBounds);

    const containerStyle = visible ? null : { visibility: 'hidden' };

    const background = visible ? (
      <Background config={{ backgroundStyle }} classKey={titleBackgroundKey} spacingRelative={false} spacingLayoutInfo={titleSectionLayoutInfo} />
    ) : false;
    return (
      <g key={titleKey} style={containerStyle}>
        {background}
        <g clipPath={clipPath}>
          <text {...textStyle} key={titleKey} className={mochartCssClasses[titleKey]} dy={dy} transform={transform}>{titleValue}</text>
        </g>
      </g>
    );
  }
  return false;
}

export default class Title extends PureComponent {
  constructor(props) {
    super(props);

    // refs created on render
    this.titleRef = null;

    this.state = { truncationData: null };
    this.truncationData = null;
    this.checkTruncation = props.mochartConfig.titleConfig.truncationEnabled;
  }

  chartTitleClick = () => {
    const { onClick } = this.props;
    if (onClick) {
      onClick();
    }
  }

  componentWillReceiveProps(nextProps, nextState) {
    const { mochartConfig, titleLayoutInfo, titleTextLayoutInfo, titleTextRawLayoutInfo } = nextProps;
    const { titleConfig } = mochartConfig;
    const truncationEnabled = titleConfig.title !== NONE && titleConfig.truncationEnabled;
    const truncationChanged = truncationEnabled &&
      (layoutInfoExtentChanged(this.props.titleTextLayoutInfo, titleTextLayoutInfo) || layoutInfoExtentChanged(this.props.titleTextRawLayoutInfo, titleTextRawLayoutInfo));
    const titleChanged = this.props.mochartConfig.titleConfig.title !== titleConfig.title;
    const truncationFinished = titleTextLayoutInfo.width === titleTextRawLayoutInfo.width && titleLayoutInfo.default !== true;
    if (titleChanged || truncationFinished) {
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
    const { mochartConfig, titleLayoutInfo, titlePrefixLayoutInfo, titleTextLayoutInfo, titleTextRawLayoutInfo, titleSuffixLayoutInfo, titleClipPathUniqueId } = this.props;
    const { titleConfig } = mochartConfig;

    if (titleConfig.title !== NONE) {
      const { title, titlePrefix, titleSuffix, truncationEnabled, truncationValue, link, linkDisabled, margin, padding,
        textMargin, textPadding, titleBackgroundStyle, titleTextStyle,
        prefixMargin, prefixPadding, prefixBackgroundStyle, prefixTextStyle,
        suffixMargin, suffixPadding, suffixBackgroundStyle, suffixTextStyle
      } = titleConfig;

      const { truncationData } = this.state;
      const titleText = getTruncatedText(truncationEnabled, truncationValue, title, truncationData);

      const titleTransform = translateObject(titleLayoutInfo);
      const { paddingRelativeBounds } = titleLayoutInfo;
      const titleSpacingTransform = translate(0, paddingRelativeBounds.y);

      const clipPath = truncationEnabled ? getClipPathReference(titleClipPathUniqueId) : null;
      const titlePrefixContent = renderText('titlePrefix', 'titlePrefixBackground',
        titlePrefix, titlePrefixLayoutInfo, prefixMargin, prefixPadding, prefixBackgroundStyle, prefixTextStyle, true);
      const titleTextContent = renderText('titleText', 'titleTextBackground',
        titleText, titleTextLayoutInfo, textMargin, textPadding, titleBackgroundStyle, titleTextStyle, true, clipPath);
      const titleTextRawContent = renderText('titleTextRaw', 'titleTextBackground',
        title, titleTextRawLayoutInfo, textMargin, textPadding, titleBackgroundStyle, titleTextStyle, false);
      const titleSuffixContent = renderText('titleSuffix', 'titleSuffixBackground',
        titleSuffix, titleSuffixLayoutInfo, suffixMargin, suffixPadding, suffixBackgroundStyle, suffixTextStyle, true);

      let titleContent = [
        titlePrefixContent,
        titleTextContent,
        titleTextRawContent,
        titleSuffixContent
      ];

      if (link) {
        const onLinkClick = linkDisabled ? onClickDisabled : null;
        titleContent = (
          <a href={link} onClick={onLinkClick} transform={titleSpacingTransform}>
            {titleContent}
          </a>
        );
      }
      else {
        titleContent = (
          <g transform={titleSpacingTransform}>
            {titleContent}
          </g>
        );
      }

      return (
        <g className={mochartCssClasses['title']} transform={titleTransform} onClick={this.chartTitleClick} ref={this.setTitleRef}>
          <Background config={titleConfig} classKey='titleBackground' spacingRelative={true} spacingLayoutInfo={titleLayoutInfo} />
          {titleContent}
        </g>
      );
    }
    return false;
  }

  componentDidMount() {
    this.refreshTruncation();
  }

  componentDidUpdate() {
    this.refreshTruncation();
  }

  refreshTruncation() {
    if (this.checkTruncation && this.titleRef) {
      const domElement = this.titleRef.querySelector(getTitleTextCssSelector());
      const { mochartConfig, titleTextLayoutInfo } = this.props;
      const { titleConfig } = mochartConfig;
      const { width } = titleTextLayoutInfo;
      const { title, truncationValue, textMargin, textPadding } = titleConfig;
      const maxLength = Math.max(width - getSpacingWidth(textMargin, textPadding), 0);
      const { checkTruncation, truncationData } = updateTruncation(truncationValue, this.state.truncationData, title, maxLength, domElement);
      if (checkTruncation) {
        this.setState({ truncationData });
        this.truncationData = truncationData;
      }
      this.checkTruncation = checkTruncation;
    }
  }
}

function getTitleTextCssSelector() {
  return '.' + mochartCssClasses['titleText'];
}
