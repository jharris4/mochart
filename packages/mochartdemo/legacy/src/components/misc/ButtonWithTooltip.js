import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip } from 'reactstrap';

function getIsTouchDevice() {
  return true == ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch);
}

const isTouchDevice = getIsTouchDevice();

export default class ButtonWithTooltip extends PureComponent {
  static propTypes = Object.assign({}, Button.propTypes, {
    tooltipText: PropTypes.string,
    tooltipPlacement: PropTypes.string
  });

  constructor(props) {
    super(props);
    this.state = { tooltipOpen: false };
  }

  toggle = () => {
    this.setState({ tooltipOpen: !this.state.tooltipOpen });
  }

  onClick = () => {
    const { onClick } = this.props;
    this.setState({ tooltipOpen: false });
    onClick();
  }

  render() {
    const { children, tooltipText, tooltipPlacement, id, disabled, onClick, ...buttonProps } = this.props;
    const { tooltipOpen } = this.state;

    let tooltip = false;
    if (!isTouchDevice) {
      tooltip = (
        <Tooltip placement={tooltipPlacement} isOpen={tooltipOpen && !disabled} target={id} toggle={this.toggle} delay={{ show: 100, hide: 0 }}>
          {tooltipText}
        </Tooltip>
      );
    }

    return (
      <span className="button-with-tooltip">
        <Button id={id} disabled={disabled} onClick={this.onClick} {...buttonProps}>
          {children}
        </Button>
        {tooltip}
      </span>
    );
  }
}
