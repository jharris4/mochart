export default function getDescriptions() {
  return {
    axis: 'the unqiue identifier of the series axis that the series stack belongs to',
    id: 'the unique identifier for the series stack so it can be referenced by series that belong to it',
    outerCapSize: 'the size of the cap (in pixels) for series that are an outer series of the stack',
    outerCapType: 'the type (point, curve, round, use null for none) of cap for series that are an outer series of the stack',
    outerCapExpand: 'whether to expand the base of caps for series that are an outer series of the stack when the size of the cap is greater than the extent of the bar'
  };
}