import { getDomainExtent } from './DomainData';
import { AUTO, NONE, TYPE_DATE } from '../config/core/constants';
import type { AxisConfigBase } from '../types/config';
import type { DataType } from '../config/core/constants';
import type { DomainValue, GroupAxisDomain } from '../types/data';

type AxisDomainConfig = AxisConfigBase & {
  type: DataType;
  base?: number | null;
  minMarginPercent?: number;
  maxMarginPercent?: number;
};
type AxisDomainCalculator = () => GroupAxisDomain;

export function getAxisDomain(axisConfig: AxisDomainConfig, axisDomainCalculator: AxisDomainCalculator): GroupAxisDomain {
  const axisDomain = getAxisDomainWithMinAndMax(axisConfig, axisDomainCalculator);
  adjustAxisDomainForOffsets(axisConfig, axisDomain);
  return axisDomain;
}

function getAxisDomainWithMinAndMax(axisConfig: AxisDomainConfig, axisDomainCalculator: AxisDomainCalculator): GroupAxisDomain {
  const { min, max, base = null } = axisConfig;
  let axisDomain: GroupAxisDomain = [null, null];
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
    const axisExtent = getDomainExtent(axisDomain);
    if (axisExtent > 0) {
      const { minMarginPercent = 0, maxMarginPercent = 0 } = axisConfig;
      if (min === AUTO && axisDomain[0] !== null && (base === NONE || axisDomain[0] !== base) && minMarginPercent > 0) {
        axisDomain[0] = adjustAxisValue(axisConfig, axisDomain[0], -minMarginPercent * axisExtent);
      }
      if (max === AUTO && axisDomain[1] !== null && (base === NONE || axisDomain[1] !== base) && maxMarginPercent > 0) {
        axisDomain[1] = adjustAxisValue(axisConfig, axisDomain[1], maxMarginPercent * axisExtent);
      }
    }
  }
  return axisDomain;
}

function adjustAxisDomainForOffsets(axisConfig: AxisDomainConfig, axisDomain: GroupAxisDomain): void {
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
