<script lang="ts">
  import { demoText } from '@mochart/demo-common';
  import { exportPNG, exportSVG } from '@mochart/export';

  import ButtonWithTooltip from './ButtonWithTooltip.svelte';
  import Icon from './Icon.svelte';

  // Download buttons for the chart found inside the container element
  // (mochart-export locates the chart svg itself).
  interface Props {
    idPrefix: string;
    getContainer: () => Element | null;
    disabled?: boolean;
  }

  let { idPrefix, getContainer, disabled = false }: Props = $props();

  function onExportPng() {
    const container = getContainer();
    if (container) {
      void exportPNG(container);
    }
  }

  function onExportSvg() {
    const container = getContainer();
    if (container) {
      exportSVG(container);
    }
  }
</script>

<div class="btn-group">
  <ButtonWithTooltip id={idPrefix + "-export-png"} {disabled} label={demoText.exportButtons.png.label}
                     tooltipText={demoText.exportButtons.png.tooltip} tooltipPlacement="top-start"
                     onClick={onExportPng} aria-label={demoText.exportButtons.png.aria}>
    <Icon size="lg" fixedWidth={true} name="file-image" />
  </ButtonWithTooltip>
  <ButtonWithTooltip id={idPrefix + "-export-svg"} {disabled} label={demoText.exportButtons.svg.label}
                     tooltipText={demoText.exportButtons.svg.tooltip} tooltipPlacement="top-start"
                     onClick={onExportSvg} aria-label={demoText.exportButtons.svg.aria}>
    <Icon size="lg" fixedWidth={true} name="file-code" />
  </ButtonWithTooltip>
</div>
