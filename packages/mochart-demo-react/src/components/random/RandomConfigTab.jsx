import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import { ButtonToolbar } from 'reactstrap';
import FontAwesome from 'react-fontawesome';

import validators from 'valide';

import TextAreaContent from '../misc/TextAreaContent';
import ButtonWithTooltip from '../misc/ButtonWithTooltip';

const configValidator = {
  error: {
    probability: validators.numberMinMax(0, 1)
  },
  group: {
    count: validators.integerMin(0),
    order: {
      sort: validators.boolean()
    },
    reuse: {
      globalPercentage: validators.numberMinMax(0, 1),
      stepPercentage: validators.numberMinMax(0, 1)
    },
    number: {
      rangeValidator: o => o.min <= o.max,
      min: validators.number(),
      max: validators.number(),
      interval: validators.numberMin(0.001)
    },
    date: {
      rangeValidator: o => new Date(o.min) <= new Date(o.max),
      min: validators.dateAny(),
      max: validators.dateAny(),
      interval: validators.integerMin(1),
      intervalUnit: validators.oneOf(['second', 'minute', 'hour', 'day'])
    },
    string: {
      rangeValidator: o => o.minLength <= o.maxLength,
      minLength: validators.integerMin(1),
      maxLength: validators.integerMax(20)
    }
  },
  series: {
    number: {
      rangeValidator: o => o.min <= o.max,
      min: validators.number(),
      max: validators.number(),
      limitToAxisConfig: validators.boolean()
    },
    missing: {
      probability: validators.numberMinMax(0, 1)
    },
    reuse: {
      global: validators.boolean(),
      step: validators.boolean()
    }
  }
};

function addErrorMessage(errorMessages, config, prefix, validator) {
  if (!validator(config)) {
    errorMessages.push(prefix + validator.getErrorMessage(config));
  }
}

function addErrorMessages(errorMessages, config, prefix, validatorObject) {
  let objectValidator = validators.object();
  if (objectValidator(config)) {
    let validatorKeys = Object.keys(validatorObject);
    let hadKeyError = false;
    for (let validatorKey of validatorKeys) {
      if (validatorKey !== 'rangeValidator') {
        if (!validatorObject[validatorKey](config[validatorKey])) {
          errorMessages.push(prefix + validatorKey + ' - ' + validatorObject[validatorKey].getErrorMessage(config[validatorKey]));
          hadKeyError = true;
        }
      }
    }
    if (!hadKeyError && validatorObject.rangeValidator) {
      if (!validatorObject.rangeValidator(config)) {
        errorMessages.push(prefix + 'min must be <= max');
      }
    }
  }
  else {
    errorMessages.push(prefix + objectValidator.getErrorMessage(config));
  }
}

function validateConfig(randomConfig) {
  let objectValidator = validators.object();
  let errorMessages = [];
  if (objectValidator(randomConfig)) {
    let errorPrefix = 'error - ';
    addErrorMessages(errorMessages, randomConfig.error, errorPrefix, configValidator.error);

    let groupPrefix = 'group - ';
    if (objectValidator(randomConfig.group)) {
      let groupConfig = randomConfig.group;
      let countPrefix = groupPrefix + 'count - ';
      addErrorMessage(errorMessages, groupConfig.count, countPrefix, configValidator.group.count);
      let numberPrefix = groupPrefix + 'number - ';
      addErrorMessages(errorMessages, groupConfig.number, numberPrefix, configValidator.group.number);
      let datePrefix = groupPrefix + 'date - ';
      addErrorMessages(errorMessages, groupConfig.date, datePrefix, configValidator.group.date);
      let stringPrefix = groupPrefix + 'string - ';
      addErrorMessages(errorMessages, groupConfig.string, stringPrefix, configValidator.group.string);
      if (errorMessages.length === 0) {
        const { count, number, date } = groupConfig;

        let minDate = new Date(date.min).getTime();
        let maxDate = new Date(date.max).getTime();
        let dateRange = maxDate - minDate;
        let dateInterval = date.interval;
        let dateUnit = 1;
        if (date.intervalUnit === 'second') {
          dateUnit = 1000;
        }
        else if (date.intervalUnit === 'minute') {
          dateUnit = 60000;
        }
        else if (date.intervalUnit === 'hour') {
          dateUnit = 3600000;
        }
        else if (date.intervalUnit === 'day') {
          dateUnit = 86400000;
        }
        dateInterval*= dateUnit;
        dateRange = Math.floor(dateRange / dateInterval);

        if (dateRange < count.max) {
          errorMessages.push(datePrefix + 'range insufficient to fulfill group count');
        }

        let min = number.min;
        let max = number.max;
        let range = max - min;
        let interval = number.interval;
        range = Math.floor(range / interval);

        if (range < count.max) {
          errorMessages.push(numberPrefix + 'range insufficient to fulfill group count');
        }
      }
    }
    else {
      errorMessages.push(groupPrefix + objectValidator.getErrorMessage(randomConfig.group));
    }

    let seriesPrefix = 'series - ';
    if (objectValidator(randomConfig.series)) {
      let seriesConfig = randomConfig.series;
      let numberPrefix = seriesPrefix + 'number - ';
      addErrorMessages(errorMessages, seriesConfig.number, numberPrefix, configValidator.series.number);
      let missingPrefix = seriesPrefix + 'missing - ';
      addErrorMessages(errorMessages, seriesConfig.missing, missingPrefix, configValidator.series.missing);
    }
    else {
      errorMessages.push(seriesPrefix + objectValidator.getErrorMessage(randomConfig.series));
    }
  }
  else {
    errorMessages.push(objectValidator.getErrorMessage(randomConfig));
  }
  if (errorMessages.length > 0) {
    console.warn('random config had error messages: ', errorMessages.join('\n'));
  }
  return errorMessages.length === 0;
}

function formatConfig(config) {
  return JSON.stringify({ error: config.error, group: config.group, series: config.series }, null, '\t');
}

export default class RandomMochartConfigTab extends PureComponent {
  static propTypes = {
    active: PropTypes.bool,
    randomConfig: PropTypes.object.isRequired,
    onUpdate: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = { configText: null };
  }

  UNSAFE_componentWillMount() {
    const { randomConfig } = this.props;
    this.setState({ configText: formatConfig(randomConfig) });
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { randomConfig } = nextProps;
    if (randomConfig !== this.props.randomConfig) {
      this.setState({ configText: formatConfig(randomConfig) });
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
      newConfig.valid = validateConfig(newConfig);
      onUpdate(newConfig);
    }
    catch (error) {
      console.warn('Invalid Random Config JSON: ' + configText);
      alert('Invalid Random Config JSON');
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
