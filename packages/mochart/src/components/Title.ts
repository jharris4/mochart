// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl, textEl, Slot } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { layoutInfoExtentChanged } from '../layout/LayoutInfo';
import { prepareTruncation, getTruncatedText, updateTruncation } from '../utils/TextTruncation';
import { NONE } from '../config/core/constants';
import { onClickDisabled, centerTextY, translate, translateObject } from '../utils/utils';
import { getClipPathReference } from '../utils/svgUtils';
import { getSpacingWidth } from '../layout/SpacingLayoutInfo';
import Background from './Background';

export default class Title extends Renderer {
  root = svgEl('g');
  background = this.slot(this.root);
  wrapper = this.elSlot(this.root);

  constructor() {
    super();
    this.state = { truncationData: null };
    this.truncationData = null;
    this.checkTruncation = false;
    this.sections = {};
  }

  willMount() {
    this.checkTruncation = this.props.mochartConfig.titleConfig.truncationEnabled;
  }

  chartTitleClick = () => {
    const { onClick } = this.props;
    if (onClick) {
      onClick();
    }
  }

  willReceiveProps(nextProps) {
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

  create() {
    return this.root.node;
  }

  /** One prefix/text/raw/suffix block: g[style] > [Background?, g[clipPath] > text]. Built once, reused. */
  getSection(titleKey) {
    let section = this.sections[titleKey];
    if (section === undefined) {
      const root = svgEl('g');
      const backgroundSlot = new Slot(root.node, null);
      const clipGroup = svgEl('g');
      const text = svgEl('text');
      const value = textEl();
      text.append(value);
      clipGroup.append(text);
      root.append(clipGroup);
      section = this.sections[titleKey] = { root, backgroundSlot, clipGroup, text, value };
    }
    return section;
  }

  syncSection(wrapperEl, titleKey, titleBackgroundKey, titleValue, titleSectionLayoutInfo, backgroundStyle, textStyle, visible, clipPath = null) {
    if (titleValue) {
      const section = this.getSection(titleKey);
      const { paddingBounds } = titleSectionLayoutInfo;
      const { dy, transform } = centerTextY(paddingBounds);

      const containerStyle = visible ? null : { visibility: 'hidden' };

      section.root.set({ style: containerStyle });
      if (visible) {
        section.backgroundSlot.set(Background, { config: { backgroundStyle }, classKey: titleBackgroundKey, spacingRelative: false, spacingLayoutInfo: titleSectionLayoutInfo });
      }
      else {
        section.backgroundSlot.set(null);
      }
      section.clipGroup.set({ clipPath });
      section.text.set({ ...textStyle, className: mochartCssClasses[titleKey], dy, transform });
      section.value.set(titleValue);
      wrapperEl.node.appendChild(section.root.node);
    }
    else {
      const section = this.sections[titleKey];
      if (section !== undefined && section.root.node.parentNode) {
        section.root.node.parentNode.removeChild(section.root.node);
      }
    }
  }

  sync() {
    const { mochartConfig, titleLayoutInfo, titlePrefixLayoutInfo, titleTextLayoutInfo, titleTextRawLayoutInfo, titleSuffixLayoutInfo, titleClipPathUniqueId } = this.props;
    const { titleConfig } = mochartConfig;

    if (titleConfig.title !== NONE) {
      const { title, titlePrefix, titleSuffix, truncationEnabled, truncationValue, link, linkDisabled,
        textMargin, textPadding, titleBackgroundStyle, titleTextStyle,
        prefixBackgroundStyle, prefixTextStyle,
        suffixBackgroundStyle, suffixTextStyle
      } = titleConfig;

      const { truncationData } = this.state;
      const titleText = getTruncatedText(truncationEnabled, truncationValue, title, truncationData);

      const titleTransform = translateObject(titleLayoutInfo);
      const { paddingRelativeBounds } = titleLayoutInfo;
      const titleSpacingTransform = translate(0, paddingRelativeBounds.y);

      const clipPath = truncationEnabled ? getClipPathReference(titleClipPathUniqueId) : null;

      this.setPresent(true);
      this.root.set({ className: mochartCssClasses['title'], transform: titleTransform, onClick: this.chartTitleClick });
      this.background.set(Background, { config: titleConfig, classKey: 'titleBackground', spacingRelative: true, spacingLayoutInfo: titleLayoutInfo });

      let wrapperEl;
      if (link) {
        const onLinkClick = linkDisabled ? onClickDisabled : null;
        wrapperEl = this.wrapper.set('a', () => svgEl('a'));
        wrapperEl.set({ href: link, onClick: onLinkClick, transform: titleSpacingTransform });
      }
      else {
        wrapperEl = this.wrapper.set('g', () => svgEl('g'));
        wrapperEl.set({ transform: titleSpacingTransform });
      }

      // (re-)append in order; appendChild moves already-attached nodes
      this.syncSection(wrapperEl, 'titlePrefix', 'titlePrefixBackground',
        titlePrefix, titlePrefixLayoutInfo, prefixBackgroundStyle, prefixTextStyle, true);
      this.syncSection(wrapperEl, 'titleText', 'titleTextBackground',
        titleText, titleTextLayoutInfo, titleBackgroundStyle, titleTextStyle, true, clipPath);
      this.syncSection(wrapperEl, 'titleTextRaw', 'titleTextBackground',
        title, titleTextRawLayoutInfo, titleBackgroundStyle, titleTextStyle, false);
      this.syncSection(wrapperEl, 'titleSuffix', 'titleSuffixBackground',
        titleSuffix, titleSuffixLayoutInfo, suffixBackgroundStyle, suffixTextStyle, true);
    }
    else {
      this.setPresent(false);
    }
  }

  didMount() {
    this.refreshTruncation();
  }

  didUpdate() {
    this.refreshTruncation();
  }

  refreshTruncation() {
    if (this.checkTruncation && this.present) {
      const domElement = this.root.node.querySelector(getTitleTextCssSelector());
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

  destroy(removeDom = true) {
    for (const titleKey in this.sections) {
      this.sections[titleKey].backgroundSlot.destroy(false);
    }
    super.destroy(removeDom);
  }
}

function getTitleTextCssSelector() {
  return '.' + mochartCssClasses['titleText'];
}
