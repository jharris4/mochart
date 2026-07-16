import { NONE } from '../core/constants';

export default function getDefaults() {
  return {
    inverted: false,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    backgroundStyle: { stroke: NONE, strokeOpacity: 0, strokeWidth: NONE, fill: NONE, fillOpacity: 0 }
  };
}