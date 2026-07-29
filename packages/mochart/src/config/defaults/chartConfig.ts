import { CHART_TYPE_XY, NONE } from '../core/constants';

export default function getDefaults() {
  return {
    type: CHART_TYPE_XY,
    margin: { top: 2, right: 2, bottom: 2, left: 2 },
    padding: { top: 3, right: 3, bottom: 3, left: 3 },
    backgroundStyle: { stroke: NONE, strokeOpacity: 0, strokeWidth: NONE, fill: NONE, fillOpacity: 0 }
  };
}
