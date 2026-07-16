import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import { ButtonToolbar } from 'reactstrap';
import FontAwesome from 'react-fontawesome';

import validators from 'valide';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import TextAreaContent from '../misc/TextAreaContent';
import ButtonWithTooltip from '../misc/ButtonWithTooltip';

const objectValidator = validators.object();
const arrayValidator = validators.array();

function formatConfig(transitionConfig) {
  if (transitionConfig && objectValidator(transitionConfig)) {
    let configText = '{}';
    let dataText = '[]';
    if (transitionConfig.config && objectValidator(transitionConfig.config)) {
      configText = JSON.stringify(transitionConfig.config, null, '\t');
      configText = configText.replace(/\n\t/g, '\n\t\t');
      configText = configText.replace(/\n}/g, '\n\t}');
    }
    if (transitionConfig.data && arrayValidator(transitionConfig.data)) {
      const dataArray = transitionConfig.data;
      let dataTexts = [];
      let aDataText;
      for (let data of dataArray) {
        if (data && arrayValidator(data)) {
          aDataText = JSON.stringify(data).replace(/},{/g, '},\n\t\t\t{').replace(/,/g, ', ');
          aDataText = aDataText.replace(/\[{/, '[\n\t\t\t{');
          aDataText = aDataText.replace(/}\]/, '}\n\t\t]');
          dataTexts.push(aDataText);
        }
      }
      dataText = '[\n\t\t' + dataTexts.join(',\n\t\t') + '\n\t]';
    }
    return '{\n' + '\t"config": ' + configText + ',\n\t"data": ' + dataText + '\n}';
  }
  else {
    return transitionConfig;
  }
}

export default class MultiMochartChartsTab extends PureComponent {
  static propTypes = {
    active: PropTypes.bool.isRequired,
    transitionConfig: PropTypes.object.isRequired,
    onUpdate: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = { configText: null };
  }

  componentWillMount() {
    const { transitionConfig } = this.props;
    this.setState({ configText: formatConfig(transitionConfig) });
  }

  componentWillReceiveProps(nextProps) {
    const { transitionConfig } = nextProps;
    if (transitionConfig !== this.props.transitionConfig) {
      this.setState({ configText: formatConfig(transitionConfig) });
    }
  }

  @autobind
  onTextChange(configText) {
    this.setState({configText});
  }

  @autobind
  onReset() {
    const { onReset } = this.props;
    onReset();
  }

  @autobind
  onUpdate() {
    const { onUpdate } = this.props;
    const { configText } = this.state;
    try {
      let newConfig = JSON.parse(configText);
      if (objectValidator(newConfig)) {
        if (objectValidator(newConfig.config)) {
          const mochartDemoConfig = buildMochartDemoConfig(newConfig.config);
          const { configValidation } = mochartDemoConfig;
          const { valid, errors, warnings } = configValidation;
          if (valid) {
            if (arrayValidator(newConfig.data) && !newConfig.data.some(aData => !arrayValidator(aData))) {
              onUpdate(newConfig);
            }
            else {
              console.warn('Invalid Transition Config, data should be an array of arrays: ', newConfig.data);
              alert('Invalid Transition Data, should be an array of arrays');
            }
          }
          else {
            if (errors.length > 0) {
              console.warn('errors: ', errors);
            }
            if (warnings.length > 0) {
              console.warn('warnings: ', warnings);
            }
            alert('Invalid Chart Config, mochart config was not valid');
          }
        }
        else {
          console.warn('Invalid Transition Config, config should be an object: ', newConfig.config);
          alert('Invalid Chart Config, should be an object');
        }
      }
      else {
        console.warn('Invalid Transition Config, should be an object: ', configText);
        alert('Invalid Transition Config, should be an object');
      }
    }
    catch (error) {
      console.warn('Invalid Transition Config JSON: ', configText);
      alert('Invalid Transition Config JSON');
    }
  }

  render() {
    const { active } = this.props;
    const { configText } = this.state;

    return (
      <div className={"mochart-demo-tab-container col config" + (active ? " active": "")}>
        <div className="mochart-demo-tab-content">
          <TextAreaContent value={configText} onChange={this.onTextChange}/>
        </div>
        <div className="mochart-demo-tab-footer">
          <ButtonToolbar>
            <ButtonWithTooltip id="config-reset" tooltipText="Reset" tooltipPlacement="top-start"
                               onClick={this.onReset} aria-label="Reset">
              <FontAwesome size="lg" fixedWidth={true} name="undo"/>
            </ButtonWithTooltip>
            <ButtonWithTooltip id="config-apply" tooltipText="Apply" tooltipPlacement="top-start"
                               onClick={this.onUpdate} aria-label="Apply">
              <FontAwesome size="lg" fixedWidth={true} name="check"/>
            </ButtonWithTooltip>
          </ButtonToolbar>
        </div>
      </div>
    );
  }
}
