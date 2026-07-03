// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { NONE } from '../config/core/constants';
import { getSeriesGradientColors } from '../utils/SeriesColors';

function toPercent(i, count) {
  return (count === 2 ? (i * 100) : (i * 25)) + '%';
}

export default class SeriesColorGradient extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { uniqueId, seriesConfig } = this.props;

    let colors = getSeriesGradientColors(seriesConfig);

    if (colors) {
      return (
        <linearGradient id={uniqueId} x1="0" x2="0" y1="1" y2="0">
          {colors.map((color, i) => (
            <stop key={i} offset={toPercent(i, colors.length)} stopColor={color} stopOpacity={1} />
          ))}
        </linearGradient>
      );
    }
    return false;
  }
}
