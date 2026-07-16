import { getDomainExtent } from './DomainData';
import { AUTO, NONE, TYPE_DATE } from '../config/core/constants';

export function getAxisDomain(axisConfig, axisDomainCalculator) {
  let axisDomain = getAxisDomainWithMinAndMax(axisConfig, axisDomainCalculator);
  adjustAxisDomainForOffsets(axisConfig, axisDomain);
  return axisDomain;
}

function getAxisDomainWithMinAndMax(axisConfig, axisDomainCalculator) {
  const { min, max, base } = axisConfig;
  let axisDomain = [null, null];
  let valueCreator = getAxisValueCreator(axisConfig);
  if (min !== AUTO && max !== AUTO) {
    axisDomain[0] = valueCreator(min);
    axisDomain[1] = valueCreator(max);
  }
  else {
    axisDomain = axisDomainCalculator();
    if (min === AUTO) {
      const { softMin } = axisConfig;
      if (softMin !== NONE && (axisDomain[0] === null || axisDomain[0] > valueCreator(softMin))) {
        axisDomain[0] = valueCreator(softMin);
      }
    }
    else {
      axisDomain[0] = valueCreator(min);
    }
    if (max === AUTO) {
      const { softMax } = axisConfig;
      if (softMax !== NONE && (axisDomain[1] === null || axisDomain[1] < valueCreator(softMax))) {
        axisDomain[1] = valueCreator(softMax);
      }
    }
    else {
      axisDomain[1] = valueCreator(max);
    }
    const axisExtent = getDomainExtent(axisDomain);
    if (axisExtent > 0) {
      const { minMarginPercent, maxMarginPercent } = axisConfig;
      if (min === AUTO && (base === NONE || axisDomain[0] !== base) && minMarginPercent > 0) {
        axisDomain[0] = axisDomain[0] - minMarginPercent * axisExtent;
      }
      if (max === AUTO && (base === NONE || axisDomain[1] !== base) && maxMarginPercent > 0) {
        axisDomain[1] = axisDomain[1] + maxMarginPercent * axisExtent;
      }
    }
  }
  return axisDomain;
}

function adjustAxisDomainForOffsets(axisConfig, axisDomain) {
  const { min, minOffset, max, maxOffset } = axisConfig;
  if (min === AUTO && minOffset !== 0) {
    axisDomain[0] = adjustAxisValue(axisConfig, axisDomain[0], minOffset);
  }
  if (max === AUTO && maxOffset !== 0) {
    axisDomain[1] = adjustAxisValue(axisConfig, axisDomain[1], maxOffset);
  }
}

function getDefaultAxisValue(axisConfig) {
  return axisConfig.type === TYPE_DATE ? new Date(0) : 0;
}

function getAxisValueCreator(axisConfig) {
  return axisConfig.type === TYPE_DATE ? (v) => new Date(v) : (v) => v;
}

function adjustAxisValue(axisConfig, value, adjustment) {
  return axisConfig.type === TYPE_DATE ? new Date(value.getTime() + adjustment) : value + adjustment;
}