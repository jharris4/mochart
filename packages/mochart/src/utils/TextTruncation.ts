function resetTruncationData(truncationData) {
  return { ...truncationData, lastText: void 0 };
}

export function prepareTruncation(truncationEnabled, truncationChanged, oldTruncationData, integrityChanged = true) {
  let truncationData = null;
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

export function getTruncatedText(truncationEnabled, truncationValue, text, truncationData) {
  if (truncationEnabled && truncationData !== null) {
    if (Array.isArray(text)) {
      let aTruncationData;
      text = text.map((aText, i) => {
        aTruncationData = truncationData[i];
        if (aTruncationData.text !== aTruncationData.truncatedText) {
          aText = aTruncationData.truncatedText + truncationValue;
        }
        return aText;
      });
    }
    else {
      if (truncationData.text !== truncationData.truncatedText) {
        text = truncationData.truncatedText + truncationValue;
      }
    }
  }
  return text;
}

export function updateTruncation(truncationValue, oldTruncationData, text, maxLength, domElement) {
  let truncationData = oldTruncationData;
  let needsTruncation = false;
  let checkTruncation = true;
  if (Array.isArray(text)) {
    let newTruncationData = [];
    if (truncationData === null) {
      truncationData = text.map(aText => ({ text: aText }));
    }
    if (domElement.length > 0) {
      let aTruncateData;
      for (let i = 0; i < domElement.length; i++) {
        aTruncateData = truncateSVGText(domElement[i], maxLength, truncationValue, truncationData[i]);
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
      truncationData = truncateSVGText(domElement, maxLength, truncationValue, truncationData);
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

export function truncateSVGText(textElement, maxTextLength, truncationText, truncationData) {
  let { text, truncatedText, lastText } = truncationData;
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
}
