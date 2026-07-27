export const keyPlain = 'plain';
export const keyRange = 'range';
export const keyStack = 'stack';
export const keyPrior = 'prior';
export const keyMarker = 'marker';
export const keyLabel = 'label';
export const keyColor = 'color';
export const keyTooltip = 'tooltip';
export const keyDomain = 'domain';

const copyKeyMarker = 'markerCopyKey';
const copyKeyLabel = 'labelCopyKey';
const copyKeyColor = 'colorCopyKey';
const copyKeyTooltip = 'tooltipCopyKey';

export type PositionKey = typeof keyPlain | typeof keyRange;
export type PositionOrComputedKey = typeof keyPlain | typeof keyRange | typeof keyStack | typeof keyPrior;
export type ExtraKey = typeof keyMarker | typeof keyLabel | typeof keyColor | typeof keyTooltip;
export type ValueKey = PositionOrComputedKey | ExtraKey;
export type DomainKey = typeof keyDomain | typeof keyPlain | typeof keyRange | typeof keyStack | typeof keyMarker | typeof keyLabel | typeof keyColor | typeof keyTooltip;
export type ExtraCopyKey = typeof copyKeyMarker | typeof copyKeyLabel | typeof copyKeyColor | typeof copyKeyTooltip;

export const valueKeys: ValueKey[] = [keyPlain, keyRange, keyStack, keyPrior, keyMarker, keyLabel, keyColor, keyTooltip];

export const positionOrComputedOrExtraKeys: ValueKey[] = [keyPlain, keyRange, keyStack, keyPrior, keyMarker, keyLabel, keyColor, keyTooltip];

export const positionKeys: PositionKey[] = [keyPlain, keyRange];

export const positionOrComputedKeys: PositionOrComputedKey[] = [keyPlain, keyRange, keyStack, keyPrior];

export const extraKeys: ExtraKey[] = [keyMarker, keyColor, keyLabel, keyTooltip];

export const extraCopyKeys: ExtraCopyKey[] = [copyKeyMarker, copyKeyLabel, copyKeyColor, copyKeyTooltip];

export const extraAndCopyKeys: { extraKey: ExtraKey; copyKey: ExtraCopyKey }[] =
  [{extraKey: keyMarker, copyKey: copyKeyMarker}, {extraKey: keyColor, copyKey: copyKeyColor}, {extraKey: keyLabel, copyKey: copyKeyLabel}, {extraKey: keyTooltip, copyKey: copyKeyTooltip}];

export const domainKeys: DomainKey[] = [keyDomain, keyPlain, keyRange, keyStack, keyMarker, keyLabel, keyColor, keyTooltip];
