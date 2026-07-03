import React, { Component } from 'react';
import PropTypes from 'prop-types';
import sizer from 'react-sizer';

class TextAreaContent extends Component {
  static propTypes = {
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.onChange = this.onChange.bind(this);
  }

  onChange(event) {
    this.props.onChange(event.target.value);
  }

  render() {
    const { width, height, value } = this.props;

    return (
      <div className="text-area-content">
        <textarea value={value} onChange={this.onChange} style={{width, height}}></textarea>
      </div>
    );
  }
}

const SizerTextAreaContent = sizer()(TextAreaContent);

export default SizerTextAreaContent;