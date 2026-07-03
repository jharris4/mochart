import { mapMap } from '../utils/utils';

export const nullDomain = [null, null];

export function getGroupDomainForValues(values) { // since group values are never undefined, we don't need to check for that...
  let min = null;
  let max = null;
  let value;
  let i, valueCount = values.length;
  for (i=0; i<valueCount; i++) {
    value = values[i];
    if (min === null || value < min) {
      min = value;
    }
    if (max === null || value > max) {
      max = value;
    }
  };
  return [min, max];
}

export function getDomainForValues(values) {
  let min = null;
  let max = null;
  if (values !== null) {
    let value;
    let i, valueCount = values.length;
    for (i=0; i<valueCount; i++) {
      value = values[i];
      if (value !== void 0) {
        if (min === null || value < min) {
          min = value;
        }
        if (max === null || value > max) {
          max = value;
        }
      }
    }
  }
  return [min, max];
}

export function mergeDomain(domainA, domainB) {
  if (domainA[0] === null) { // if min is null, max is always null too
    return domainB;
  }
  if (domainB[0] === null) { // if min is null, max is always null too
    return domainA;
  }
  return [Math.min(domainA[0], domainB[0]), Math.max(domainA[1], domainB[1])];
}

export function getDomainExtent(domain) {
  if (domain[0] === domain[1]) {
    return 0;
  }
  else {
    return domain[1] - domain[0];
  }
}

export function getDomainExtents(domains) {
  return mapMap(domains, x => getDomainExtent(x));
}

// TODO - check if this is leading to unexpected marker / color / label behaviour
export function getSafeDomainExtent(domain) {
  return domain[0] !== domain[1] ? getDomainExtent(domain) : (domain[0] !== null ? domain[0] : 1);
}

export function getMaxDomain(domain, otherDomain) {
  if (domain[0] === null) { // if min is null, max is always null too
    return otherDomain;
  }
  else if (otherDomain[0] === null) { // if min is null, max is always null too
    return domain;
  }
  return [
    domain[0] < otherDomain[0] ? domain[0] : otherDomain[0], // works for date objects as well...
    domain[1] > otherDomain[1] ? domain[1] : otherDomain[1]
  ]
}

export function copyDomain(domain) {
  return [domain[0], domain[1]];
}