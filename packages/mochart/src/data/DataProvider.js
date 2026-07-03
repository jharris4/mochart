export class ArrayOfObjectsDataProvider {
  constructor(data, groupProperty) {
    this._groupValues = data.map(d => d[groupProperty]);
    const groupValueMap = this._groupValueMap = {};
    for (let d of data) {
      groupValueMap[d[groupProperty]] = d;
    }
  }

  getGroupValues() {
    return this._groupValues;
  }

  getSeriesValue(groupValue, groupIndex, seriesProperty) {
    return this._groupValueMap[groupValue][seriesProperty];
  }
}

export class ObjectOfArraysDataProvider {
  constructor(data, groupProperty) {
    this._groupValues = data[groupProperty];
    this._data = data;
    this._groupProperty = groupProperty;
  }

  getGroupValues() {
    return this._groupValues;
  }

  getSeriesValue(groupValue, groupIndex, seriesProperty) {
    return this._data[seriesProperty][groupIndex];
  }
}