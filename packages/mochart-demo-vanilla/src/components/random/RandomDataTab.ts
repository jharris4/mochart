import { el, setActiveClass, textAreaContent } from '../misc/dom';

export interface RandomDataTabProps {
  active?: boolean;
  data: unknown;
}

export interface RandomDataTabHandle {
  el: HTMLElement;
  setActive(active: boolean): void;
  setData(data: unknown): void;
}

function formatData(dataJSON: unknown): string {
  return JSON.stringify(dataJSON).replace(/,/g, ', ').replace(/},/g, '},\n');
}

export function randomDataTab(props: RandomDataTabProps): RandomDataTabHandle {
  let data = props.data;

  const textArea = textAreaContent(formatData(data), () => {});

  const container = el('div', {
    className: 'mochart-demo-tab-container col data' + (props.active ? ' active' : '')
  }, [
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
