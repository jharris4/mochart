import { gradientStops } from './shared';

export default function getDescriptions() {
  return {
    id: 'the unique identifier for the gradient so that it can be referenced for use',
    ignore: 'whether to ignore this linear gradient and treat it as though it were not specified',
    x1: 'the x1 property of the svg linear gradient',
    x2: 'the x2 property of the svg linear gradient',
    y1: 'the y1 property of the svg linear gradient',
    y2: 'the y2 property of the svg linear gradient',
    rotation: 'the rotation property (in degrees) of the svg linear gradient',
    stops: gradientStops('the list of svg gradient stops, each placing a color at a position along the gradient (at least one stop must be given)')
  };
}