import { AUTO, COLOR_CURRENT } from '../core/constants';

// The SeriesIconConfig members, the `icon` group of the legend and tooltip regular defaults.
export function getRegularDefaults() {
  return {
    showColors: true,
    showShapes: true,
    showPlaceholders: true,
    size: AUTO,
    spacerSize: 4,
    borderSize: 1,
    // The other two stay literal: they carry their own alpha, which 'currentColor' cannot.
    borderColor: COLOR_CURRENT,
    borderOpacity: 0.65,
    filteredColor: 'rgba(255,255,255,0)',
    unfilteredColor: 'rgba(0,0,0,0.5)'
  };
}
