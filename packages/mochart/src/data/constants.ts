export const keyPlain = 'plain';
export const keyRange = 'range';
export const keyStack = 'stack';
export const keyPrior = 'prior';
export const keyMarker = 'marker';
export const keyLabel = 'label';
export const keyColor = 'color';
export const keyDomain = 'domain';

const copyKeyMarker = 'markerCopyKey';
const copyKeyLabel = 'labelCopyKey';
const copyKeyColor = 'colorCopyKey';

export const valueKeys = [keyPlain, keyRange, keyStack, keyPrior, keyMarker, keyLabel, keyColor];

export const positionOrComputedOrExtraKeys = [keyPlain, keyRange, keyStack, keyPrior, keyMarker, keyLabel, keyColor];

export const positionKeys = [keyPlain, keyRange];

export const positionOrComputedKeys = [keyPlain, keyRange, keyStack, keyPrior];

export const extraKeys = [keyMarker, keyColor, keyLabel];

export const extraCopyKeys = [copyKeyMarker, copyKeyLabel, copyKeyColor];

export const extraAndCopyKeys = [{extraKey: keyMarker, copyKey: copyKeyMarker}, {extraKey: keyColor, copyKey: copyKeyColor}, {extraKey: keyLabel, copyKey: copyKeyLabel}];

export const domainKeys = [keyDomain, keyPlain, keyRange, keyStack, keyMarker, keyLabel, keyColor];