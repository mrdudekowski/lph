(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LPHCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const searchableFields = ['title', 'titleRu', 'description', 'descriptionRu', 'level', 'levelRu', 'topic', 'topicRu', 'skill', 'skillRu', 'format', 'formatRu'];
  const facets = ['level', 'topic', 'skill', 'format'];
  const normalize = (value) => String(value == null ? '' : value).toLocaleLowerCase().trim().replace(/\s+/g, ' ');
  const tokensOf = (value) => normalize(value).split(' ').filter(Boolean);

  function searchResources(resources, assets, query, filters) {
    const tokens = tokensOf(query);
    const selected = filters || {};
    return resources.filter((resource) => {
      if (resource.status !== 'published') return false;
      for (const facet of facets) {
        const values = Array.isArray(selected[facet]) ? selected[facet].map(normalize).filter(Boolean) : [];
        if (values.length && ![resource[facet], resource[facet + 'Ru']].some((value) => values.includes(normalize(value)))) return false;
      }
      if (!tokens.length) return true;
      const relatedAssets = assets.filter((asset) => asset.resourceId === resource.id);
      const searchable = searchableFields.map((field) => normalize(resource[field])).concat(relatedAssets.flatMap((asset) => [normalize(asset.filename), normalize(asset.filenameRu)]));
      return tokens.every((token) => searchable.some((field) => field.includes(token)));
    });
  }

  function relevanceScore(resource, assets, query) {
    const tokens = tokensOf(query);
    if (!tokens.length) return 0;
    const title = normalize(resource.title + ' ' + resource.titleRu);
    const metadata = ['level', 'levelRu', 'topic', 'topicRu', 'skill', 'skillRu', 'format', 'formatRu'].map((key) => normalize(resource[key])).join(' ');
    const description = normalize(resource.description + ' ' + resource.descriptionRu);
    const relatedAssets = assets.filter((asset) => asset.resourceId === resource.id);
    const filenames = relatedAssets.map((asset) => normalize(asset.filename + ' ' + asset.filenameRu)).join(' ');
    let score = 0;
    for (const token of tokens) {
      if (title.includes(token)) score += 400;
      else if (metadata.includes(token)) score += 300;
      else if (description.includes(token)) score += 200;
      else if (filenames.includes(token)) score += 100;
    }
    return score;
  }

  function sortResources(resources, mode, query, assets) {
    const list = [...resources];
    const safeAssets = assets || [];
    const byTitle = (a, b) => normalize(a.title).localeCompare(normalize(b.title)) || String(a.id).localeCompare(String(b.id));
    const byRecent = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || byTitle(a, b);
    if (mode === 'title') return list.sort(byTitle);
    if (mode === 'recent') return list.sort(byRecent);
    return list.sort((a, b) => relevanceScore(b, safeAssets, query) - relevanceScore(a, safeAssets, query) || byRecent(a, b));
  }

  function addResourceToPack(pack, resourceId) {
    const exists = pack.resourceIds.includes(resourceId);
    return { pack: exists ? { ...pack, resourceIds: [...pack.resourceIds] } : { ...pack, resourceIds: [...pack.resourceIds, resourceId] }, added: !exists };
  }

  function removeResourceFromPack(pack, resourceId) {
    return { ...pack, resourceIds: pack.resourceIds.filter((id) => id !== resourceId) };
  }

  function countPackAssets(pack, resources, assets) {
    const validIds = new Set(resources.map((resource) => resource.id));
    const memberIds = new Set(pack.resourceIds.filter((id) => validIds.has(id)));
    return assets.reduce((count, asset) => count + (memberIds.has(asset.resourceId) ? 1 : 0), 0);
  }

  function setResourceStatus(resources, resourceId, status) {
    return resources.map((resource) => resource.id === resourceId ? { ...resource, status } : resource);
  }

  return { searchResources, relevanceScore, sortResources, addResourceToPack, removeResourceFromPack, countPackAssets, setResourceStatus };
});
