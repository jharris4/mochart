import demoConfig from '../../mochart-demo/demos/demos.json';

const configModules = import.meta.glob('../../mochart-demo/demos/config/*.json', { eager: true });
const testConfigModules = import.meta.glob('../../mochart-demo/demos/config/test/*.json', { eager: true });
const dataModules = import.meta.glob('../../mochart-demo/demos/data/*.json', { eager: true });
const randomModules = import.meta.glob('../../mochart-demo/demos/random/*.json', { eager: true });

function getModule(modules, dir, file) {
  const mod = modules[dir + file];
  if (mod === void 0) {
    throw new Error('demo file not found: ' + dir + file);
  }
  return mod.default;
}

const { demos, testDemos } = demoConfig;

const demoIds = [];
const demoObjectMap = {};

const testDemoIds = [];

demos.forEach(demo => {
  const { id, title, config, data, random } = demo;
  demo = {
    id,
    title,
    config: Object.assign({}, getModule(configModules, '../../mochart-demo/demos/config/', config)),
    data: getModule(dataModules, '../../mochart-demo/demos/data/', data).slice(),
    random: Object.assign({}, getModule(randomModules, '../../mochart-demo/demos/random/', random))
  }
  demoIds.push(demo.id);
  demoObjectMap[demo.id] = demo;
});

testDemos.forEach(demo => {
  const { id, title, config, data, random } = demo;
  demo = {
    id,
    title,
    config: Object.assign({}, getModule(testConfigModules, '../../mochart-demo/demos/config/test/', config)),
    data: getModule(dataModules, '../../mochart-demo/demos/data/', data).slice(),
    random: Object.assign({}, getModule(randomModules, '../../mochart-demo/demos/random/', random))
  }
  testDemoIds.push(demo.id);
  demoObjectMap[demo.id] = demo;
});

const demoData = {
  demoIds,
  demoObjectMap,
  testDemoIds
};

export default demoData;
