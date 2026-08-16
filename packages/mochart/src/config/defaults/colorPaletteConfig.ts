const defaultColors = ["#4477aa", "#ee6677", "#228833", "#ccbb44", "#66ccee", "#aa3377", "#bbbbbb"];

const defaultPalette = () => ({
  normal: {
    strokeColors: defaultColors,
    fillColors: defaultColors
  },
  focused: {
    strokeColors: defaultColors,
    fillColors: defaultColors
  },
  defocused: {
    strokeColors: defaultColors,
    fillColors: defaultColors
  }
});

export default function getDefaults() {
  return {
    series: defaultPalette(),
    marker: defaultPalette(),
    label: defaultPalette(),
    errorBar: defaultPalette()
  };
}
