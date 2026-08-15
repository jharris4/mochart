export interface TruncationData {
  text: string;
  truncatedText?: string;
  lastText?: string;
}

export type TruncationDataValue = TruncationData | TruncationData[] | null;

function resetTruncationData(truncationData: TruncationData): TruncationData {
  return { ...truncationData, lastText: undefined };
}

// Fresh untruncated entry when the text itself changed, plain reset otherwise.
function refreshTruncationData(truncationData: TruncationData, newText: string | undefined): TruncationData {
  if (newText !== undefined && newText !== truncationData.text) {
    return { text: newText, truncatedText: newText };
  }
  return resetTruncationData(truncationData);
}

export function prepareTruncation(truncationEnabled: boolean, truncationChanged: boolean, oldTruncationData: TruncationDataValue, integrityChanged = true, newText?: string | string[]) {
  let truncationData: TruncationDataValue = null;
  const checkTruncation = truncationEnabled && (truncationChanged || oldTruncationData === null);
  if (truncationEnabled) {
    if (truncationChanged) {
      if (oldTruncationData !== null && integrityChanged) {
        truncationData = Array.isArray(oldTruncationData)
          ? oldTruncationData.map((td, i) => refreshTruncationData(td, (newText as string[] | undefined)?.[i]))
          : refreshTruncationData(oldTruncationData, newText as string | undefined);
      }
    }
    else {
      truncationData = oldTruncationData;
    }
  }
  return {
    truncationData,
    checkTruncation
  };
}

export function getTruncatedText(truncationEnabled: boolean, truncationValue: string, text: string, truncationData: TruncationDataValue): string;
export function getTruncatedText(truncationEnabled: boolean, truncationValue: string, text: string[], truncationData: TruncationDataValue): string[];
export function getTruncatedText(truncationEnabled: boolean, truncationValue: string, text: string | string[], truncationData: TruncationDataValue): string | string[] {
  if (truncationEnabled && truncationData !== null) {
    if (Array.isArray(text)) {
      let aTruncationData;
      text = text.map((aText, i) => {
        aTruncationData = (truncationData as TruncationData[])[i];
        if (aTruncationData.text !== aTruncationData.truncatedText) {
          aText = aTruncationData.truncatedText + truncationValue;
        }
        return aText;
      });
    }
    else {
      const singleTruncationData = truncationData as TruncationData;
      if (singleTruncationData.text !== singleTruncationData.truncatedText) {
        text = singleTruncationData.truncatedText + truncationValue;
      }
    }
  }
  return text;
}

export function updateTruncation(truncationValue: string, oldTruncationData: TruncationDataValue, text: string | string[], maxLength: number, domElement: SVGTextContentElement | ArrayLike<SVGTextContentElement> | null) {
  let truncationData: TruncationDataValue = oldTruncationData;
  let needsTruncation = false;
  let checkTruncation = true;
  if (Array.isArray(text)) {
    const newTruncationData: TruncationData[] = [];
    if (truncationData === null) {
      truncationData = text.map(aText => ({ text: aText }));
    }
    const domElements = domElement as ArrayLike<SVGTextContentElement>;
    if (domElements !== null && domElements.length > 0) {
      let aTruncateData;
      for (let i = 0; i < domElements.length; i++) {
        aTruncateData = truncateSVGText(domElements[i], maxLength, truncationValue, (truncationData as TruncationData[])[i]);
        if (aTruncateData.truncatedText !== aTruncateData.lastText) {
          needsTruncation = true;
        }
        newTruncationData.push(aTruncateData);
      }
      if (truncationData === null) {
        needsTruncation = true;
      }
      truncationData = newTruncationData;
    }
  }
  else {
    if (truncationData === null) {
      truncationData = { text: text };
    }
    if (domElement !== null) {
      truncationData = truncateSVGText(domElement as SVGTextContentElement, maxLength, truncationValue, truncationData as TruncationData);
      if (oldTruncationData === null || truncationData === null || truncationData.truncatedText !== truncationData.lastText) {
        needsTruncation = true;
      }
    }
  }
  if (!needsTruncation) {
    checkTruncation = false;
  }
  return {
    checkTruncation,
    truncationData
  };
}

export interface TruncationState { truncationData: TruncationDataValue }

interface TruncationHost {
  state: TruncationState;
  setState(update: Partial<TruncationState>): void;
}

/** The truncation state machine every text-truncating renderer runs: field copies of the data
 * and the check flag, kept ahead of renderer state so nested measure passes see the latest values. */
export class TruncationTracker {
  data: TruncationDataValue = null;
  check = false;

  /** derive() on mount: nothing to prepare yet, just whether measure should check at all */
  mount(enabled: boolean): null {
    this.check = enabled;
    return null;
  }

  /** derive() on update; `reset` drops the accumulated data first (text changed, or the layout settled) */
  prepare(enabled: boolean, changed: boolean, reset: boolean, integrityChanged = true, newText?: string | string[]): TruncationState {
    if (reset) {
      this.data = null;
    }
    const { checkTruncation, truncationData } = prepareTruncation(enabled, changed, this.data, integrityChanged, newText);
    this.data = truncationData;
    // latched, never cleared here: a props update landing mid-refinement must not cancel the pending check
    if (checkTruncation) {
      this.check = true;
    }
    return { truncationData };
  }

  /** measure(): one refinement step, re-rendering through setState while more are needed */
  update(host: TruncationHost, truncationValue: string, text: string | string[], maxLength: number, domElement: SVGTextContentElement | ArrayLike<SVGTextContentElement> | null): void {
    const { checkTruncation, truncationData } = updateTruncation(truncationValue, host.state.truncationData, text, maxLength, domElement);
    // fields must be written before setState: its commit flush runs the next measure pass synchronously
    this.data = truncationData;
    this.check = checkTruncation;
    if (checkTruncation) {
      host.setState({ truncationData });
    }
  }
}

// typed locally rather than from lib.esnext.intl, so the package's TS lib target is unaffected
interface GraphemeSegmenter {
  segment(text: string): Iterable<{ segment: string }>;
}

const segmenterIntl = Intl as unknown as {
  Segmenter?: new (locales: undefined, options: { granularity: 'grapheme' }) => GraphemeSegmenter;
};

const graphemeSegmenter: GraphemeSegmenter | null = typeof segmenterIntl.Segmenter === 'function'
  ? new segmenterIntl.Segmenter(undefined, { granularity: 'grapheme' })
  : null;

// user-perceived characters, never UTF-16 code units: the Array.from fallback still never splits a surrogate pair, and Intl.Segmenter also keeps modifiers and combining marks attached
function textUnits(text: string): string[] {
  return graphemeSegmenter === null
    ? Array.from(text)
    : Array.from(graphemeSegmenter.segment(text), segment => segment.segment);
}

function unitLength(text: string): number {
  return textUnits(text).length;
}

function sliceUnits(text: string, unitCount: number): string {
  return textUnits(text).slice(0, unitCount).join('');
}

export function truncateSVGText(textElement: SVGTextContentElement, maxTextLength: number, truncationText: string, truncationData: TruncationData): TruncationData {
  const { text, truncatedText = text, lastText } = truncationData;
  if (text.length === 0) {
    return {
      text,
      truncatedText: text,
      lastText: text
    }
  }
  else if (lastText !== undefined && truncatedText === lastText) {
    return truncationData;
  }
  const textLength = textElement.getComputedTextLength();
  if (textLength > maxTextLength) {
    if (lastText === undefined) {
      // ratio against what is actually rendered (truncatedText + suffix after a reset, not the full text)
      const renderedLength = truncatedText === text ? unitLength(text) : unitLength(truncatedText) + unitLength(truncationText);
      const initialTruncatedLength = Math.min(unitLength(text) - 1,
        Math.max(0, Math.floor((maxTextLength / textLength) * renderedLength) - unitLength(truncationText)));
      return {
        text,
        truncatedText: sliceUnits(text, initialTruncatedLength),
        lastText: text
      };
    }
    else {
      return {
        text,
        truncatedText: sliceUnits(truncatedText, unitLength(truncatedText) - 1),
        lastText: truncatedText
      };
    }
  }
  else if (textLength <= maxTextLength) {
    if (lastText === undefined && truncatedText === undefined) {
      return {
        text,
        truncatedText: text,
        lastText: text
      }
    }
    else {
      if (lastText === undefined || unitLength(lastText) < unitLength(truncatedText)) {
        return {
          text,
          truncatedText: sliceUnits(text, unitLength(truncatedText) + 1),
          lastText: truncatedText
        };
      }
      else {
        return {
          text,
          truncatedText,
          lastText: truncatedText
        };
      }
    }
  }
  return truncationData;
}
