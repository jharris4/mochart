export default function getDescriptions() {
  return {
    id: 'the unique identifier for the gradient so that it can be referenced for use',
    ignore: 'whether to ignore this radial gradient and treat it as though it were not specified',
    cx: 'the cx property of the svg radial gradient',
    cy: 'the cy property of the svg radial gradient',
    fx: 'the fx property of the svg radial gradient',
    fy: 'the fy property of the svg radial gradient',
    r: 'the r property of the svg radial gradient',
    rotation: 'the rotation property (in degrees) of the svg radial gradient',
    stops: 'the list of svg gradient stops, with offset, color and opacity properties'
  };
}