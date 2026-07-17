import React, { useState, useRef } from 'react';

import TextAreaContent from '../misc/TextAreaContent';

function formatData(dataJSON: unknown): string {
  return JSON.stringify(dataJSON).replace(/,/g, ', ').replace(/},/g, '},\n');
}

interface Props {
  active?: boolean;
  data: unknown;
}

export default function RandomMochartDataTab({ active, data }: Props) {
  const [dataText, setDataText] = useState(() => formatData(data));

  const prevData = useRef(data);
  if (prevData.current !== data) {
    prevData.current = data;
    setDataText(formatData(data));
  }

  return (
    <div className={"mochart-demo-tab-container col data" + (active ? " active" : "")}>
      <div className="mochart-demo-tab-content">
        <TextAreaContent value={dataText} onChange={() => {}} />
      </div>
    </div>
  );
}
