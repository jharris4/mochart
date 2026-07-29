import { loadConfigReference } from '../.vitepress/lib/model';
import { loadApiReference } from '../.vitepress/lib/apiModel';
import { renderSectionPage } from '../.vitepress/lib/renderSection';
import { renderApiPage } from '../.vitepress/lib/renderApiPage';
import { buildUsageIndex } from '../.vitepress/lib/usageIndex';

// Both generated reference families share this route: config sections render
// from the config-reference model, props/callbacks from the api-reference one.
export default {
  paths() {
    const usage = buildUsageIndex();
    const configPages = loadConfigReference().sections.map(section => ({
      params: { section: section.id },
      content: renderSectionPage(section, usage)
    }));
    const apiPages = loadApiReference().pages.map(page => ({
      params: { section: page.id },
      content: renderApiPage(page)
    }));
    return [...configPages, ...apiPages];
  }
};
