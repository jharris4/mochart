import { Renderer, svgEl, textEl, Slot } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { layoutInfoExtentChanged } from '../layout/LayoutInfo';
import { prepareTruncation, getTruncatedText, updateTruncation } from '../utils/TextTruncation';
import { NONE } from '../config/core/constants';
import { onClickDisabled, centerTextY, translate, translateObject } from '../utils/utils';
import { getClipPathReference } from '../utils/svgUtils';
import { styleToAttributes } from '../utils/style';
import { getSpacingWidth } from '../layout/SpacingLayoutInfo';
import Background from './Background';
import type { El, TextEl } from '../render';
import type { Style } from '../types/config';
import type { EnhancedMochartConfig } from '../types/enhanced';
import type { SpacingLayoutInfo } from '../types/layout';
import type { TruncationDataValue } from '../utils/TextTruncation';

type TitleSectionKey = 'titlePrefix' | 'titleText' | 'titleTextRaw' | 'titleSuffix';
type TitleBackgroundKey = 'titlePrefixBackground' | 'titleTextBackground' | 'titleSuffixBackground';
interface TitleSection {
  root: El;
  backgroundSlot: Slot;
  clipGroup: El;
  text: El;
  value: TextEl;
}
interface TitleProps {
  mochartConfig: EnhancedMochartConfig;
  titleLayoutInfo: SpacingLayoutInfo;
  titlePrefixLayoutInfo: SpacingLayoutInfo;
  titleTextLayoutInfo: SpacingLayoutInfo;
  titleTextRawLayoutInfo: SpacingLayoutInfo;
  titleSuffixLayoutInfo: SpacingLayoutInfo;
  titleClipPathUniqueId: string;
  accessibility: boolean;
  onClick?: () => void;
}
interface TitleState { truncationData: TruncationDataValue }

export default class Title extends Renderer<TitleProps, TitleState> {
  root = svgEl('g');
  background = this.slot(this.root);
  wrapper = this.elSlot(this.root);
  truncationData: TruncationDataValue = null;
  checkTruncation = false;
  sections: Partial<Record<TitleSectionKey, TitleSection>> = {};

  constructor() {
    super();
    this.state = { truncationData: null };
    this.truncationData = null;
    this.checkTruncation = false;
    this.sections = {};
  }

  chartTitleClick = () => {
    const { onClick } = this.props;
    if (onClick) {
      onClick();
    }
  }

  onKeyDown = (event: Event) => {
    const { key } = event as KeyboardEvent;
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      this.chartTitleClick();
    }
  }

  derive(props: TitleProps, _state: TitleState, prevProps: TitleProps | null): Partial<TitleState> | null {
    if (prevProps === null) {
      this.checkTruncation = props.mochartConfig.title.truncationEnabled;
      return null;
    }
    const { mochartConfig, titleLayoutInfo, titleTextLayoutInfo, titleTextRawLayoutInfo } = props;
    const { title: titleConfig } = mochartConfig;
    const truncationEnabled = titleConfig.text !== NONE && titleConfig.truncationEnabled;
    const truncationChanged = truncationEnabled &&
      (layoutInfoExtentChanged(prevProps.titleTextLayoutInfo, titleTextLayoutInfo) || layoutInfoExtentChanged(prevProps.titleTextRawLayoutInfo, titleTextRawLayoutInfo));
    const titleChanged = prevProps.mochartConfig.title.text !== titleConfig.text;
    const truncationFinished = titleTextLayoutInfo.width === titleTextRawLayoutInfo.width && titleLayoutInfo.default !== true;
    if (titleChanged || truncationFinished) {
      this.truncationData = null;
    }
    const { checkTruncation, truncationData } = prepareTruncation(truncationEnabled, truncationChanged, this.truncationData);
    this.truncationData = truncationData;
    if (this.checkTruncation === false && checkTruncation === true) {
      this.checkTruncation = true;
    }
    return { truncationData };
  }

  create() {
    return this.root.node;
  }

  /** One prefix/text/raw/suffix block: g[style] > [Background?, g[clipPath] > text]. Built once, reused. */
  getSection(titleKey: TitleSectionKey): TitleSection {
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

  syncSection(wrapperEl: El, titleKey: TitleSectionKey, titleBackgroundKey: TitleBackgroundKey, titleValue: string | null, titleSectionLayoutInfo: SpacingLayoutInfo, backgroundStyle: Style, textStyle: Style, visible: boolean, clipPath: string | null = null): void {
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
      section.text.set({ ...styleToAttributes(textStyle), className: mochartCssClasses[titleKey], dy, transform });
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
    const { mochartConfig, titleLayoutInfo, titlePrefixLayoutInfo, titleTextLayoutInfo, titleTextRawLayoutInfo, titleSuffixLayoutInfo, titleClipPathUniqueId, accessibility, onClick } = this.props;
    const { title: titleConfig } = mochartConfig;

    if (titleConfig.text !== NONE) {
      const { text: title, prefix: titlePrefix, suffix: titleSuffix, truncationEnabled, truncationValue, link, linkDisabled,
        textBackgroundStyle: titleBackgroundStyle, textStyle: titleTextStyle,
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
      // a clickable title is a control, so it needs button semantics; a linked title already has them
      const interactive = accessibility && onClick !== undefined && !link;
      this.root.set({ className: mochartCssClasses['title'], transform: titleTransform,
        onClick: onClick !== undefined ? this.chartTitleClick : null,
        tabindex: interactive ? '0' : null,
        role: interactive ? 'button' : null,
        ariaLabel: interactive ? [titlePrefix, title, titleSuffix].filter(Boolean).join(' ') : null,
        onKeyDown: interactive ? this.onKeyDown : null,
        cursor: interactive ? 'pointer' : null });
      this.background.set(Background, { config: titleConfig, classKey: 'titleBackground', spacingRelative: true, spacingLayoutInfo: titleLayoutInfo });

      let wrapperEl: El;
      if (link) {
        const onLinkClick = linkDisabled ? onClickDisabled : null;
        wrapperEl = this.wrapper.set('a', () => svgEl('a'))!;
        // an svg <a href> is natively focusable, so a decorative chart has to opt it out by hand
        wrapperEl.set({ href: link, onClick: onLinkClick, transform: titleSpacingTransform,
          tabindex: mochartConfig.accessibility.hidden ? '-1' : null });
      }
      else {
        wrapperEl = this.wrapper.set('g', () => svgEl('g'))!;
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

  measure() {
    this.refreshTruncation();
  }

  refreshTruncation() {
    if (this.checkTruncation && this.present) {
      const domElement = this.root.node.querySelector<SVGTextContentElement>(getTitleTextCssSelector());
      const { mochartConfig, titleTextLayoutInfo } = this.props;
      const { title: titleConfig } = mochartConfig;
      const { width } = titleTextLayoutInfo;
      const { text: title, truncationValue, textMargin, textPadding } = titleConfig;
      const maxLength = Math.max(width - getSpacingWidth(textMargin, textPadding), 0);
      const { checkTruncation, truncationData } = updateTruncation(truncationValue, this.state.truncationData, title!, maxLength, domElement);
      // fields must be written before setState: its commit flush runs the next measure pass synchronously
      this.truncationData = truncationData;
      this.checkTruncation = checkTruncation;
      if (checkTruncation) {
        this.setState({ truncationData });
      }
    }
  }

  destroy(removeDom = true) {
    for (const titleKey of Object.keys(this.sections) as TitleSectionKey[]) {
      this.sections[titleKey]!.backgroundSlot.destroy(false);
    }
    super.destroy(removeDom);
  }
}

function getTitleTextCssSelector() {
  return '.' + mochartCssClasses['titleText'];
}
