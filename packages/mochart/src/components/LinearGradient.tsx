// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

function toPercent(aNumber) {
  return (aNumber * 100) + '%';
}

export default class LinearGradient extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { uniqueId, linearGradientConfig } = this.props;

    return (
      <linearGradient id={uniqueId}
                      x1={toPercent(linearGradientConfig.x1)}
                      y1={toPercent(linearGradientConfig.y1)}
                      x2={toPercent(linearGradientConfig.x2)}
                      y2={toPercent(linearGradientConfig.y2)}
                      gradientTransform={'rotate(' + linearGradientConfig.rotation + ')'}>
        {linearGradientConfig.stops.map((stop, i) => (
          <stop key={i} offset={toPercent(stop.offset)} stopColor={stop.color} stopOpacity={stop.opacity}/>
        ))}
      </linearGradient>
    );
  }
}
