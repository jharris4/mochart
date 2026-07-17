<script>
  import { untrack } from 'svelte';

  import validators from 'valide';

  import TextAreaContent from '../misc/TextAreaContent.svelte';
  import ButtonWithTooltip from '../misc/ButtonWithTooltip.svelte';
  import Icon from '../misc/Icon.svelte';

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
    const objectValidator = validators.object();
    if (objectValidator(config)) {
      const validatorKeys = Object.keys(validatorObject);
      let hadKeyError = false;
      for (const validatorKey of validatorKeys) {
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
    const objectValidator = validators.object();
    const errorMessages = [];
    if (objectValidator(randomConfig)) {
      const errorPrefix = 'error - ';
      addErrorMessages(errorMessages, randomConfig.error, errorPrefix, configValidator.error);

      const groupPrefix = 'group - ';
      if (objectValidator(randomConfig.group)) {
        const groupConfig = randomConfig.group;
        const countPrefix = groupPrefix + 'count - ';
        addErrorMessage(errorMessages, groupConfig.count, countPrefix, configValidator.group.count);
        const numberPrefix = groupPrefix + 'number - ';
        addErrorMessages(errorMessages, groupConfig.number, numberPrefix, configValidator.group.number);
        const datePrefix = groupPrefix + 'date - ';
        addErrorMessages(errorMessages, groupConfig.date, datePrefix, configValidator.group.date);
        const stringPrefix = groupPrefix + 'string - ';
        addErrorMessages(errorMessages, groupConfig.string, stringPrefix, configValidator.group.string);
        if (errorMessages.length === 0) {
          const { count, number, date } = groupConfig;

          const minDate = new Date(date.min).getTime();
          const maxDate = new Date(date.max).getTime();
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
          dateInterval *= dateUnit;
          dateRange = Math.floor(dateRange / dateInterval);

          if (dateRange < count.max) {
            errorMessages.push(datePrefix + 'range insufficient to fulfill group count');
          }

          const min = number.min;
          const max = number.max;
          let range = max - min;
          const interval = number.interval;
          range = Math.floor(range / interval);

          if (range < count.max) {
            errorMessages.push(numberPrefix + 'range insufficient to fulfill group count');
          }
        }
      }
      else {
        errorMessages.push(groupPrefix + objectValidator.getErrorMessage(randomConfig.group));
      }

      const seriesPrefix = 'series - ';
      if (objectValidator(randomConfig.series)) {
        const seriesConfig = randomConfig.series;
        const numberPrefix = seriesPrefix + 'number - ';
        addErrorMessages(errorMessages, seriesConfig.number, numberPrefix, configValidator.series.number);
        const missingPrefix = seriesPrefix + 'missing - ';
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

  let { active = false, randomConfig, onUpdate, onReset } = $props();

  let configText = $state(formatConfig(randomConfig));

  let previousRandomConfig = randomConfig;
  $effect.pre(() => {
    const nextRandomConfig = randomConfig;
    untrack(() => {
      if (nextRandomConfig !== previousRandomConfig) {
        previousRandomConfig = nextRandomConfig;
        configText = formatConfig(nextRandomConfig);
      }
    });
  });

  function onTextChange(nextConfigText) {
    configText = nextConfigText;
  }

  function onUpdateClick() {
    try {
      const newConfig = JSON.parse(configText);
      newConfig.valid = validateConfig(newConfig);
      onUpdate(newConfig);
    }
    catch (error) {
      console.warn('Invalid Random Config JSON: ' + configText);
      alert('Invalid Random Config JSON');
    }
  }
</script>

<div class={"mochart-demo-tab-container col config" + (active ? " active" : "")}>
  <div class="mochart-demo-tab-content">
    <TextAreaContent value={configText} onChange={onTextChange} />
  </div>
  <div class="mochart-demo-tab-footer">
    <div class="btn-toolbar" role="toolbar">
      <ButtonWithTooltip id="config-reset" tooltipText="Reset" tooltipPlacement="top-start"
                         onClick={onReset} aria-label="Reset">
        <Icon size="lg" fixedWidth={true} name="undo" />
      </ButtonWithTooltip>
      <ButtonWithTooltip id="config-apply" tooltipText="Apply" tooltipPlacement="top-start"
                         onClick={onUpdateClick} aria-label="Apply">
        <Icon size="lg" fixedWidth={true} name="check" />
      </ButtonWithTooltip>
    </div>
  </div>
</div>
