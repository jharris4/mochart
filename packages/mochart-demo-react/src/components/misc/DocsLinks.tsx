import React from 'react';

import { demoText, getReferenceSectionIds, getReferenceSectionUrl } from '@mochart/demo-common';

// Links into the documentation site's config reference for the sections the
// edited config actually uses (see demo-common docsLinks).
interface Props {
  config: Record<string, unknown> | null | undefined;
}

export default function DocsLinks({ config }: Props) {
  const sectionIds = getReferenceSectionIds(config);
  if (sectionIds.length === 0) {
    return null;
  }
  return (
    <div className="mochart-demo-docs-links">
      <span>{demoText.docsLinks.label} </span>
      {sectionIds.map((sectionId, index) => (
        <React.Fragment key={sectionId}>
          {index > 0 ? ' · ' : null}
          <a href={getReferenceSectionUrl(sectionId)} title={demoText.docsLinks.tooltipPrefix + sectionId}>{sectionId}</a>
        </React.Fragment>
      ))}
    </div>
  );
}
