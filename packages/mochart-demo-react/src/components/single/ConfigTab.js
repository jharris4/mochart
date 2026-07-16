import React, { Component } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import { ButtonToolbar } from 'reactstrap';
import FontAwesome from 'react-fontawesome';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import TextAreaContent from '../misc/TextAreaContent';
import ButtonWithTooltip from '../misc/ButtonWithTooltip';

const slowAnimationConfig = {
  "animate": true,
  "initialDuration": 5000,
  "expansionDuration": 3000,
  "valueChangeDuration": 5000,
  "collapseDuration": 3000,
  "focusDuration": 2500
};

function formatConfig(config) {
  return JSON.stringify(config, null, '\t');
}

function formatMochartDemoConfig(mochartDemoConfig, showDefaults) {
  const { configWithDefaults, configWithoutDefaults } = mochartDemoConfig;
  return formatConfig(showDefaults ? configWithDefaults : configWithoutDefaults);
}

function copyDemoConfig(mochartDemoConfig) {
  const { configWithDefaults, configWithoutDefaults } = mochartDemoConfig;
  return JSON.parse(JSON.stringify({ configWithDefaults, configWithoutDefaults }));
}

function parseConfig(configText) {
  try {
    return JSON.parse(configText);
  }
  catch (error) {
    console.warn('Invalid Chart Config JSON: ' + configText);
    alert('Invalid Chart Config JSON');
    return null;
  }
}

class MochartConfigTab extends Component {
  static propTypes = {
    active: PropTypes.bool,
    config: PropTypes.object, // TODO isDefined
    onConfigChange: PropTypes.func.isRequired,
    onConfigReset: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = { mochartDemoConfig: null, demoConfig: null, showDefaults: false, configText: null };
  }

  componentWillMount() {
    const { config } = this.props;
    const mochartDemoConfig = buildMochartDemoConfig(config);
    const demoConfig = copyDemoConfig(mochartDemoConfig);
    const { showDefaults } = this.state;
    const configText = formatMochartDemoConfig(demoConfig, showDefaults);
    this.setState({ mochartDemoConfig, demoConfig, configText });
  }

  componentWillReceiveProps(nextProps) {
    const { config } = nextProps;
    if (config !== this.props.config) {
      const mochartDemoConfig = buildMochartDemoConfig(config);
      let demoConfig = copyDemoConfig(mochartDemoConfig);
      const { showDefaults } = this.state;
      const configText = formatMochartDemoConfig(demoConfig, showDefaults);
      this.setState({ mochartDemoConfig, demoConfig, configText });
    }
  }

  @autobind
  onTextChange(configText) {
    this.setState({ configText });
  }

  @autobind
  resetConfig() {
    const { onConfigReset } = this.props;
    onConfigReset();
  }

  updateShowDefaults(showDefaults) {
    const { configText } = this.state;
    try {
      const newConfig = JSON.parse(configText);
      const mochartDemoConfig = buildMochartDemoConfig(newConfig);
      const { configValidation } = mochartDemoConfig;
      const { valid } = configValidation;
      if (valid) {
        this.setState({ showDefaults, configText: formatMochartDemoConfig(mochartDemoConfig, showDefaults) });
      }
      else {
        const { errors, warnings } = configValidation;
        if (errors.length > 0) {
          console.warn('errors: ', errors);
        }
        if (warnings.length > 0) {
          console.warn('warnings: ', warnings);
        }
        alert('Invalid Chart Config');
      }
    }
    catch (error) {
      console.log('**** error', error);
      console.warn('Invalid Chart Config JSON: ' + configText);
      alert('Invalid Chart Config JSON');
    }
  }

  @autobind
  toggleConfigDefaults() {
    const { showDefaults } = this.state;
    this.updateShowDefaults(!showDefaults);
  }

  toggleConfigProperty(mochartDemoConfig, section, key, defaultValue) {
    if (mochartDemoConfig) {
      let { configWithDefaults, configWithoutDefaults } = mochartDemoConfig;
      configWithDefaults = { ...configWithDefaults };
      configWithoutDefaults = { ...configWithoutDefaults };
      const sectionConfig = configWithoutDefaults[section];
      if (!sectionConfig) {
        configWithoutDefaults[section] = { [key]: defaultValue };
        configWithDefaults[section] = { ...configWithDefaults[section], [key]: defaultValue };
      }
      else {
        configWithoutDefaults[section] = { ...sectionConfig, [key]: !sectionConfig[key] };
        configWithDefaults[section] = { ...configWithDefaults[section], [key]: !sectionConfig[key] };
      }
      return {
        configWithDefaults, configWithoutDefaults
      };
    }
  }

  toggleConfigSection(mochartDemoConfig, demoConfig, section, defaultSection) {
    if (mochartDemoConfig && demoConfig) {
      let { configWithDefaults, configWithoutDefaults } = demoConfig;
      configWithDefaults = { ...configWithDefaults };
      configWithoutDefaults = { ...configWithoutDefaults };
      const sectionConfig = configWithoutDefaults[section];
      if (!sectionConfig) {
        configWithoutDefaults[section] = defaultSection;
        configWithDefaults[section] = defaultSection;
      }
      else {
        configWithoutDefaults[section] = configWithoutDefaults[section] === defaultSection ? mochartDemoConfig.configWithoutDefaults[section] : defaultSection;
        configWithDefaults[section] = configWithDefaults[section] === defaultSection ? mochartDemoConfig.configWithDefaults[section] : defaultSection;
      }
      return {
        configWithDefaults, configWithoutDefaults
      };
    }
  }

  @autobind
  toggleConfigInverted() {
    let { demoConfig, showDefaults } = this.state;
    demoConfig = this.toggleConfigProperty(demoConfig, 'plotConfig', 'inverted', true);
    this.setState({ demoConfig, configText: formatMochartDemoConfig(demoConfig, showDefaults) });
  }

  @autobind
  toggleConfigAnimationSlow() {
    let { mochartDemoConfig, demoConfig, showDefaults } = this.state;
    demoConfig = this.toggleConfigSection(mochartDemoConfig, demoConfig, 'animationConfig', slowAnimationConfig);
    this.setState({ demoConfig, configText: formatMochartDemoConfig(demoConfig, showDefaults) });
  }

  @autobind
  applyConfig() {
    const { configText } = this.state;
    const config = parseConfig(configText)
    if (config !== null) {
      const { onConfigChange } = this.props;
      onConfigChange(config);
    }
  }

  render() {
    const { active } = this.props;
    const { showDefaults, demoConfig, configText } = this.state;
    let { configWithDefaults } = demoConfig;
    const { inverted } = configWithDefaults.plotConfig;

    const invertedIcon = inverted ? 'caret-square-o-up' : 'caret-square-o-right';
    const slowIcon = configWithDefaults.animationConfig === slowAnimationConfig ? 'hourglass' : 'hourglass-end';

    return (
      <div className={"mochart-demo-tab-container col config" + (active ? " active": "")}>
        <div className="mochart-demo-tab-content">
          <TextAreaContent value={configText} onChange={this.onTextChange}/>
        </div>
        <div className="mochart-demo-tab-footer">
          <ButtonToolbar>
            <ButtonWithTooltip id="config-reset" tooltipText="Reset" tooltipPlacement="top-start"
                               onClick={this.resetConfig} aria-label="Reset">
              <FontAwesome size="lg" fixedWidth={true} name="undo"/>
            </ButtonWithTooltip>
            <ButtonWithTooltip id="config-defaults" tooltipText="Toggle Defaults" tooltipPlacement="top-start"
                               onClick={this.toggleConfigDefaults} aria-label="Toggle Defaults">
              <FontAwesome size="lg" fixedWidth={true} name="crosshairs"/>
            </ButtonWithTooltip>
            <ButtonWithTooltip id="config-inverted" tooltipText="Toggle Inverted" tooltipPlacement="top-start"
              onClick={this.toggleConfigInverted} aria-label="Toggle Inverted">
              <FontAwesome size="lg" fixedWidth={true} name={invertedIcon} />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="config-animate-slow" tooltipText="Toggle Slow" tooltipPlacement="top-start"
              onClick={this.toggleConfigAnimationSlow} aria-label="Toggle Slow">
              <FontAwesome size="lg" fixedWidth={true} name={slowIcon} />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="config-apply" tooltipText="Apply" tooltipPlacement="top-start"
                               onClick={this.applyConfig} aria-label="Apply">
              <FontAwesome size="lg" fixedWidth={true} name="check"/>
            </ButtonWithTooltip>
          </ButtonToolbar>
        </div>
      </div>
    );
  }
}

export default MochartConfigTab;