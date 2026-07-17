export interface TruncationData {
  text: string;
  truncatedText?: string;
  lastText?: string;
}

export type TruncationDataValue = TruncationData | TruncationData[] | null;

function resetTruncationData(truncationData: TruncationData): TruncationData {
  return { ...truncationData, lastText: void 0 };
}

export function prepareTruncation(truncationEnabled: boolean, truncationChanged: boolean, oldTruncationData: TruncationDataValue, integrityChanged = true) {
  let truncationData: TruncationDataValue = null;
  let checkTruncation = truncationEnabled && (truncationChanged || oldTruncationData === null);
  if (truncationEnabled) {
    if (truncationChanged) {
      if (oldTruncationData !== null && integrityChanged) {
        truncationData = Array.isArray(oldTruncationData) ? oldTruncationData.map(td => resetTruncationData(td)) : resetTruncationData(oldTruncationData);
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

export function truncateSVGText(textElement: SVGTextContentElement, maxTextLength: number, _truncationText: string, truncationData: TruncationData): TruncationData {
  let { text, truncatedText = text, lastText } = truncationData;
  if (text.length === 0) {
    return {
      text,
      truncatedText: text,
      lastText: text
    }
  }
  else if (lastText !== void 0 && truncatedText === lastText) {
    return truncationData;
  }
  let textLength = textElement.getComputedTextLength();
  if (textLength > maxTextLength) {
    if (lastText === void 0) {
      let initialTruncatedLength = Math.min(text.length -1, Math.floor((maxTextLength / textLength) * text.length));
      return {
        text,
        truncatedText: text.substr(0, initialTruncatedLength),
        lastText: text
      };
    }
    else {
      return {
        text,
        truncatedText: truncatedText.substr(0, truncatedText.length-1),
        lastText: truncatedText
      };
    }
  }
  else if (textLength <= maxTextLength) {
    if (lastText === void 0 && truncatedText === void 0) {
      return {
        text,
        truncatedText: text,
        lastText: text
      }
    }
    else {
      if (lastText === void 0 || lastText.length < truncatedText.length ) {
        return {
          text,
          truncatedText: text.substr(0, truncatedText.length+1),
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
