// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

function toPercent(aNumber) {
  return (aNumber * 100) + '%';
}

export default class RadialGradient extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { uniqueId, radialGradientConfig } = this.props;

    return (
      <radialGradient id={uniqueId}
                      cx={toPercent(radialGradientConfig.cx)}
                      cy={toPercent(radialGradientConfig.cy)}
                      fx={toPercent(radialGradientConfig.fx)}
                      fy={toPercent(radialGradientConfig.fy)}
                      r={toPercent(radialGradientConfig.r)}
                      gradientTransform={'rotate(' + radialGradientConfig.rotation + ')'}>
        {radialGradientConfig.stops.map((stop, i) => (
          <stop key={i} offset={toPercent(stop.offset)} stopColor={stop.color} stopOpacity={stop.opacity}/>
        ))}
      </radialGradient>
    );
  }
}
