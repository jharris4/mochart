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

export type PositionKey = typeof keyPlain | typeof keyRange;
export type PositionOrComputedKey = typeof keyPlain | typeof keyRange | typeof keyStack | typeof keyPrior;
export type ExtraKey = typeof keyMarker | typeof keyLabel | typeof keyColor;
export type ValueKey = PositionOrComputedKey | ExtraKey;
export type DomainKey = typeof keyDomain | typeof keyPlain | typeof keyRange | typeof keyStack | typeof keyMarker | typeof keyLabel | typeof keyColor;
export type ExtraCopyKey = typeof copyKeyMarker | typeof copyKeyLabel | typeof copyKeyColor;

export const valueKeys: ValueKey[] = [keyPlain, keyRange, keyStack, keyPrior, keyMarker, keyLabel, keyColor];

export const positionOrComputedOrExtraKeys: ValueKey[] = [keyPlain, keyRange, keyStack, keyPrior, keyMarker, keyLabel, keyColor];

export const positionKeys: PositionKey[] = [keyPlain, keyRange];

export const positionOrComputedKeys: PositionOrComputedKey[] = [keyPlain, keyRange, keyStack, keyPrior];

export const extraKeys: ExtraKey[] = [keyMarker, keyColor, keyLabel];

export const extraCopyKeys: ExtraCopyKey[] = [copyKeyMarker, copyKeyLabel, copyKeyColor];

export const extraAndCopyKeys: { extraKey: ExtraKey; copyKey: ExtraCopyKey }[] =
  [{extraKey: keyMarker, copyKey: copyKeyMarker}, {extraKey: keyColor, copyKey: copyKeyColor}, {extraKey: keyLabel, copyKey: copyKeyLabel}];

export const domainKeys: DomainKey[] = [keyDomain, keyPlain, keyRange, keyStack, keyMarker, keyLabel, keyColor];
