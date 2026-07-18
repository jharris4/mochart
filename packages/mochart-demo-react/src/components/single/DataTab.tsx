import React, { useState, useRef, useMemo } from 'react';
import { ButtonToolbar } from 'reactstrap';
import FontAwesome from 'react-fontawesome';

import { applyDataEdit, buildMochartDemoConfig, collectUsedDataProperties, formatDataView, getJsonError, parseFullData } from '@mochart/demo-common';

import TextAreaContent from '../misc/TextAreaContent';
import ButtonWithTooltip from '../misc/ButtonWithTooltip';

import type { DemoConfig, DataRow } from '../../types';

interface Props {
  active?: boolean;
  config?: DemoConfig | null;
  data?: DataRow[] | null;
  onDataChange: (data: DataRow[]) => void;
  onDataError: (errorMessage: string) => void;
  onDataReset: () => void;
}

export default function MochartDataTab({ active, config = null, data = null, onDataChange, onDataError, onDataReset }: Props) {
  // Data properties the chart config does not read are hidden by default; the
  // Unused button toggles them. fullDataRef holds the complete dataset backing
  // the textarea, viewUsedRef the used-set its current content was rendered
  // with (null when every property is shown).
  const usedProperties = useMemo(() => collectUsedDataProperties(buildMochartDemoConfig(config ?? {}).mochartConfig), [config]);
  const [showUnused, setShowUnused] = useState(false);
  const fullDataRef = useRef<DataRow[]>([]);
  const viewUsedRef = useRef<Set<string> | null>(null);

  const renderView = (fullRows: DataRow[], show: boolean): string => {
    const viewUsed = show ? null : usedProperties;
    fullDataRef.current = fullRows;
    viewUsedRef.current = viewUsed;
    return formatDataView(fullRows, viewUsed);
  };

  const [dataText, setDataText] = useState(() => renderView(data ?? [], false));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parseCurrentFullData = (text: string) => parseFullData(text, fullDataRef.current, viewUsedRef.current);

  // Reformat when the incoming data changes.
  const prevData = useRef(data);
  if (prevData.current !== data) {
    prevData.current = data;
    setDataText(renderView(data ?? [], showUnused));
  }

  // Re-filter when the applied config changes, keeping any (valid) unapplied edits.
  const prevConfig = useRef(config);
  if (prevConfig.current !== config) {
    prevConfig.current = config;
    if (!showUnused) {
      const parsed = parseCurrentFullData(dataText);
      if (!('error' in parsed)) {
        setDataText(renderView(parsed.full, false));
      }
    }
  }

  const resetData = () => {
    setDataText(renderView(data ?? [], showUnused));
    setErrorMessage(null);
    onDataReset();
  };

  const toggleShowUnused = () => {
    const parsed = parseCurrentFullData(dataText);
    if ('error' in parsed) {
      setErrorMessage(parsed.error === 'json' ? 'Invalid JSON' : 'Invalid Data — should be an array of objects');
      return;
    }
    const nextShowUnused = !showUnused;
    setShowUnused(nextShowUnused);
    setErrorMessage(null);
    setDataText(renderView(parsed.full, nextShowUnused));
  };

  const applyData = () => {
    const result = applyDataEdit(dataText, fullDataRef.current, viewUsedRef.current, config ?? {});
    if (result.ok) {
      setErrorMessage(null);
      fullDataRef.current = result.data;
      onDataChange(result.data);
    }
    else {
      setErrorMessage(result.errorMessage);
      onDataError(result.callbackError);
    }
  };

  const jsonError = useMemo(() => getJsonError(dataText), [dataText]);
  const footerError = jsonError ?? errorMessage;

  return (
    <div className={"mochart-demo-tab-container col data" + (active ? " active" : "")}>
      <div className="mochart-demo-tab-content">
        <TextAreaContent value={dataText} onChange={(text: string) => { setDataText(text); setErrorMessage(null); }} />
      </div>
      <div className="mochart-demo-tab-footer">
        <ButtonToolbar>
          <ButtonWithTooltip id="data-reset" label="Reset" tooltipText="Restore this demo's original data" tooltipPlacement="top-start"
            onClick={resetData} aria-label="Reset">
            <FontAwesome size="lg" fixedWidth={true} name="arrow-rotate-left" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="data-unused" label="Unused" pressed={showUnused}
            tooltipText="Show or hide data properties the chart config does not use" tooltipPlacement="top-start"
            onClick={toggleShowUnused} aria-label="Toggle Unused">
            <FontAwesome size="lg" fixedWidth={true} name={showUnused ? 'eye' : 'eye-slash'} />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="data-apply" label="Apply" disabled={jsonError !== null}
            tooltipText="Apply this data — the chart updates when you return to the Chart tab" tooltipPlacement="top-start"
            onClick={applyData} aria-label="Apply">
            <FontAwesome size="lg" fixedWidth={true} name="check" />
          </ButtonWithTooltip>
          {footerError ? <span className="mochart-demo-footer-error" role="alert">{footerError}</span> : null}
        </ButtonToolbar>
      </div>
    </div>
  );
}
