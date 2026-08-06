import { Renderer, svgEl, textEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { layoutInfoExtentChanged } from '../layout/LayoutInfo';
import { prepareTruncation, getTruncatedText, updateTruncation } from '../utils/TextTruncation';
import { getClipPathReference } from '../utils/svgUtils';
import { getAxisFocusStyle } from '../utils/FocusValue';
import { styleToAttributes } from '../utils/style';
import { NONE } from '../config/core/constants';
import Background from './Background';
import type { AxisConfigBase } from '../types/config';
import type { EnhancedValueAxisConfig } from '../types/enhanced';
import type { AxisLayoutInfo } from '../types/layout';
import type { FocusPercentage } from '../types/animation';
import type { TruncationDataValue } from '../utils/TextTruncation';

type AxisTitleConfig = AxisConfigBase & Partial<Pick<EnhancedValueAxisConfig, 'useSeriesFocus'>>;

interface AxisTitleProps {
  axisConfig: AxisTitleConfig;
  axisLayoutInfo: AxisLayoutInfo;
  titleClipPathUniqueId: string;
  axisFocusPercentage: FocusPercentage;
  seriesFocusPercentage: FocusPercentage;
}
interface AxisTitleState { truncationData: TruncationDataValue }

export default class AxisTitle extends Renderer<AxisTitleProps, AxisTitleState> {
  root = svgEl('g');
  background = this.slot(this.root);
  text = svgEl('text');
  textValue = textEl();
  truncationData: TruncationDataValue = null;
  checkTruncation = false;

  constructor() {
    super();
    this.state = { truncationData: null };
    this.truncationData = null;
    this.checkTruncation = false;
  }

  derive(props: AxisTitleProps, _state: AxisTitleState, prevProps: AxisTitleProps | null): Partial<AxisTitleState> | null {
    if (prevProps === null) {
      this.checkTruncation = props.axisConfig.titleTruncationEnabled;
      return null;
    }
    const { axisConfig, axisLayoutInfo } = props;
    const truncationEnabled = axisConfig.title !== NONE && axisConfig.titleTruncationEnabled;
    const truncationChanged = truncationEnabled && layoutInfoExtentChanged(prevProps.axisLayoutInfo, axisLayoutInfo);
    if (prevProps.axisConfig.title !== axisConfig.title) {
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
    this.text.append(this.textValue);
    this.root.append(this.text);
    return this.root.node;
  }

  sync() {
    const { axisConfig } = this.props;
    if (axisConfig.title !== NONE) {
      const { axisLayoutInfo, titleClipPathUniqueId, axisFocusPercentage, seriesFocusPercentage } = this.props;
      const { truncationData } = this.state;
      const title = getTruncatedText(axisConfig.titleTruncationEnabled, axisConfig.titleTruncationValue, axisConfig.title!, truncationData);

      const titleTextDY = '0.35em'; // more or less centers the text vertically http://stackoverflow.com/questions/12250403/vertical-alignment-of-text-element-in-svg
      const titleTextAnchor = 'middle';
      const { titleTextX, titleTextY, titleTextAngle } = axisLayoutInfo;
      const titleTextTransform = 'translate(' + Math.floor(titleTextX) + ',' + Math.floor(titleTextY) + ') rotate(' + titleTextAngle + ')';

      const clipPath = axisConfig.titleTruncationEnabled ? getClipPathReference(titleClipPathUniqueId) : null;

      const useSeriesFocus = axisConfig.useSeriesFocus ?? false;
      // destructured rather than spread whole: this attribute order is what the golden snapshots record
      const { stroke, strokeOpacity, strokeWidth, fill, fillOpacity } = styleToAttributes(
        getAxisFocusStyle(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, axisConfig.titleTextStyle));

      this.setPresent(true);
      this.root.set({ className: mochartCssClasses['axisTitle'], clipPath });
      this.background.set(Background, { config: axisConfig, configStyleKey: 'titleBackgroundStyle', classKey: 'axisTitleBackground', spacingRelative: false, spacingLayoutInfo: axisLayoutInfo.titleLayoutInfo });
      this.text.set({ transform: titleTextTransform, textAnchor: titleTextAnchor, dy: titleTextDY,
        stroke, strokeOpacity,
        fill, fillOpacity, strokeWidth });
      this.textValue.set(title);
    }
    else {
      this.setPresent(false);
    }
  }

  measure(prevProps: AxisTitleProps | null) {
    if (prevProps === null) {
      // truncation is only rechecked after updates; the initial sync renders untruncated
      return;
    }
    if (this.checkTruncation && this.present) {
      const domElement = this.root.node.querySelector<SVGTextContentElement>(getAxisTitleCssSelector());
      const { axisConfig, axisLayoutInfo } = this.props;
      const maxLength = axisLayoutInfo.vertical ? axisLayoutInfo.height : axisLayoutInfo.width;
      const { title, titleTruncationValue } = axisConfig;
      const { checkTruncation, truncationData } = updateTruncation(titleTruncationValue, this.state.truncationData, title!, maxLength, domElement);
      // fields must be written before setState: its commit flush runs the next measure pass synchronously
      this.truncationData = truncationData;
      this.checkTruncation = checkTruncation;
      if (checkTruncation) {
        this.setState({ truncationData });
      }
    }
  }
}

function getAxisTitleCssSelector() {
  return 'text';
}
