import React, { useState, useRef } from 'react';
import { ButtonToolbar } from 'reactstrap';
import FontAwesome from 'react-fontawesome';

import { ArrayOfObjectsDataProvider, getDataErrors } from 'mochart';
import type { DataProvider } from 'mochart';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

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

interface Props {
  active?: boolean;
  config?: DemoConfig | null;
  data?: DataRow[] | null;
  onDataChange: (data: DataRow[]) => void;
  onDataError: (errorMessage: string) => void;
  onDataReset: () => void;
}

export default function MochartDataTab({ active, config = null, data = null, onDataChange, onDataError, onDataReset }: Props) {
  const [dataText, setDataText] = useState(() => formatData(data));

  // Reformat when the incoming data changes.
  const prevData = useRef(data);
  if (prevData.current !== data) {
    prevData.current = data;
    setDataText(formatData(data));
  }

  const resetData = () => {
    setDataText(formatData(data));
    onDataReset();
  };

  const applyData = () => {
    try {
      const parsedData = JSON.parse(dataText);
      let error: string | null = null;
      if (isArrayOfObjects(parsedData)) {
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
      }
      else {
        console.warn('Invalid Data - should be an array of objects');
        error = 'Invalid Data';
      }
      if (error) {
        onDataError(error);
      }
      else {
        onDataChange(parsedData);
      }
    }
    catch (error) {
      console.warn('Invalid Data JSON: ' + String(error));
      alert('Invalid Data JSON');
      onDataError('Invalid Data ');
    }
  };

  return (
    <div className={"mochart-demo-tab-container col data" + (active ? " active" : "")}>
      <div className="mochart-demo-tab-content">
        <TextAreaContent value={dataText} onChange={setDataText} />
      </div>
      <div className="mochart-demo-tab-footer">
        <ButtonToolbar>
          <ButtonWithTooltip id="data-reset" tooltipText="Reset" tooltipPlacement="top-start"
            onClick={resetData} aria-label="Reset">
            <FontAwesome size="lg" fixedWidth={true} name="undo" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="data-apply" tooltipText="Apply" tooltipPlacement="top-start"
            onClick={applyData} aria-label="Apply">
            <FontAwesome size="lg" fixedWidth={true} name="check" />
          </ButtonWithTooltip>
        </ButtonToolbar>
      </div>
    </div>
  );
}
