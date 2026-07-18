import { loadConfigReference } from '../.vitepress/lib/model';
import { renderSectionPage } from '../.vitepress/lib/renderSection';

export default {
  paths() {
    return loadConfigReference().sections.map(section => ({
      params: { section: section.id },
      content: renderSectionPage(section)
    }));
  }
};
