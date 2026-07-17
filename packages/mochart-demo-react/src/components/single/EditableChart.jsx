import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import { ButtonToolbar, ButtonGroup, Form, FormGroup, Input } from 'reactstrap';
import FontAwesome from 'react-fontawesome';
import sizer from 'react-sizer';

import { hasConfigStructureChange, NONE, ArrayOfObjectsDataProvider } from 'mochart';
import { Chart } from 'mochart-react';

import ButtonWithTooltip from '../misc/ButtonWithTooltip';

// Width comes from the parent as an explicit prop; the sizer only measures
// the available height (the old code used the same widthProp trick).
const SizerChart = sizer({ widthProp: 'dontwantwidth' })(Chart);

const emptyGroupText = "Select Group(s)";

export default class EditableChart extends PureComponent {
  static propTypes = {
    width: PropTypes.number.isRequired,
    mochartDemoConfig: PropTypes.object.isRequired,
    data: PropTypes.array.isRequired,
    dataError: PropTypes.any,
    isActive: PropTypes.bool.isRequired,
    chartCount: PropTypes.number.isRequired,
    showChartCountControls: PropTypes.bool.isRequired,
    filteredSeriesIds: PropTypes.object.isRequired,
    focusedGroupIndex: PropTypes.number.isRequired,
    focusedSeriesAxisId: PropTypes.string, // TODO add isDefined
    focusedSeriesId: PropTypes.string, // TODO add isDefined
    onFocus: PropTypes.func.isRequired,
    onSeriesFilter: PropTypes.func.isRequired,
    onChartCountToggle: PropTypes.func.isRequired
  };

  static defaultProps = {

  };

  constructor(props) {
    super(props);
    this.filteredData = null;
    this.removedData = null;
    this.state = {
      dataProvider: null,
      groupIndex: -1,
      groupValuesText: "",
      seriesIndex: 0,
      seriesValuesText: "",
      selectionMode: 'group',
      filteredData: null,
      sequencePlaying: false
    };
  }

  updateFilteredDataState(nextState, filteredData, removedData, props, resetGroupIndex = true) {
    const { mochartDemoConfig, dataError } = props;
    this.filteredData = filteredData;
    this.removedData = removedData;
    if (resetGroupIndex === true) {
      nextState.groupIndex = -1;
      nextState.seriesValuesText = "Select a Group";
    }
    nextState.filteredFocusedGroupIndex = dataError ? -1 : this.getFilteredFocusedGroupIndex(props, filteredData);
    nextState.filteredData = filteredData;
    if (!dataError && mochartDemoConfig.mochartConfig.validation.valid) {
      nextState.dataProvider = new ArrayOfObjectsDataProvider(nextState.filteredData, mochartDemoConfig.mochartConfig.groupAxisConfig.property);
    }
    else if (dataError) {
      nextState.dataProvider = { getError: () => dataError };
    }
    else {
      nextState.dataProvider = null;
    }
    this.setState(nextState);
  }

  getFilteredFocusedGroupIndex(props, filteredData) {
    const { mochartDemoConfig, data, focusedGroupIndex } = props;
    let filteredFocusedGroupIndex = -1;
    if (focusedGroupIndex >= 0) {
      const { groupProperty } = mochartDemoConfig;
      const groupValue = data[focusedGroupIndex][groupProperty];
      let i, count = filteredData.length;
      for (i = 0; i < count; i++) {
        if (filteredData[i][groupProperty] === groupValue) {
          filteredFocusedGroupIndex = i;
          break;
        }
      }
    }
    return filteredFocusedGroupIndex;
  }

  initData(props) {
    const orderChanged = false;
    const { data, dataError } = props;
    let filteredData = [];
    if (data && !dataError) {
      let i, count = data.length;
      for (i=0; i<count; i++) {
        filteredData.push(Object.assign({}, data[i]));
      }
    }
    let seriesIndex = 0;
    let groupValuesText = emptyGroupText;
    this.updateFilteredDataState({orderChanged, seriesIndex, groupValuesText}, filteredData, [], props);
  }

  UNSAFE_componentWillMount() {
    this.initData(this.props);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { mochartDemoConfig, data, dataError, focusedGroupIndex, isActive } = nextProps;
    if (data !== this.props.data || dataError !== this.props.dataError ||
        (mochartDemoConfig !== this.props.mochartDemoConfig &&
         hasConfigStructureChange(this.props.mochartDemoConfig.mochartConfig, mochartDemoConfig.mochartConfig))) {
      this.initData(nextProps);
    }
    else if (focusedGroupIndex !== this.props.focusedGroupIndex) {
      const { filteredData } = this.state;
      this.setState({ filteredFocusedGroupIndex: this.getFilteredFocusedGroupIndex(nextProps, filteredData) });
    }
    if (isActive === false) {
      this.stopSequence();
    }
  }

  // mochart's ManagedChart reports focus with the new payload shape; adapt it
  // to the { seriesAxisId, seriesId, groupIndex } shape this demo tracks.
  @autobind
  onChartFocus({ focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex }) {
    this.onFocus({ seriesAxisId: focusedSeriesAxisId, seriesId: focusedSeriesId, groupIndex: focusedGroupIndex });
  }

  @autobind
  onFocus({ seriesAxisId, seriesId, groupIndex }) {
    if (groupIndex !== void 0) {
      const filteredFocusedGroupIndex = groupIndex;
      const { mochartDemoConfig, data, onFocus } = this.props;
      let newFocusedGroupIndex = -1;
      if (filteredFocusedGroupIndex >= 0) {
        const { groupProperty } = mochartDemoConfig;
        const { filteredData } = this.state;
        let groupValue = filteredData[filteredFocusedGroupIndex][groupProperty];
        let i, count = data.length;
        for (i = 0; i < count; i++) {
          if (data[i][groupProperty] === groupValue) {
            newFocusedGroupIndex = i;
            break;
          }
        }
      }
      this.setState({ filteredFocusedGroupIndex });
      onFocus({ seriesAxisId, seriesId, groupIndex: newFocusedGroupIndex });
    }
    else {
      const { onFocus } = this.props;
      onFocus({ seriesAxisId, seriesId, groupIndex });
    }
  }

  @autobind
  onChartClick({ groupIndex }) {
    const { mochartDemoConfig } = this.props;
    const { filteredData, selectionMode, groupValuesText, seriesIndex } = this.state;
    const { groupProperty } = mochartDemoConfig;
    let clickedGroupValue = "" + filteredData[groupIndex][groupProperty];
    if (selectionMode === 'series') {
      let seriesValuesText = this.getSeriesValuesText(mochartDemoConfig, filteredData, groupIndex, seriesIndex);
      this.setState({groupIndex, seriesValuesText});
    }
    else if (selectionMode === 'group') {
      let dataGroupValues = [];
      let i, count = filteredData.length;
      for (i=0; i<count; i++) {
        dataGroupValues.push(filteredData[i][groupProperty]);
      }
      let parsedGroupValues = groupValuesText === emptyGroupText ? [] : groupValuesText.split(',');
      parsedGroupValues = parsedGroupValues.filter((parsedGroupValue) => dataGroupValues.indexOf(parsedGroupValue) !== -1 || dataGroupValues.indexOf(+parsedGroupValue) !== -1);
      let clickedIndex = parsedGroupValues.indexOf(clickedGroupValue);
      if (clickedIndex === -1) {
        parsedGroupValues = parsedGroupValues.concat(clickedGroupValue);
      }
      else {
        parsedGroupValues.splice(clickedIndex, 1);
      }
      this.setState({groupValuesText: parsedGroupValues.length === 0 ? emptyGroupText : parsedGroupValues.join(',')});
    }
  }

  @autobind
  onSeriesModeClick() {
    this.setState({selectionMode: 'series'});
  }

  @autobind
  onGroupModeClick() {
    this.setState({selectionMode: 'group'});
  }

  @autobind
  onModeToggle() {
    let { selectionMode } = this.state;
    if (selectionMode === 'group') {
      selectionMode = 'series';
    }
    else {
      selectionMode = 'group';
    }
    this.setState({selectionMode});
  }

  @autobind
  selectAllGroups() {
    const { mochartDemoConfig, data } = this.props;
    const { groupProperty } = mochartDemoConfig;
    const allGroupValues = [];
    let i, count = data.length;
    for (i=0; i<count; i++) {
      allGroupValues.push(data[i][groupProperty]);
    }
    this.setState({groupValuesText: allGroupValues.join(',')});
  }

  @autobind
  resetGroups() {
    const orderChanged = false;
    const { mochartDemoConfig, data } = this.props;
    const { filteredData: oldFilteredData, removedData } = this;
    const { groupProperty } = mochartDemoConfig;
    let groupToObjectMap = {};
    removedData.forEach(removedObject => {
      groupToObjectMap[removedObject[groupProperty]] = removedObject;
    });
    oldFilteredData.forEach(oldObject => {
      groupToObjectMap[oldObject[groupProperty]] = oldObject;
    });
    let filteredData = data.map(o => groupToObjectMap[o[groupProperty]]);
    this.updateFilteredDataState({ orderChanged }, filteredData, [], this.props);
  }

  @autobind
  reverseGroups() {
    const orderChanged = true;
    const { filteredData: oldFilteredData, removedData } = this;
    if (oldFilteredData && oldFilteredData.length > 1) {
      const filteredData = oldFilteredData.slice().reverse();
      this.updateFilteredDataState({ orderChanged }, filteredData, removedData, this.props);
    }
  }

  @autobind
  decreaseGroupOrder() {
    const { filteredData: oldFilteredData, removedData } = this;
    if (oldFilteredData && oldFilteredData.length > 1) {
      const orderChanged = true;
      const { groupIndex } = this.state;
      if (groupIndex > 0) {
        const filteredData = oldFilteredData.slice();
        const temp = filteredData[groupIndex - 1];
        filteredData[groupIndex - 1] = filteredData[groupIndex];
        filteredData[groupIndex] = temp;
        this.updateFilteredDataState({ orderChanged, groupIndex: groupIndex - 1 }, filteredData, removedData, this.props, false);
      }
    }
  }

  @autobind
  increaseGroupOrder() {
    const { filteredData: oldFilteredData, removedData } = this;
    if (oldFilteredData && oldFilteredData.length > 1) {
      const orderChanged = true;
      const { groupIndex } = this.state;
      if (groupIndex < oldFilteredData.length - 1) {
        const filteredData = oldFilteredData.slice();
        const temp = filteredData[groupIndex + 1];
        filteredData[groupIndex + 1] = filteredData[groupIndex];
        filteredData[groupIndex] = temp;
        this.updateFilteredDataState({ orderChanged, groupIndex: groupIndex + 1 }, filteredData, removedData, this.props, false);
      }
    }
  }

  @autobind
  groupValuesChanged(event) {
    this.setState({groupValuesText: event.target.value});
  }

  @autobind
  addGroups() {
    const { mochartDemoConfig, data } = this.props;
    const { filteredData: oldFilteredData, removedData: oldRemovedData } = this;
    const { groupValuesText } = this.state;
    const { groupProperty } = mochartDemoConfig;
    let groupValuesToAdd = groupValuesText === emptyGroupText ? [] : groupValuesText.split(",");
    let groupValueToAddMap = {};
    groupValuesToAdd.forEach(groupValueToAdd => {
      groupValueToAddMap[groupValueToAdd] = true;
    });
    let removedMap = {};
    oldRemovedData.forEach(removedObject => {
      removedMap[removedObject[groupProperty]] = removedObject;
    });
    let i, fi, count = data.length, filteredCount = oldFilteredData.length;
    let filteredData = [];
    for (i=0, fi=0; i<count; i++) {
      if (fi < filteredCount) {
        if (data[i][groupProperty] !== oldFilteredData[fi][groupProperty]) {
          if (groupValueToAddMap[data[i][groupProperty]] === true) {
            filteredData.push(removedMap[data[i][groupProperty]]);
            delete removedMap[data[i][groupProperty]];
          }
        }
        else {
          filteredData.push(oldFilteredData[fi]);
          fi++;
        }
      }
      else if (groupValueToAddMap[data[i][groupProperty]] === true) {
        filteredData.push(removedMap[data[i][groupProperty]]);
        delete removedMap[data[i][groupProperty]];
      }
    }
    let removedData = [];
    oldRemovedData.forEach(removedObject => {
      if (removedMap[removedObject[groupProperty]] !== void 0) {
        removedData.push(removedMap[removedObject[groupProperty]]);
      }
    });
    this.updateFilteredDataState({}, filteredData, removedData, this.props);
  }

  @autobind
  removeGroups() {
    const { mochartDemoConfig } = this.props;
    const { filteredData: oldFilteredData, removedData } = this;
    const { groupValuesText } = this.state;
    const { groupProperty  } = mochartDemoConfig;
    let groupValuesToRemove = groupValuesText === emptyGroupText ? [] : groupValuesText.split(",");
    let groupValueToRemoveMap = {};
    groupValuesToRemove.forEach(groupValueToRemove => {
      groupValueToRemoveMap[groupValueToRemove] = true;
    });
    let i, count = oldFilteredData.length;
    let filteredData = [];
    for (i=0; i<count; i++) {
      if (groupValueToRemoveMap[oldFilteredData[i][groupProperty]] !== true) {
        filteredData.push(oldFilteredData[i]);
      }
      else {
        removedData.push(oldFilteredData[i]);
      }
    }
    this.updateFilteredDataState({}, filteredData, removedData, this.props);
  }

  @autobind
  startAddSequence() {
    const { mochartDemoConfig, data } = this.props;
    const { filteredData: oldFilteredData, removedData: oldRemovedData } = this;
    const { groupValuesText } = this.state;
    const { groupProperty } = mochartDemoConfig;
    let groupValuesToAdd = groupValuesText === emptyGroupText ? [] : groupValuesText.split(",");
    let groupValueToAddMap = {};
    groupValuesToAdd.forEach(groupValueToAdd => {
      groupValueToAddMap[groupValueToAdd] = true;
    });
    let removedIndexMap = {};
    oldRemovedData.forEach((removedObject, removedIndex) => {
      removedIndexMap[removedObject[groupProperty]] = removedIndex;
    });
    let groupObjectsToAdd = [];
    let i, fi, count = data.length, filteredCount = oldFilteredData.length;
    for (i=0, fi=0; i<count; i++) {
      if (fi < filteredCount) {
        if (data[i][groupProperty] !== oldFilteredData[fi][groupProperty]) {
          if (groupValueToAddMap[data[i][groupProperty]] === true) {
            groupObjectsToAdd.push({
              removedIndex: removedIndexMap[data[i][groupProperty]] - groupObjectsToAdd.length,
              dataIndex: fi + groupObjectsToAdd.length
            });
          }
        }
        else {
          fi++;
        }
      }
      else if (groupValueToAddMap[data[i][groupProperty]] === true) {
        groupObjectsToAdd.push({
          removedIndex: removedIndexMap[data[i][groupProperty]] - groupObjectsToAdd.length,
          dataIndex: fi + groupObjectsToAdd.length
        });
      }
    }
    if (groupObjectsToAdd.length > 0) {
      this.setState({sequencePlaying: true}, () => {
        let addCount = 0;
        this.sequenceId = setInterval(() => {
          oldFilteredData.splice(groupObjectsToAdd[addCount].dataIndex, 0, oldRemovedData.splice(groupObjectsToAdd[addCount].removedIndex, 1)[0]);
          this.updateFilteredDataState({}, oldFilteredData, oldRemovedData, this.props);
          if (addCount < groupObjectsToAdd.length -1) {
            addCount++;
          }
          else {
            this.stopSequence();
          }
        }, 2000);
      });
    }
  }

  @autobind
  startRemoveSequence() {
    const { mochartDemoConfig, data } = this.props;
    const { filteredData: oldFilteredData, removedData: oldRemovedData } = this;
    const { groupValuesText } = this.state;
    const { groupProperty } = mochartDemoConfig;
    let groupValuesToRemove = groupValuesText === emptyGroupText ? [] : groupValuesText.split(",");
    let groupValueToRemoveMap = {};
    groupValuesToRemove.forEach(groupValueToRemove => {
      groupValueToRemoveMap[groupValueToRemove] = true;
    });
    let removedIndexMap = {};
    oldRemovedData.forEach((removedObject, removedIndex) => {
      removedIndexMap[removedObject[groupProperty]] = removedIndex;
    });
    let groupObjectsToRemove = [];
    let i, fi, ri, count = data.length, filteredCount = oldFilteredData.length;
    for (i=0, fi=0, ri=0; i<count && fi < filteredCount; i++) {
      if (data[i][groupProperty] === oldFilteredData[fi][groupProperty]) {
        if (groupValueToRemoveMap[data[i][groupProperty]] === true) {
          groupObjectsToRemove.push({
            removedIndex: ri,
            dataIndex: fi - groupObjectsToRemove.length
          });
          ri++;
        }
        fi++;
      }
      else {
        ri++;
      }
    }
    if (groupObjectsToRemove.length > 0) {
      this.setState({sequencePlaying: true}, () => {
        let removeCount = 0;
        this.sequenceId = setInterval(() => {
          oldRemovedData.splice(groupObjectsToRemove[removeCount].removedIndex, 0, oldFilteredData.splice(groupObjectsToRemove[removeCount].dataIndex, 1)[0]);
          this.updateFilteredDataState({}, oldFilteredData, oldRemovedData, this.props);
          if (removeCount < groupObjectsToRemove.length -1) {
            removeCount++;
          }
          else {
            this.stopSequence();
          }
        }, 2000);
      });
    }
  }

  @autobind
  stopSequence() {
    this.stopSequenceInternal();
    this.setState({sequencePlaying: false});
  }

  stopSequenceInternal() {
    if (this.sequenceId !== null) {
      clearInterval(this.sequenceId);
      this.sequenceId = null;
    }
  }

  @autobind
  prevSeries() {
    const { mochartDemoConfig } = this.props;
    const { groupIndex } = this.state;
    const { filteredData } = this;
    let { seriesIndex } = this.state;
    if (groupIndex !== -1 && seriesIndex > 0) {
      seriesIndex--;
      let seriesValuesText = this.getSeriesValuesText(mochartDemoConfig, filteredData, groupIndex, seriesIndex);
      this.setState({seriesIndex, seriesValuesText});
    }
  }

  @autobind
  nextSeries() {
    const { mochartDemoConfig } = this.props;
    const { groupIndex } = this.state;
    const { filteredData } = this;
    const { seriesCount } = mochartDemoConfig;
    let { seriesIndex } = this.state;
    if (groupIndex !== -1 && seriesIndex < seriesCount -1) {
      seriesIndex++;
      let seriesValuesText = this.getSeriesValuesText(mochartDemoConfig, filteredData, groupIndex, seriesIndex);
      this.setState({seriesIndex, seriesValuesText});
    }
  }

  getSeriesValuesText({ mochartConfig }, filteredData, groupIndex, seriesIndex) {
    const dataObject = filteredData[groupIndex];
    const { seriesConfigs } = mochartConfig;
    if (seriesConfigs.length > 0) {
      const seriesConfig = seriesConfigs[seriesIndex];
      const { property, rangeProperty, markerProperty, labelProperty, colorProperty } = seriesConfig;
      const seriesValuesTextObject = {};
      seriesValuesTextObject['p'] = dataObject[property];
      if (rangeProperty !== NONE) {
        seriesValuesTextObject['r'] = dataObject[rangeProperty];
      }
      if (markerProperty !== NONE) {
        seriesValuesTextObject['m'] = dataObject[markerProperty];
      }
      if (labelProperty !== NONE) {
        seriesValuesTextObject['l'] = dataObject[labelProperty];
      }
      if (colorProperty !== NONE) {
        seriesValuesTextObject['c'] = dataObject[colorProperty];
      }
      return JSON.stringify(seriesValuesTextObject);
    }
    else {
      return "";
    }
  }

  @autobind
  seriesValuesChanged(event) {
    this.setState({seriesValuesText: event.target.value});
  }

  @autobind
  applySeriesChanges() {
    const { filteredData, removedData } = this;
    const { mochartDemoConfig } = this.props;
    const { groupIndex, seriesIndex, seriesValuesText } = this.state;
    let filteredDataObject = filteredData[groupIndex];
    const { mochartConfig } = mochartDemoConfig;
    const { seriesConfigs } = mochartConfig;
    if (seriesConfigs.length > 0) {
      try {
        let dataObject = JSON.parse(seriesValuesText);
        let seriesConfig = seriesConfigs[seriesIndex];
        const { property, rangeProperty, markerProperty, labelProperty, colorProperty } = seriesConfig;
        filteredDataObject[property] = dataObject['p'];
        if (rangeProperty !== NONE) {
          filteredDataObject[rangeProperty] = dataObject['r'];
        }
        if (markerProperty !== NONE) {
          filteredDataObject[markerProperty] = dataObject['m'];
        }
        if (labelProperty !== NONE) {
          filteredDataObject[labelProperty] = dataObject['l'];
        }
        if (colorProperty !== NONE) {
          filteredDataObject[colorProperty] = dataObject['c'];
        }
        this.updateFilteredDataState({}, filteredData, removedData, this.props, false);
      }
      catch (error) {

      }
    }
  }

  @autobind
  resetSeriesChanges() {
    const { filteredData, removedData } = this;
    const { mochartDemoConfig, data } = this.props;
    const { groupIndex, seriesIndex } = this.state;
    const { mochartConfig, groupProperty } = mochartDemoConfig;
    const { seriesConfigs } = mochartConfig;
    if (seriesConfigs.length > 0) {
      const filteredDataObject = filteredData[groupIndex];
      const filteredGroupValue = filteredDataObject[groupProperty];
      let i, count = data.length, dataObject = null;
      for (i = 0; i < count; i++) {
        if (data[i][groupProperty] === filteredGroupValue) {
          dataObject = data[i];
        }
      }
      const seriesConfig = seriesConfigs[seriesIndex];
      const { property, rangeProperty, markerProperty, labelProperty, colorProperty } = seriesConfig;
      filteredDataObject[property] = dataObject[property];
      if (rangeProperty !== NONE) {
        filteredDataObject[rangeProperty] = dataObject[rangeProperty];
      }
      if (markerProperty !== NONE) {
        filteredDataObject[markerProperty] = dataObject[markerProperty];
      }
      if (labelProperty !== NONE) {
        filteredDataObject[labelProperty] = dataObject[labelProperty];
      }
      if (colorProperty !== NONE) {
        filteredDataObject[colorProperty] = dataObject[colorProperty];
      }
      this.updateFilteredDataState({ seriesValuesText: this.getSeriesValuesText(mochartDemoConfig, filteredData, groupIndex, seriesIndex) }, filteredData, removedData, this.props, false);
    }
  }

  componentWillUnmount() {
    this.stopSequenceInternal();
  }

  render() {
    const {
      width, mochartDemoConfig, chartCount, showChartCountControls, onChartCountToggle, filteredSeriesIds,
      focusedSeriesAxisId, focusedSeriesId, onSeriesFilter
    } = this.props;
    const {
      sequencePlaying, selectionMode, dataProvider, groupValuesText, groupIndex, seriesIndex, seriesValuesText,
      filteredFocusedGroupIndex, orderChanged
    } = this.state;

    let dataError = dataProvider && dataProvider.getError && !!dataProvider.getError();
    let configError = !mochartDemoConfig.valid;
    let error = dataError || configError;
    let filteredGroupValues = error ? [] : dataProvider.getGroupValues();
    let selectedGroupValues = (error || groupValuesText === emptyGroupText) ? [] : groupValuesText.split(',');
    let filteredGroupMap = filteredGroupValues.reduce((map, group) => { map[group] = true; return map; }, {});
    let disableRemove = orderChanged || !selectedGroupValues.some(group => filteredGroupMap[group]);
    let disableAdd = orderChanged || !selectedGroupValues.some(group => !filteredGroupMap[group]);

    let showControls = true;

    let controlContent = false;
    if (showControls) {
      let modeControlContent = (
        <ButtonGroup key="modeControls">
          <ButtonWithTooltip id="edit-mode" tooltipText={(selectionMode === 'group' ? "Enter Single Group Mode" : "Enter Multi Group Mode")} tooltipPlacement="right"
                             onClick={this.onModeToggle} aria-label="Toggle Mode">
            <FontAwesome size="lg" fixedWidth={true} name={selectionMode === 'group' ? "bullseye" : "sliders"}/>
          </ButtonWithTooltip>
        </ButtonGroup>
      );
      let commonControlContent;
      if (showChartCountControls) {
        commonControlContent = [];

        commonControlContent.push(
          <ButtonGroup key="chartCountControls">
            <ButtonWithTooltip id="edit-chart-count" tooltipText={(chartCount === 2 ? "Hide" : "Show") + " 2nd Chart"} tooltipPlacement="right"
                               onClick={onChartCountToggle} aria-label="Toggle Chart Count">
              <FontAwesome size="lg" fixedWidth={true} name={chartCount === 2 ? "window-maximize" : "window-restore"}/>
            </ButtonWithTooltip>
          </ButtonGroup>
        );
        commonControlContent.push(modeControlContent);
      }
      else {
        commonControlContent = modeControlContent;
      }

      if (selectionMode === 'group') {
        controlContent = (
          <div className="chart-controls-container">
            <div className="chart-controls-buttons">
              <Form inline>
                <FormGroup>
                  <ButtonToolbar>
                    {commonControlContent}
                    <ButtonGroup>
                      <ButtonWithTooltip id="edit-reset-groups" disabled={error || sequencePlaying} tooltipText="Reset Groups" tooltipPlacement="right"
                                         onClick={this.resetGroups} aria-label="Reset Groups">
                        <FontAwesome size="lg" fixedWidth={true} name="undo"/>
                      </ButtonWithTooltip>
                      <ButtonWithTooltip id="edit-reverse-groups" disabled={error || sequencePlaying} tooltipText="Reverse Groups" tooltipPlacement="right"
                        onClick={this.reverseGroups} aria-label="Reverse Groups">
                        <FontAwesome size="lg" fixedWidth={true} name="exchange" />
                      </ButtonWithTooltip>
                      <ButtonWithTooltip id="edit-add-groups" disabled={error || sequencePlaying || disableAdd} tooltipText="Add Selected Groups" tooltipPlacement="right"
                                         onClick={this.addGroups} aria-label="Add Selected Groups">
                        <FontAwesome size="lg" fixedWidth={true} name="plus"/>
                      </ButtonWithTooltip>
                      <ButtonWithTooltip id="edit-remove-groups" disabled={error || sequencePlaying || disableRemove} tooltipText="Remove Selected Groups" tooltipPlacement="right"
                                         onClick={this.removeGroups} aria-label="Remove Selected Groups">
                        <FontAwesome size="lg" fixedWidth={true} name="minus"/>
                      </ButtonWithTooltip>
                      <ButtonWithTooltip id="edit-play-add" disabled={error || sequencePlaying || disableAdd} tooltipText="Play Add Selected Groups" tooltipPlacement="right"
                                         onClick={this.startAddSequence} aria-label="Play Add Selected Groups">
                        <FontAwesome size="lg" name="play"/><span style={{paddingRight: 2}}></span><FontAwesome size="lg" name="plus"/>
                      </ButtonWithTooltip>
                      <ButtonWithTooltip id="edit-play-remove" disabled={error || sequencePlaying || disableRemove} tooltipText="Play Remove Selected Groups" tooltipPlacement="right"
                                         onClick={this.startRemoveSequence} aria-label="Play Remove Selected Groups">
                        <FontAwesome size="lg" name="play"/><span style={{paddingRight: 2}}></span><FontAwesome size="lg" name="minus"/>
                      </ButtonWithTooltip>
                      <ButtonWithTooltip id="edit-stop" disabled={error || !sequencePlaying} tooltipText="Stop Selected Group Sequence" tooltipPlacement="right"
                                         onClick={this.stopSequence} aria-label="Stop Selected Group Sequence">
                        <FontAwesome size="lg" fixedWidth={true} name="stop"/>
                      </ButtonWithTooltip>
                      <ButtonWithTooltip id="edit-select-all" disabled={error || sequencePlaying} tooltipText="Select All Groups" tooltipPlacement="right"
                                         onClick={this.selectAllGroups} aria-label="Select All Groups">
                        <FontAwesome size="lg" fixedWidth={true} name="magnet"/>
                      </ButtonWithTooltip>
                    </ButtonGroup>
                  </ButtonToolbar>
                </FormGroup>
              </Form>
            </div>
            <span className="chart-controls-input">
              <Form inline>
                <Input type="text" disabled={error || sequencePlaying} value={groupValuesText} onChange={this.groupValuesChanged}/>
              </Form>
            </span>
          </div>
        );
      }
      else {
        let groupIndexText = 'Group: ';
        let seriesIndexText = 'Series: ';
        let seriesControlsDisabled = sequencePlaying || groupIndex === -1;
        let groupOrderControlsDisabled = sequencePlaying || groupIndex === -1;
        let isFirstGroup = groupIndex === 0;
        let isLastGroup = groupIndex === filteredGroupValues.length - 1;
        let hasPrevSeries = seriesIndex > 0;
        let hasNextSeries = seriesIndex < mochartDemoConfig.seriesCount - 1;

        controlContent = (
          <div className="chart-controls-container">
            <div className="chart-controls-buttons">
              <Form inline>
                <FormGroup>
                  <ButtonToolbar>
                    {commonControlContent}
                  </ButtonToolbar>
                </FormGroup>
                <FormGroup>
                  <ButtonToolbar>
                    <ButtonGroup>
                      <ButtonWithTooltip id="edit-group-decrease" disabled={error || groupOrderControlsDisabled || isFirstGroup} tooltipText="Decrease Group Order" tooltipPlacement="right"
                        onClick={this.decreaseGroupOrder} aria-label="Decrease Group Order">
                        <FontAwesome size="lg" fixedWidth={true} name="arrow-left" />
                      </ButtonWithTooltip>
                    </ButtonGroup>
                  </ButtonToolbar>
                </FormGroup>
                <FormGroup>
                  <span className="form-control-plaintext" style={{marginLeft: 5, marginRight: 5}}>{groupIndexText + groupIndex}</span>
                </FormGroup>
                <FormGroup>
                  <ButtonToolbar>
                    <ButtonGroup>
                      <ButtonWithTooltip id="edit-group-increase" disabled={error || groupOrderControlsDisabled || isLastGroup} tooltipText="Increase Group Order" tooltipPlacement="right"
                        onClick={this.increaseGroupOrder} aria-label="Increase Group Order">
                        <FontAwesome size="lg" fixedWidth={true} name="arrow-right" />
                      </ButtonWithTooltip>
                    </ButtonGroup>
                  </ButtonToolbar>
                </FormGroup>
                <FormGroup>
                  <ButtonToolbar>
                    <ButtonGroup>
                      <ButtonWithTooltip id="edit-previous-series" disabled={error || seriesControlsDisabled || !hasPrevSeries} tooltipText="Previous Series" tooltipPlacement="right"
                                         onClick={this.prevSeries} aria-label="Previous Series">
                        <FontAwesome size="lg" fixedWidth={true} name="chevron-down"/>
                      </ButtonWithTooltip>
                    </ButtonGroup>
                  </ButtonToolbar>
                </FormGroup>
                <FormGroup>
                  <span className="form-control-plaintext" style={{marginLeft: 5, marginRight: 5}}>{seriesIndexText + seriesIndex}</span>
                </FormGroup>
                <FormGroup>
                  <ButtonToolbar>
                    <ButtonGroup>
                      <ButtonWithTooltip id="edit-next-series" disabled={error || seriesControlsDisabled || !hasNextSeries} tooltipText="Next Series" tooltipPlacement="right"
                                         onClick={this.nextSeries} aria-label="Next Series">
                        <FontAwesome size="lg" fixedWidth={true} name="chevron-up"/>
                      </ButtonWithTooltip>
                    </ButtonGroup>
                    <ButtonGroup>
                      <ButtonWithTooltip id="edit-reset-series" disabled={error || seriesControlsDisabled} tooltipText="Reset Series Changes" tooltipPlacement="right"
                                         onClick={this.resetSeriesChanges} aria-label="Reset Series Changes">
                        <FontAwesome size="lg" fixedWidth={true} name="undo"/>
                      </ButtonWithTooltip>
                      <ButtonWithTooltip id="edit-apply-series" disabled={error || seriesControlsDisabled} tooltipText="Apply Series Changes" tooltipPlacement="right"
                                         onClick={this.applySeriesChanges} aria-label="Apply Series Changes">
                        <FontAwesome size="lg" fixedWidth={true} name="check"/>
                      </ButtonWithTooltip>
                    </ButtonGroup>
                  </ButtonToolbar>
                </FormGroup>
              </Form>
            </div>
            <span className="chart-controls-input">
              <Form inline>
                <Input type="text" disabled={error || seriesControlsDisabled} value={seriesValuesText} onChange={this.seriesValuesChanged}/>
              </Form>
            </span>
          </div>
        );
      }
    }

    // ManagedChart (behind mochart-react's Chart) picks animated vs static from
    // the config and owns focus/filter state internally now.
    const { mochartConfig } = mochartDemoConfig;
    const chartContent = (
      <SizerChart width={width} mochartConfig={mochartConfig} dataProvider={dataProvider}
                  onFocus={this.onChartFocus} onSeriesFilter={onSeriesFilter} onChartClick={this.onChartClick}/>
    );

    return (
      <div className="editable-mochart-chart">
        <div className="editable-chart-container">
          <div className="editable-chart-content">
            {chartContent}
          </div>
          <div className="editable-chart-controls">
            {controlContent}
          </div>
        </div>
      </div>
    );
  }
}