export default function getDescriptions() {
  return {
    animate: 'whether all animation should be enabled or disabled',
    initialDuration: 'the maximum duration for the initial animation when chart data is first loaded',
    expansionDuration: 'the maximum duration for the axis expansion animation phase when new data is added to the chart',
    valueChangeDuration: 'the maximum duration for the value change animation phase when data in the chart changes',
    collapseDuration: 'the maximum duration for the axis collapse animation phase when new data is removed from the chart',
    focusDuration: 'the duration of animation showing the transition between focus on a specific series or group value'
  };
}
