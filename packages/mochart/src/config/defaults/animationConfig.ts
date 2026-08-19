import { AUTO, DOMAIN_CHANGE_STAGED } from '../core/constants';

export default function getDefaults() {
  return {
    enabled: true,
    valueDomainChange: AUTO,
    categoryDomainChange: DOMAIN_CHANGE_STAGED,
    initialDuration: 1000,
    expansionDuration: 1000,
    valueChangeDuration: 1000,
    contractionDuration: 1000,
    focusDuration: 1000
  };
}