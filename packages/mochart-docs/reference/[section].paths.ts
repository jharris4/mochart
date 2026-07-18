import { loadConfigReference } from '../.vitepress/lib/model';
import { renderSectionPage } from '../.vitepress/lib/renderSection';
import { buildUsageIndex } from '../.vitepress/lib/usageIndex';

export default {
  paths() {
    const usage = buildUsageIndex();
    return loadConfigReference().sections.map(section => ({
      params: { section: section.id },
      content: renderSectionPage(section, usage)
    }));
  }
};
