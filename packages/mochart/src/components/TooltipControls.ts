import { Renderer, htmlEl, textEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import type { EnhancedMochartConfig } from '../types/enhanced';
import type { InternalFocus } from '../types/chart';

interface TooltipControlsProps {
  mochartConfig: EnhancedMochartConfig;
  categoryCount: number;
  focusedCategoryIndex: number;
  tooltipCategoryIndex: number;
  onFocus: (focus: InternalFocus) => void;
  updateTooltipCategoryIndex: (categoryIndex: number) => void;
  toggleMode: () => void;
  mode: string;
  minWidth?: number | null;
}

const buttonWidth = 35;

export default class TooltipControls extends Renderer<TooltipControlsProps> {
  root = htmlEl('div');
  prevContainer = htmlEl('div');
  prevButton = htmlEl('button');
  modeContainer = htmlEl('div');
  modeButton = htmlEl('button');
  modeText = textEl();
  nextContainer = htmlEl('div');
  nextButton = htmlEl('button');

  onCategoryPrevClick = (event: Event) => {
    const { mochartConfig, tooltipCategoryIndex, onFocus, updateTooltipCategoryIndex } = this.props;
    event.stopPropagation();
    if (tooltipCategoryIndex > 0) {
      const categoryIndex = tooltipCategoryIndex - 1;
      if (mochartConfig.tooltip.applyFocus) {
        onFocus({ categoryIndex });
      }
      updateTooltipCategoryIndex(categoryIndex);
    }
  }

  onCategoryNextClick = (event: Event) => {
    const { mochartConfig, categoryCount, tooltipCategoryIndex, onFocus, updateTooltipCategoryIndex } = this.props;
    event.stopPropagation();
    if (tooltipCategoryIndex >= 0 && tooltipCategoryIndex < categoryCount - 1) {
      const categoryIndex = tooltipCategoryIndex + 1;
      if (mochartConfig.tooltip.applyFocus) {
        onFocus({ categoryIndex });
      }
      updateTooltipCategoryIndex(categoryIndex);
    }
  }

  onTooltipModeClick = (event: Event) => {
    event.stopPropagation();
    const { toggleMode } = this.props;
    toggleMode();
  }

  create() {
    this.prevButton.append(textEl('p'));
    this.prevContainer.append(this.prevButton);
    this.modeButton.append(this.modeText);
    this.modeContainer.append(this.modeButton);
    this.nextButton.append(textEl('n'));
    this.nextContainer.append(this.nextButton);
    this.root.append(this.prevContainer, this.modeContainer, this.nextContainer);
    return this.root.node;
  }

  sync() {
    const { mochartConfig, minWidth, mode } = this.props;
    if (mochartConfig.tooltip.showControls) {
      const modeWidth = 'calc(100% - ' + (buttonWidth * 2) + 'px)';
      const controlsStyle: Record<string, string | number> = {
        float: 'left',
        clear: 'both',
        width: '100%'
      };
      if (minWidth != null) {
        controlsStyle.width = minWidth;
        controlsStyle.minWidth = minWidth;
      }

      this.setPresent(true);
      this.root.set({ className: mochartCssClasses['tooltipControls'], style: controlsStyle });
      this.prevContainer.set({ style: { float: 'left', minWidth: buttonWidth, width: buttonWidth }, onClick: this.onCategoryPrevClick });
      this.prevButton.set({ style: { width: '100%' } });
      this.modeContainer.set({ style: { float: 'left', minWidth: modeWidth, width: modeWidth }, onClick: this.onTooltipModeClick });
      this.modeButton.set({ style: { width: '100%' } });
      this.modeText.set(mode);
      this.nextContainer.set({ style: { float: 'right', minWidth: buttonWidth, width: buttonWidth }, onClick: this.onCategoryNextClick });
      this.nextButton.set({ style: { width: '100%' } });
    }
    else {
      this.setPresent(false);
    }
  }
}
