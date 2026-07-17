import React, { Component } from 'react';
import PropTypes from 'prop-types';

import TextAreaContent from '../misc/TextAreaContent';

function formatData(dataJSON) {
  return JSON.stringify(dataJSON).replace(/,/g, ', ').replace(/},/g, '},\n');
}

class RandomMochartDataTab extends Component {
  static propTypes = {
    active: PropTypes.bool,
    data: PropTypes.array.isRequired
  };

  constructor(props) {
    super(props);
    this.state = { dataText: null };
  }

  UNSAFE_componentWillMount() {
    const { data } = this.props;
    this.setState({dataText: formatData(data)});
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { data } = nextProps;
    if (data !== this.props.data) {
      this.setState({dataText: formatData(data)});
    }
  }

  render() {
    const { active } = this.props;
    const { dataText } = this.state;

    return (
      <div className={"mochart-demo-tab-container col data" + (active ? " active": "")}>
        <div className="mochart-demo-tab-content">
          <TextAreaContent value={dataText} onChange={() => {}}/>
        </div>
      </div>
    );
  }
}

export default RandomMochartDataTab;