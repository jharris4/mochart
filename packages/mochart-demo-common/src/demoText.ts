// Shared user-facing text for the framework demos: tab titles, button labels,
// tooltips, aria-labels, captions and inline error messages. Every demo renders
// the same UI, so the copy lives here once — edit it here and all demos update.
//
// Naming convention per button: { label, tooltip, aria }. Buttons without a
// visible label omit `label`.
export const demoText = {
  tabs: {
    demos: 'Demos',
    chart: 'Chart',
    config: 'Config',
    data: 'Data',
    randomConfig: 'Random Config',
    transitionConfig: 'Transition Config',
    chartPendingTitle: 'Applied changes are waiting — switch here to see them'
  },
  errors: {
    errorOccurred: 'An Error Occurred',
    invalidJson: 'Invalid JSON',
    invalidChartConfig: 'Invalid chart config — details in the browser console',
    invalidRandomConfigValues: 'Config has invalid values — details in the browser console',
    invalidDataArray: 'Invalid Data — should be an array of objects',
    invalidRandomConfig: 'Invalid Random Config',
    creatingDataProvider: 'Error creating DataProvider'
  },
  // The standalone demo gallery page (the landing route).
  gallery: {
    sections: {
      demos: 'Demos',
      showcases: 'Showcases',
      test: 'Test Demos'
    },
    testSectionHint: 'Feature-coverage demos exercising less common config options',
    showcases: {
      transition: { title: 'Transition', description: 'Animate a chart between two datasets' },
      rotation: { title: 'Rotation', description: 'A grid of charts showing different tick label rotations' }
    }
  },
  backToDemos: { label: 'Demos', tooltip: 'Back to the demo gallery', aria: 'Back to the demo gallery' },
  modeSwitcher: {
    label: 'Mode:',
    modes: {
      single: { label: 'Single', title: 'One chart with editable config, data, groups and series' },
      multi: { label: 'Multi', title: 'A grid of charts stepping through datasets together' },
      random: { label: 'Random', title: 'A chart fed by a seeded random data generator' }
    }
  },
  configTab: {
    reset: { label: 'Reset', tooltip: "Restore this demo's original config", aria: 'Reset' },
    defaults: { label: 'Defaults', tooltip: 'Show or hide the default config values merged into the JSON', aria: 'Toggle Defaults' },
    invert: { label: 'Invert', tooltip: 'Swap the chart between vertical and horizontal orientation', aria: 'Toggle Inverted' },
    slow: { label: 'Slow', tooltip: 'Slow all animations down so transitions are easy to watch', aria: 'Toggle Slow' },
    apply: { label: 'Apply', tooltip: 'Apply this config — the chart updates when you return to the Chart tab', aria: 'Apply' }
  },
  dataTab: {
    reset: { label: 'Reset', tooltip: "Restore this demo's original data", aria: 'Reset' },
    unused: { label: 'Unused', tooltip: 'Show or hide data properties the chart config does not use', aria: 'Toggle Unused' },
    apply: { label: 'Apply', tooltip: 'Apply this data — the chart updates when you return to the Chart tab', aria: 'Apply' }
  },
  exportButtons: {
    png: { label: 'PNG', tooltip: 'Download the chart as a PNG image', aria: 'Export PNG' },
    svg: { label: 'SVG', tooltip: 'Download the chart as an SVG image', aria: 'Export SVG' }
  },
  // The collapsed export/share menu at the end of each mode's controls row.
  exportShareMenu: {
    trigger: { tooltip: 'Export or share this chart', aria: 'Export and share' }
  },
  docsLinks: {
    label: 'Reference:',
    tooltipPrefix: 'Open the config reference for '
  },
  siteRootLink: {
    // Rendered as an icon + text button in every view's navigation row.
    shortLabel: 'Mochart',
    tooltip: 'Back to the Mochart site',
    aria: 'Back to the Mochart site'
  },
  themeToggle: {
    // Icon-only button (sun/moon) in every view's navigation row.
    tooltipToDark: 'Switch to the dark theme',
    tooltipToLight: 'Switch to the light theme',
    aria: 'Toggle color theme'
  },
  shareButton: {
    label: 'Share',
    tooltip: 'Copy a link to this chart with the current config and data',
    tooltipCopied: 'Link copied',
    aria: 'Copy Share Link'
  },
  editableChart: {
    emptyGroupText: 'Select Group(s)',
    selectAGroupText: 'Select a Group',
    groupIndexPrefix: 'Group: ',
    seriesIndexPrefix: 'Series: ',
    secondChart: {
      label: '2nd Chart',
      tooltipShow: 'Show a second chart sharing the same data',
      tooltipHide: 'Hide the second chart sharing the same data',
      aria: 'Toggle Chart Count'
    },
    editMode: {
      labelToSeries: 'Edit Series',
      labelToGroups: 'Edit Groups',
      tooltipToSeries: 'Switch to editing one group at a time (step groups/series, change values)',
      tooltipToGroups: 'Switch to editing the set of groups (add, remove, reorder)',
      aria: 'Toggle Mode'
    },
    resetGroups: { label: 'Reset', tooltip: 'Restore the original group set and order', aria: 'Reset Groups' },
    reverseGroups: { label: 'Reverse', tooltip: 'Reverse the order of the groups', aria: 'Reverse Groups' },
    addGroups: { label: 'Add', tooltip: 'Add the groups selected in the input to the chart', aria: 'Add Selected Groups' },
    removeGroups: { label: 'Remove', tooltip: 'Remove the groups selected in the input from the chart', aria: 'Remove Selected Groups' },
    playAddGroups: { tooltip: 'Animate adding the selected groups one at a time', aria: 'Play Add Selected Groups' },
    playRemoveGroups: { tooltip: 'Animate removing the selected groups one at a time', aria: 'Play Remove Selected Groups' },
    stopSequence: { tooltip: 'Stop the add/remove animation', aria: 'Stop Selected Group Sequence' },
    selectAllGroups: { label: 'Select All', tooltip: 'Put every group into the selection input', aria: 'Select All Groups' },
    decreaseGroupOrder: { tooltip: 'Move the focused group one position earlier', aria: 'Decrease Group Order' },
    increaseGroupOrder: { tooltip: 'Move the focused group one position later', aria: 'Increase Group Order' },
    previousSeries: { tooltip: 'Edit the previous series', aria: 'Previous Series' },
    nextSeries: { tooltip: 'Edit the next series', aria: 'Next Series' },
    resetSeries: { label: 'Reset', tooltip: "Discard the edits to this series' values", aria: 'Reset Series Changes' },
    applySeries: { label: 'Apply', tooltip: 'Apply the edited series values to the chart', aria: 'Apply Series Changes' }
  },
  multiChartsTab: {
    gridLabel: 'Grid:',
    gridRowsAria: 'Grid rows',
    gridColsAria: 'Grid columns',
    stepBackward: { tooltip: 'Step all charts one dataset backward', aria: 'Step Backward' },
    stepForward: { tooltip: 'Step all charts one dataset forward', aria: 'Step Forward' },
    playBackward: { tooltip: 'Play backward through the datasets at the interval', aria: 'Play Backward' },
    playForward: { tooltip: 'Play forward through the datasets at the interval', aria: 'Play Forward' },
    stop: { tooltip: 'Stop playback', aria: 'Stop' },
    intervalLabel: 'Interval (ms):',
    intervalAria: 'Playback interval in milliseconds'
  },
  randomChartTab: {
    back: { label: 'Back', tooltip: 'Go back to the previous random dataset', aria: 'Randomize Back' },
    randomize: { label: 'Randomize', tooltip: 'Generate the next random dataset', aria: 'Randomize Next' },
    play: { tooltip: 'Keep generating random datasets at the interval', aria: 'Play Randomize' },
    stop: { tooltip: 'Stop generating', aria: 'Stop' },
    intervalLabel: 'Interval (ms):',
    intervalAria: 'Randomize interval in milliseconds',
    reuse: {
      label: 'Reuse',
      tooltip: "Keep part of the data the same between randomizations (the config's reuse settings), so transitions animate with continuity — off generates fully independent datasets",
      aria: 'Reuse'
    }
  },
  randomConfigTab: {
    reset: { label: 'Reset', tooltip: 'Restore the original random generator config', aria: 'Reset' },
    apply: { label: 'Apply', tooltip: 'Apply this generator config to the random chart', aria: 'Apply' }
  },
  transitionChartTab: {
    back: { label: 'Back', tooltip: 'Transition to the previous dataset', aria: 'Step Backward' },
    next: { label: 'Next', tooltip: 'Transition to the next dataset', aria: 'Step Forward' }
  },
  transitionConfigTab: {
    reset: { label: 'Reset', tooltip: 'Restore the original transition config', aria: 'Reset' },
    apply: { label: 'Apply', tooltip: 'Apply this config to the transition charts', aria: 'Apply' }
  }
} as const;
