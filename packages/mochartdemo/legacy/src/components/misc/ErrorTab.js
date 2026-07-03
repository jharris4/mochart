import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Alert } from 'reactstrap';

export default class ErrorTab extends Component {
  static propTypes = {
    active: PropTypes.bool.isRequired
  };

  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(error, info) {
    Raven.captureException(error, { extra: info });
    this.setState( { hasError: true });
  }

  render() {
    const { active } = this.props;
    const { hasError } = this.state;
    if (hasError) {
      return (
        <div className={"mochart-demo-tab-container error" + (active ? " active" : "")}>
          <Alert color="danger" className="text-center mochart-demo-error-message">
            An Error Occurred
          </Alert>
        </div>
      );
    }
    else {
      return React.cloneElement(this.props.children, { active });
    }
  }
}