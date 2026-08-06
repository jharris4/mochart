import { getDomainExtent } from './DomainData';
import { AUTO, NONE, TYPE_DATE } from '../config/core/constants';
import type { AxisConfigBase } from '../types/config';
import type { DataType } from '../config/core/constants';
import type { DomainValue, CategoryAxisDomain } from '../types/data';

type AxisDomainConfig = AxisConfigBase & {
  type: DataType;
  base?: number | null;
  minMarginFraction?: number;
  maxMarginFraction?: number;
};
type AxisDomainCalculator = () => CategoryAxisDomain;

export function getAxisDomain(axisConfig: AxisDomainConfig, axisDomainCalculator: AxisDomainCalculator): CategoryAxisDomain {
  const axisDomain = getAxisDomainWithMinAndMax(axisConfig, axisDomainCalculator);
  adjustAxisDomainForOffsets(axisConfig, axisDomain);
  return axisDomain;
}

function getAxisDomainWithMinAndMax(axisConfig: AxisDomainConfig, axisDomainCalculator: AxisDomainCalculator): CategoryAxisDomain {
  const { min, max, base = null } = axisConfig;
  let axisDomain: CategoryAxisDomain = [null, null];
  const valueCreator = getAxisValueCreator(axisConfig);
  if (min !== AUTO && max !== AUTO) {
    axisDomain[0] = valueCreator(min);
    axisDomain[1] = valueCreator(max);
  }
  else {
    axisDomain = axisDomainCalculator();
    if (min === AUTO) {
      const { softMin } = axisConfig;
      if (softMin !== NONE && (axisDomain[0] === null || comparableValue(axisDomain[0]) > comparableValue(valueCreator(softMin)))) {
        axisDomain[0] = valueCreator(softMin);
      }
    }
    else {
      axisDomain[0] = valueCreator(min);
    }
    if (max === AUTO) {
      const { softMax } = axisConfig;
      if (softMax !== NONE && (axisDomain[1] === null || comparableValue(axisDomain[1]) < comparableValue(valueCreator(softMax)))) {
        axisDomain[1] = valueCreator(softMax);
      }
    }
    else {
      axisDomain[1] = valueCreator(max);
    }
    // Empty data with a soft/fixed bound on one end only: collapse to keep the null-pair invariant.
    if (axisDomain[0] === null && axisDomain[1] !== null) {
      axisDomain[0] = axisDomain[1];
    }
    else if (axisDomain[1] === null && axisDomain[0] !== null) {
      axisDomain[1] = axisDomain[0];
    }
    const axisExtent = getDomainExtent(axisDomain);
    if (axisExtent > 0) {
      const { minMarginFraction = 0, maxMarginFraction = 0 } = axisConfig;
      if (min === AUTO && axisDomain[0] !== null && (base === NONE || axisDomain[0] !== base) && minMarginFraction > 0) {
        axisDomain[0] = adjustAxisValue(axisConfig, axisDomain[0], -minMarginFraction * axisExtent);
      }
      if (max === AUTO && axisDomain[1] !== null && (base === NONE || axisDomain[1] !== base) && maxMarginFraction > 0) {
        axisDomain[1] = adjustAxisValue(axisConfig, axisDomain[1], maxMarginFraction * axisExtent);
      }
    }
  }
  return axisDomain;
}

function adjustAxisDomainForOffsets(axisConfig: AxisDomainConfig, axisDomain: CategoryAxisDomain): void {
  const { min, minOffset, max, maxOffset } = axisConfig;
  if (min === AUTO && minOffset !== 0 && axisDomain[0] !== null) {
    axisDomain[0] = adjustAxisValue(axisConfig, axisDomain[0], minOffset);
  }
  if (max === AUTO && maxOffset !== 0 && axisDomain[1] !== null) {
    axisDomain[1] = adjustAxisValue(axisConfig, axisDomain[1], maxOffset);
  }
}

function comparableValue(value: DomainValue): number {
  return value instanceof Date ? value.getTime() : value;
}

function getAxisValueCreator(axisConfig: AxisDomainConfig): (value: number) => DomainValue {
  return axisConfig.type === TYPE_DATE ? (value: number) => new Date(value) : (value: number) => value;
}

function adjustAxisValue(axisConfig: AxisDomainConfig, value: DomainValue, adjustment: number): DomainValue {
  return axisConfig.type === TYPE_DATE
    ? new Date(comparableValue(value) + adjustment)
    : comparableValue(value) + adjustment;
}
