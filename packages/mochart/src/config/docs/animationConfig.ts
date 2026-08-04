export default function getDescriptions() {
  return {
    animate: 'whether all animation should be enabled or disabled',
    initialDuration: 'the maximum duration for the initial animation when chart data is first loaded',
    expansionDuration: 'the maximum duration for the axis expansion animation phase when new data is added to the chart',
    valueChangeDuration: 'the maximum duration for the value change animation phase when data in the chart changes',
    contractionDuration: 'the maximum duration for the axis contraction animation phase when new data is removed from the chart',
    focusDuration: 'the duration of animation showing the transition between focus on a specific series or category value'
  };
}

export function getDetails() {
  return {
    animate: 'The master switch for staged animation. When `false`, config, data, and size changes apply instantly. When `true`, each update plays up to three sequential phases — axis expansion, value change, axis contraction — skipping phases it does not need, and each phase’s duration scales with the size of its change (small updates play faster than the configured maximum).',
    initialDuration: 'Duration (in milliseconds) of the first render animation when the chart mounts with data.',
    expansionDuration: 'Duration (in milliseconds) of the axis expansion phase, which plays first when an update needs larger axis domains (new categories or larger values) so incoming data has room to land.',
    valueChangeDuration: 'Duration (in milliseconds) of the value change phase, which tweens values to their new positions and also plays category transitions (categories added/removed/reordered) and series transitions (series added, removed, or filtered via the legend).',
    contractionDuration: 'Duration (in milliseconds) of the axis contraction phase, which plays last when the settled data needs smaller axis domains.',
    focusDuration: 'Duration (in milliseconds) of focus transitions — the emphasis change between focused/defocused styling when a series or category gains or loses focus via hover, click, or the legend.'
  };
}
