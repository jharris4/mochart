import { formatData } from '@mochart/demo-common';

import { el, setActiveClass, tabContainer, textAreaContent } from '../misc/dom';

export interface RandomDataTabProps {
  active?: boolean;
  data: unknown;
}

export interface RandomDataTabHandle {
  el: HTMLElement;
  setActive(active: boolean): void;
  setData(data: unknown): void;
}

export function randomDataTab(props: RandomDataTabProps): RandomDataTabHandle {
  let data = props.data;

  const textArea = textAreaContent(formatData(data), () => {});

  const container = tabContainer('demo-layout-col data', props.active, [
    el('div', { className: 'mochart-demo-tab-content' }, [textArea.el])
  ]);

  return {
    el: container,
    setActive(active: boolean) {
      setActiveClass(container, active);
    },
    setData(nextData: unknown) {
      if (nextData !== data) {
        data = nextData;
        textArea.setValue(formatData(nextData));
      }
    }
  };
}
