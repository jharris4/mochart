import { describe, it, expect } from 'vitest';

import { getTransitionDataProviders } from '../src/transition';
import type { TransitionConfig } from '../src/types';

// The providers wrap the raw rows wholesale: the category display property and
// extra series properties (colorProperty, markerProperty, ...) are served as
// columns like any other row property — nothing is dropped in transit.
// (Verified end-to-end: a chart animating between two such providers renders
// display values, not raw ids, mid-transition.)
describe('getTransitionDataProviders', () => {
  it('serves the display property and extra series properties from the rows', () => {
    const transitionConfig: TransitionConfig = {
      config: {
        version: '1.0.0',
        categoryAxis: { property: 'ts', type: 'string', scale: 'ordinal', displayProperty: 'label' },
        series: [{ property: 'count', colorProperty: 'heat' }]
      },
      data: [
        [
          { ts: 'a', label: 'Alpha', count: 5, heat: 0.1 },
          { ts: 'b', label: 'Beta', count: 7, heat: 0.9 }
        ],
        [
          { ts: 'b', label: 'Beta', count: 4, heat: 0.4 }
        ]
      ]
    };
    const providers = getTransitionDataProviders(transitionConfig);
    expect(providers).toHaveLength(2);
    expect(providers[0].getPropertyValues('ts')).toEqual(['a', 'b']);
    expect(providers[0].getPropertyValues('label')).toEqual(['Alpha', 'Beta']);
    expect(providers[0].getPropertyValues('heat')).toEqual([0.1, 0.9]);
    expect(providers[1].getPropertyValues('count')).toEqual([4]);
  });
});
