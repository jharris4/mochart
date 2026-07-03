const demoConfig = require('../demos/demos.json');

const { demos, testDemos } = demoConfig;

const demoIds = [];
const demoObjectMap = {};

const testDemoIds = [];

demos.forEach(demo => {
  const { id, title, config, data, random } = demo;
  demo = {
    id,
    title,
    config: Object.assign({}, require('../demos/config/' + config)),
    data: require('../demos/data/' + data).slice(),
    random: Object.assign({}, require('../demos/random/' + random))
  }
  //demo = getDemoData(demo, '../demos/config/', '../demos/data/', '../demos/random/');
  demoIds.push(demo.id);
  demoObjectMap[demo.id] = demo;
});

testDemos.forEach(demo => {
  const { id, title, config, data, random } = demo;
  demo = {
    id,
    title,
    config: Object.assign({}, require('../demos/config/test/' + config)),
    data: require('../demos/data/' + data).slice(),
    random: Object.assign({}, require('../demos/random/' + random))
  }
  //demo = getDemoData(demo, '../demos/config/test/', '../demos/data/', '../demos/random/');
  testDemoIds.push(demo.id);
  demoObjectMap[demo.id] = demo;
});

const demoData = {
  demoIds,
  demoObjectMap,
  testDemoIds
};

export default demoData;