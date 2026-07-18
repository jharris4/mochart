import React from 'react';
import { ButtonGroup } from 'reactstrap';
import FontAwesome from 'react-fontawesome';

import { exportPNG, exportSVG } from 'mochart-export';

import ButtonWithTooltip from './ButtonWithTooltip';

// Download buttons for the chart found inside the container element
// (mochart-export locates the chart svg itself).
interface Props {
  idPrefix: string;
  getContainer: () => Element | null;
  disabled?: boolean;
}

export default function ExportButtons({ idPrefix, getContainer, disabled = false }: Props) {
  const onExportPng = () => {
    const container = getContainer();
    if (container) {
      void exportPNG(container);
    }
  };

  const onExportSvg = () => {
    const container = getContainer();
    if (container) {
      exportSVG(container);
    }
  };

  return (
    <ButtonGroup>
      <ButtonWithTooltip id={idPrefix + "-export-png"} disabled={disabled} label="PNG"
        tooltipText="Download the chart as a PNG image" tooltipPlacement="top-start"
        onClick={onExportPng} aria-label="Export PNG">
        <FontAwesome size="lg" fixedWidth={true} name="file-image" />
      </ButtonWithTooltip>
      <ButtonWithTooltip id={idPrefix + "-export-svg"} disabled={disabled} label="SVG"
        tooltipText="Download the chart as an SVG image" tooltipPlacement="top-start"
        onClick={onExportSvg} aria-label="Export SVG">
        <FontAwesome size="lg" fixedWidth={true} name="file-code" />
      </ButtonWithTooltip>
    </ButtonGroup>
  );
}
