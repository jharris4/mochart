import { AUTO, COLOR_CURRENT } from '../core/constants';

// The SeriesIconConfig members, spread into the legend and tooltip regular defaults.
export function getRegularDefaults() {
  return {
    showIconColors: true,
    showIconShapes: true,
    showIconPlaceholders: true,
    iconSize: AUTO,
    iconSpacerSize: 4,
    iconBorderSize: 1,
    // The other two stay literal: they carry their own alpha, which 'currentColor' cannot.
    iconBorderColor: COLOR_CURRENT,
    iconBorderOpacity: 0.65,
    iconFilteredColor: 'rgba(255,255,255,0)',
    iconUnfilteredColor: 'rgba(0,0,0,0.5)'
  };
}
