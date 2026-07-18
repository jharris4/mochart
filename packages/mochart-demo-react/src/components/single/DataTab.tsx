import React, { useState, useRef, useMemo } from 'react';
import { ButtonToolbar } from 'reactstrap';
import FontAwesome from 'react-fontawesome';

import { ArrayOfObjectsDataProvider, getDataErrors } from '@mochart/core';
import type { DataProvider } from '@mochart/core';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';
import { collectUsedDataProperties, filterDataProperties, restoreHiddenDataProperties } from '../../config/unusedDataProperties';

import TextAreaContent from '../misc/TextAreaContent';
import ButtonWithTooltip from '../misc/ButtonWithTooltip';

import type { DemoConfig, DataRow } from '../../types';

function formatData(dataJSON: unknown): string {
  return JSON.stringify(dataJSON).replace(/,/g, ', ').replace(/},/g, '},\n');
}

function isObject(v: unknown): boolean {
  return v !== null && v !== void 0 && typeof v === "object";
}

function isArrayOfObjects(data: unknown): boolean {
  return Array.isArray(data) && !data.some(v => !isObject(v));
}

type ParsedFullData = { full: DataRow[] } | { error: 'json' | 'data' };

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
    return formatData(viewUsed === null ? fullRows : filterDataProperties(fullRows, viewUsed));
  };

  const [dataText, setDataText] = useState(() => renderView(data ?? [], false));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parse the textarea back to a full dataset, restoring any properties the
  // filtered view hid.
  const parseFullData = (text: string): ParsedFullData => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    }
    catch (error) {
      return { error: 'json' };
    }
    if (!isArrayOfObjects(parsed)) {
      return { error: 'data' };
    }
    const rows = parsed as DataRow[];
    const viewUsed = viewUsedRef.current;
    return { full: viewUsed === null ? rows : restoreHiddenDataProperties(rows, fullDataRef.current, viewUsed) };
  };

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
      const parsed = parseFullData(dataText);
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
    const parsed = parseFullData(dataText);
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
    const parsed = parseFullData(dataText);
    if ('error' in parsed) {
      if (parsed.error === 'json') {
        console.warn('Invalid Data JSON');
        setErrorMessage('Invalid JSON');
        onDataError('Invalid Data ');
      }
      else {
        console.warn('Invalid Data - should be an array of objects');
        setErrorMessage('Invalid Data — details in the browser console');
        onDataError('Invalid Data');
      }
      return;
    }
    const parsedData = parsed.full;
    let error: string | null = null;
    const { mochartConfig } = buildMochartDemoConfig(config ?? {});
    if (mochartConfig.validation.valid) {
      const dataErrors = getDataErrors(mochartConfig, new ArrayOfObjectsDataProvider(parsedData, mochartConfig.groupAxisConfig.property ?? '') as unknown as DataProvider);
      if (dataErrors.length > 0) {
        console.warn('Invalid Data - Content Errors: ', dataErrors.join('\n'));
        error = 'Invalid Data Content';
      }
    }
    else {
      console.warn('Could not validate data since mochart config was not valid');
      error = 'Invalid Config & Data';
    }
    if (error) {
      setErrorMessage(error + ' — details in the browser console');
      onDataError(error);
    }
    else {
      setErrorMessage(null);
      fullDataRef.current = parsedData;
      onDataChange(parsedData);
    }
  };

  const jsonError = useMemo(() => {
    try {
      JSON.parse(dataText);
      return null;
    }
    catch (error) {
      return 'Invalid JSON';
    }
  }, [dataText]);
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
