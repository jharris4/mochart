import React, { Component } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import { ButtonToolbar } from 'reactstrap';
import FontAwesome from 'react-fontawesome';

import { ArrayOfObjectsDataProvider, getDataErrors } from 'mochart';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import TextAreaContent from '../misc/TextAreaContent';
import ButtonWithTooltip from '../misc/ButtonWithTooltip';

function formatData(dataJSON) {
  return JSON.stringify(dataJSON).replace(/,/g, ', ').replace(/},/g, '},\n');
}

function isObject(v) {
  return v !== null && v !== void 0 && typeof v === "object";
}

function isArrayOfObjects(data) {
  return Array.isArray(data) && !data.some(v => !isObject(v));
}

class MochartDataTab extends Component {
  static propTypes = {
    active: PropTypes.bool,
    config: PropTypes.object,
    data: PropTypes.array,
    onDataChange: PropTypes.func.isRequired,
    onDataError: PropTypes.func.isRequired,
    onDataReset: PropTypes.func.isRequired
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

  @autobind
  onTextChange(dataText) {
    this.setState({dataText});
  }

  @autobind
  resetData() {
    const { data, onDataReset } = this.props;
    this.setState({dataText: formatData(data)});
    onDataReset();
  }

  @autobind
  applyData() {
    const { dataText } = this.state;
    const { onDataChange, onDataError } = this.props;
    try {
      let data = JSON.parse(dataText);
      let error = null;
      if (isArrayOfObjects(data)) {
        const { config } = this.props;
        const { mochartConfig } = buildMochartDemoConfig(config);
        if (mochartConfig.validation.valid) {
          const dataErrors = getDataErrors(mochartConfig, new ArrayOfObjectsDataProvider(data, mochartConfig.groupAxisConfig.property));
          if (dataErrors.length > 0) {
            console.warn('Invalid Data - Content Errors: ', dataErrors.join('\n'));
            error = 'Invalid Data Content';
          }
        }
        else {
          console.warn('Could not validate data since mochart config was not valid');
          error = 'Invalid Config & Data';
        }
      }
      else {
        console.warn('Invalid Data - should be an array of objects');
        error = 'Invalid Data';
      }
      if (error) {
        onDataError(error);
      }
      else {
        onDataChange(data);
      }
    }
    catch (error) {
      console.warn('Invalid Data JSON: ' + error);
      alert('Invalid Data JSON');
      onDataError('Invalid Data ');
    }
  }

  render() {
    const { active } = this.props;
    const { dataText } = this.state;

    return (
      <div className={"mochart-demo-tab-container col data" + (active ? " active": "")}>
        <div className="mochart-demo-tab-content">
          <TextAreaContent value={dataText} onChange={this.onTextChange}/>
        </div>
        <div className="mochart-demo-tab-footer">
          <ButtonToolbar>
            <ButtonWithTooltip id="data-reset" tooltipText="Reset" tooltipPlacement="top-start"
                               onClick={this.resetData} aria-label="Reset">
              <FontAwesome size="lg" fixedWidth={true} name="undo"/>
            </ButtonWithTooltip>
            <ButtonWithTooltip id="data-apply" tooltipText="Apply" tooltipPlacement="top-start"
                               onClick={this.applyData} aria-label="Apply">
              <FontAwesome size="lg" fixedWidth={true} name="check"/>
            </ButtonWithTooltip>
          </ButtonToolbar>
        </div>
      </div>
    );
  }
}

export default MochartDataTab;