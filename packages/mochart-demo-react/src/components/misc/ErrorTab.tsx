import React, { Component, type ErrorInfo, type ReactElement } from 'react';
import { Alert } from 'reactstrap';

import { demoText } from '@mochart/demo-common';

interface Props {
  active: boolean;
  // The single child receives `active` injected via cloneElement.
  children: ReactElement<any>;
}

interface State {
  hasError: boolean;
}

// Error boundaries have no hook equivalent, so this stays a class component.
export default class ErrorTab extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
    this.setState({ hasError: true });
  }

  render() {
    const { active } = this.props;
    const { hasError } = this.state;
    if (hasError) {
      return (
        <div className={"mochart-demo-tab-container error" + (active ? " active" : "")}>
          <Alert color="danger" className="text-center mochart-demo-error-message">
            {demoText.errors.errorOccurred}
          </Alert>
        </div>
      );
    }
    else {
      return React.cloneElement(this.props.children, { active });
    }
  }
}
