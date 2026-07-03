// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';

export default class SeriesBackground extends PureComponent {
  static defaultProps = {
    chartTransform: null
  };

  constructor(props) {
    super(props);
  }

  render() {
    const { seriesLayoutInfo, shapeRef } = this.props;
    return (
      <g className={mochartCssClasses['seriesBackground']}>
        <rect x={seriesLayoutInfo.x} y={seriesLayoutInfo.y} width={seriesLayoutInfo.width} height={seriesLayoutInfo.height}
              fillOpacity="0" stroke="none" ref={shapeRef}/>
      </g>
    );
  }
}
