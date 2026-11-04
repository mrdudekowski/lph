(function startApp() {
  'use strict';

  const demo = window.LPHDemoData;
  const core = window.LPHCore;
  const icons = window.LPHIcons;
  const app = document.getElementById('app');
  const viewRoot = document.getElementById('view-root');
  const overlayRoot = document.getElementById('overlay-root');
  const popoverRoot = document.getElementById('popover-root');
  const toastRoot = document.getElementById('toast-root');
  const main = document.getElementById('main-content');
  const facetLabels = { level: 'Level', topic: 'Topic', skill: 'Skill', format: 'Format' };
  const facetOrder = ['level', 'topic', 'skill', 'format'];
  const packIcons = [
    ['book', 'Book'], ['headphones', 'Headphones'], ['message', 'Conversation'], ['puzzle', 'Puzzle'],
    ['globe', 'World'], ['bulb', 'Ideas'], ['note', 'Notes'], ['sparkles', 'Inspiration'],
  ];
  const accents = [
    { key: 'blue', label: 'Soft blue', color: 'var(--pack-blue)' },
    { key: 'slate', label: 'Slate', color: 'var(--pack-slate)' },
    { key: 'graphite', label: 'Graphite', color: 'var(--pack-graphite)' },
    { key: 'ivory', label: 'Ivory', color: 'var(--pack-ivory)' },
  ];
  const navItems = [
    { id: 'my-space', label: 'My Space', icon: 'home' },
    { id: 'library', label: 'Library', icon: 'library' },
    { id: 'lesson-packs', label: 'Lesson Packs', icon: 'folder' },
    { id: 'manage', label: 'Manage', icon: 'manage' },
  ];

  const clone = (value) => structuredClone(value);
  const state = {
    section: 'my-space',
    activePackId: null,
    query: '',
    filters: { level: [], topic: [], skill: [], format: [] },
    sort: 'relevance',
    resources: clone(demo.resources),
    assets: clone(demo.assets),
    packs: clone(demo.packs),
    favorites: ['res-routines', 'res-vocabulary-cards', 'res-story'],
    recent: ['res-weather-audio', 'res-grammar', 'res-video'],
    savedOnly: false,
    pendingPackTargetId: null,
    theme: 'light',
    previewResourceId: null,
    previewAssetId: null,
    previewPlaying: false,
    viewer: null,
    dialog: null,
    filterSheet: false,
    popover: null,
    editor: null,
    toastTimer: null,
    addedResourceId: null,
    focusKey: null,
    drag: null,
    animateView: true,
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function icon(name, size = 18, className = '') {
    return icons.svg(name, size, className);
  }

  function getResource(id) { return state.resources.find((resource) => resource.id === id) || null; }
  function getPack(id) { return state.packs.find((pack) => pack.id === id) || null; }
  function assetsFor(resourceId) { return state.assets.filter((asset) => asset.resourceId === resourceId); }
  function countAssets(pack) { return core.countPackAssets(pack, state.resources, state.assets); }
  function isSaved(id) { return state.favorites.includes(id); }
  function packAccent(key) { return accents.find((item) => item.key === key)?.color || accents[0].color; }

  function packIconName(name) {
    const aliases = { 'book-open': 'book', 'sunrise': 'sparkles', 'message-circle': 'message', 'lightbulb': 'bulb' };
    const normalized = aliases[name] || name;
    return icons.has(normalized) ? normalized : 'folder';
  }

  function folderIcon(pack, size = 20) {
    return icon(packIconName(pack.icon), size);
  }

  function resourceKind(resource) {
    const firstAsset = assetsFor(resource.id)[0];
    return firstAsset ? firstAsset.kind : 'pdf';
  }

  function documentThumb(resource, asset, small = false) {
    const kind = asset?.kind || resourceKind(resource);
    const assetIcon = { pdf: 'file', image: 'image', audio: 'audio', video: 'video', external: 'external', download: 'download' }[kind] || 'file';
    const title = escapeHtml(resource?.title || asset?.filename || 'Resource preview');
    if (kind === 'audio' || kind === 'video' || kind === 'image' || kind === 'external') {
      return `<div class="document-thumb ${small ? 'document-thumb-small' : ''}" data-kind="${escapeHtml(kind)}" aria-label="${title} placeholder"><span class="thumb-graphic">${icon(assetIcon)}</span>${small ? '' : `<span class="thumb-caption">${escapeHtml(asset?.format || resource?.format || 'RESOURCE')}</span>`}</div>`;
    }
    return `<div class="document-thumb ${small ? 'document-thumb-small' : ''}" data-kind="${escapeHtml(kind)}" aria-label="${title} placeholder"><span class="document-sheet" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>${small ? '' : `<span class="thumb-caption">${escapeHtml(asset?.format || resource?.format || 'WORKSHEET')}</span>`}</div>`;
  }

  function tagsFor(resource, limit = 3) {
    return [resource.level, resource.topic, resource.skill, resource.format].filter(Boolean).slice(0, limit)
      .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  }

  function navMarkup(mobile = false) {
    return navItems.map((item) => {
      const active = state.section === item.id;
      const packCount = item.id === 'lesson-packs' ? `<span class="nav-count">${state.packs.length}</span>` : '';
      return `<button class="nav-link" type="button" data-action="navigate" data-section="${item.id}" aria-label="${item.label}" ${active ? 'aria-current="page"' : ''}>${icon(item.icon)}<span class="nav-label">${item.label}</span>${packCount}</button>`;
    }).join('');
  }

  function renderNav() {
    document.getElementById('primary-nav').innerHTML = navMarkup(false);
    document.getElementById('mobile-nav').innerHTML = navMarkup(true);
  }

  function render() {
    const active = document.activeElement;
    const wasSearch = active?.classList?.contains('search-input');
    const activeId = active?.id;
    const searchSelection = wasSearch ? [active.selectionStart, active.selectionEnd] : null;
    const scrollY = window.scrollY;
    const mainScroll = main.scrollTop;
    app.dataset.theme = state.theme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = state.theme === 'dark' ? '#17191b' : '#f4f1eb';
    renderNav();
    const viewAnimation = state.animateView ? 'view-enter' : '';
    state.animateView = false;
    viewRoot.innerHTML = `<div class="${viewAnimation}">${renderActiveView()}</div>`;
    overlayRoot.innerHTML = renderOverlay();
    renderPopover();
    requestAnimationFrame(() => {
      if (state.focusKey) {
        const target = document.querySelector(`[data-focus-key="${CSS.escape(state.focusKey)}"]`);
        state.focusKey = null;
        target?.focus({ preventScroll: true });
      } else if (wasSearch) {
        const input = document.querySelector('.search-input');
        input?.focus({ preventScroll: true });
        if (input && searchSelection) input.setSelectionRange(searchSelection[0], searchSelection[1]);
      } else if (activeId) {
        document.getElementById(activeId)?.focus({ preventScroll: true });
      }
      window.scrollTo({ top: scrollY, behavior: 'instant' });
      main.scrollTop = mainScroll;
      focusDialogIfNeeded();
      positionPopover();
    });
  }

  function renderActiveView() {
    if (state.section === 'library') return renderLibrary();
    if (state.section === 'lesson-packs' && state.activePackId) return renderPackDetail();
    if (state.section === 'lesson-packs') return renderPackCollection();
    if (state.section === 'manage') return renderManage();
    return renderMySpace();
  }

  function renderHeader(eyebrow, title, subtitle, actions = '') {
    return `<header class="view-header"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1 class="view-title">${escapeHtml(title)}</h1>${subtitle ? `<p class="view-subtitle">${escapeHtml(subtitle)}</p>` : ''}</div>${actions ? `<div class="header-actions">${actions}</div>` : ''}</header>`;
  }

  function renderFolderCard(pack, compact = false) {
    const count = countAssets(pack);
    const css = `--pack-accent:${packAccent(pack.accent)}`;
    return `<article class="folder-card-wrap" style="${css}">
      <button class="pack-folder" type="button" data-action="open-pack" data-pack-id="${escapeHtml(pack.id)}" data-focus-key="open-pack-${escapeHtml(pack.id)}" aria-label="Open ${escapeHtml(pack.name)}, ${count} files">
        <span class="folder-top"><span class="folder-icon">${folderIcon(pack)}</span><span class="folder-more">${icon('chevron')}</span></span>
        <span class="folder-name">${escapeHtml(pack.name)}</span>
        <span class="folder-meta">${icon('file')} ${count} ${count === 1 ? 'file' : 'files'}</span>
      </button>
      <button class="folder-edit-button icon-button" type="button" data-action="edit-pack" data-pack-id="${escapeHtml(pack.id)}" data-focus-key="edit-pack-${escapeHtml(pack.id)}" aria-label="Edit ${escapeHtml(pack.name)}">${icon('dots')}</button>
    </article>`;
  }

  function renderQuickCreateCard() {
    return `<button class="quick-pack-card" type="button" data-action="create-pack"><span class="add-ring">${icon('plus')}</span><strong>Create a Lesson Pack</strong><small>Build a new teaching set</small></button>`;
  }

  function renderSmallResource(resource, lastOpened = '') {
    const asset = assetsFor(resource.id)[0];
    return `<button class="saved-resource" type="button" data-action="open-preview" data-resource-id="${escapeHtml(resource.id)}" data-focus-key="preview-${escapeHtml(resource.id)}">
      ${documentThumb(resource, asset, true)}
      <span><span class="saved-resource-title">${escapeHtml(resource.title)}</span><span class="saved-resource-meta">${escapeHtml(resource.level)} · ${escapeHtml(resource.format)}${lastOpened ? ` · ${lastOpened}` : ''}</span></span>
    </button>`;
  }

  function renderMySpace() {
    const packs = state.packs.slice(0, 3);
    const saved = state.favorites.map(getResource).filter(Boolean).slice(0, 4);
    const recent = state.recent.map(getResource).filter(Boolean).slice(0, 4);
    const packActions = `<button class="button button-secondary" type="button" data-action="create-pack">${icon('plus')} New pack</button>`;
    return `${renderHeader('MY SPACE', 'Your teaching space', 'A calm place to pick up where you left off.', packActions)}
      <div class="space-grid">
        <div class="space-main">
          <section class="space-block panel" aria-labelledby="space-packs-title">
            <div class="section-heading"><div><h2 id="space-packs-title">Lesson Packs</h2><p>Your teaching sets, ready when you need them.</p></div><button class="text-link" type="button" data-action="navigate" data-section="lesson-packs">View all ${icon('chevron')}</button></div>
            <div class="pack-grid pack-grid-small">${packs.map((pack) => renderFolderCard(pack, true)).join('')}${state.packs.length < 3 ? renderQuickCreateCard() : ''}</div>
          </section>
          <section class="space-block panel" aria-labelledby="space-saved-title">
            <div class="section-heading"><div><h2 id="space-saved-title">Saved Resources</h2><p>Keep useful materials close at hand.</p></div><button class="text-link" type="button" data-action="show-saved">View all ${icon('chevron')}</button></div>
            ${saved.length ? `<div class="bento-saved">${saved.map((resource) => renderSmallResource(resource)).join('')}</div>` : emptyState('heart', 'No saved resources yet', 'Save a resource in Library and it will appear here.')}
          </section>
        </div>
        <aside class="space-aside">
          <section class="space-block panel" aria-labelledby="space-recent-title">
            <div class="section-heading"><div><h2 id="space-recent-title">Recently opened</h2><p>Pick up where you left off.</p></div><span class="section-kicker">${recent.length} items</span></div>
            ${recent.length ? `<div class="recent-list">${recent.map((resource, index) => `<button class="recent-row" type="button" data-action="open-preview" data-resource-id="${escapeHtml(resource.id)}" data-focus-key="preview-${escapeHtml(resource.id)}">${documentThumb(resource, assetsFor(resource.id)[0], true)}<span class="recent-row-copy"><strong>${escapeHtml(resource.title)}</strong><small>${escapeHtml(resource.level)} · ${escapeHtml(resource.topic)}${index === 0 ? ' · Just now' : ''}</small></span>${icon('chevron')}</button>`).join('')}</div>` : emptyState('clock', 'Nothing opened yet', 'Open a resource to find it here next time.')}
          </section>
          <section class="space-block panel bento-tip">
            <span class="folder-icon">${icon('sparkles')}</span>
            <div><h2>Ready for a new lesson?</h2><p>Find a resource, then add it to a pack with the small + control.</p></div>
            <button class="text-link" type="button" data-action="navigate" data-section="library">Explore Library ${icon('chevron')}</button>
          </section>
        </aside>
      </div>`;
  }

  function emptyState(iconName, title, description, action = '') {
    return `<div class="empty-state"><span class="empty-icon">${icon(iconName, 22)}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p>${action}</div>`;
  }

  function activeFilterCount() {
    return facetOrder.reduce((sum, facet) => sum + state.filters[facet].length, 0);
  }

  function availableFacetValues(facet) {
    const values = state.resources.filter((resource) => resource.status === 'published').map((resource) => resource[facet]);
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function renderFacetTrigger(facet) {
    const count = state.filters[facet].length;
    return `<button class="filter-trigger ${count ? 'is-active' : ''}" type="button" data-action="open-facet" data-facet="${facet}" aria-expanded="${state.popover?.type === 'facet' && state.popover.facet === facet ? 'true' : 'false'}">${facetLabels[facet]}${count ? `<span class="filter-value-count">${count}</span>` : ''}${icon('chevron-down')}</button>`;
  }

  function renderActiveFilters() {
    const chips = facetOrder.flatMap((facet) => state.filters[facet].map((value) => `<button class="active-filter-chip" type="button" data-action="remove-filter" data-facet="${facet}" data-value="${escapeHtml(value)}" aria-label="Remove ${escapeHtml(value)} filter">${escapeHtml(value)}${icon('close')}</button>`)).join('');
    return `${chips}${activeFilterCount() ? `<button class="clear-filters" type="button" data-action="clear-filters">Clear all</button>` : ''}`;
  }

  function filteredResources() {
    let filtered = core.searchResources(state.resources, state.assets, state.query, state.filters);
    if (state.savedOnly) filtered = filtered.filter((resource) => isSaved(resource.id));
    return core.sortResources(filtered, state.sort, state.query, state.assets);
  }

  function renderResourceCard(resource) {
    const assets = assetsFor(resource.id);
    const selected = state.previewResourceId === resource.id;
    const saved = isSaved(resource.id);
    const justAdded = state.addedResourceId === resource.id;
    const unavailable = resource.status !== 'published';
    return `<article class="resource-card ${selected ? 'is-selected' : ''} ${unavailable ? 'is-unavailable' : ''}" data-resource-card="${escapeHtml(resource.id)}">
      <button class="card-open-hit" type="button" data-action="open-preview" data-resource-id="${escapeHtml(resource.id)}" data-focus-key="preview-${escapeHtml(resource.id)}" aria-label="Preview ${escapeHtml(resource.title)}"><span class="sr-only">Preview ${escapeHtml(resource.title)}</span></button>
      ${documentThumb(resource, assets[0])}
      <div class="resource-card-content">
        <div class="resource-card-head"><span class="resource-card-title">${escapeHtml(resource.title)}</span>
          <span class="resource-tools">
            <button class="circle-action ${justAdded ? 'is-added' : ''}" type="button" data-action="open-pack-picker" data-resource-id="${escapeHtml(resource.id)}" data-focus-key="add-${escapeHtml(resource.id)}" aria-label="${justAdded ? 'Added to a Lesson Pack' : 'Add to a Lesson Pack'}" aria-haspopup="menu">${icon(justAdded ? 'check' : 'plus')}</button>
            <button class="circle-action save-heart ${saved ? 'is-saved' : ''}" type="button" data-action="toggle-favorite" data-resource-id="${escapeHtml(resource.id)}" aria-label="${saved ? 'Remove from Saved Resources' : 'Save resource'}" aria-pressed="${saved}">${icon('heart')}</button>
          </span>
        </div>
        <div class="resource-meta">${tagsFor(resource)}</div>
        <div class="resource-foot"><span>${icon('file')} ${assets.length} ${assets.length === 1 ? 'file' : 'files'}</span><span>${escapeHtml(resource.topic)}</span></div>
      </div>
    </article>`;
  }

  function renderLibrary() {
    const resources = filteredResources();
    const sortOptions = [['relevance', 'Relevance'], ['recent', 'Recently added'], ['title', 'Title']];
    const sortLabel = sortOptions.find(([value]) => value === state.sort)?.[1] || 'Relevance';
    const filterButtons = facetOrder.map(renderFacetTrigger).join('');
    const cards = resources.map(renderResourceCard).join('');
    const searchActions = `<button class="icon-button search-clear" type="button" data-action="clear-query" aria-label="Clear search" ${state.query ? '' : 'hidden'}>${icon('close')}</button>`;
    const libraryHeading = state.savedOnly ? ['MY SPACE', 'Saved Resources', 'Your saved teaching materials.'] : ['RESOURCE LIBRARY', 'Find your next lesson', 'Search by teaching goal, level, skill, or a phrase you remember.'];
    const libraryActions = state.savedOnly ? `<button class="button button-quiet" type="button" data-action="show-all-library">Show all resources</button>` : '';
    return `${renderHeader(...libraryHeading, libraryActions)}
      <section class="library-toolbar" aria-label="Search and filter resources">
        <div class="search-row"><label class="search-box">${icon('search')}<span class="sr-only">Search resources</span><input class="search-input" type="search" autocomplete="off" placeholder="Search resources" value="${escapeHtml(state.query)}" aria-label="Search resources" aria-keyshortcuts="Control+K Meta+K" />${searchActions}<span class="shortcut"><kbd>⌘</kbd><kbd>K</kbd></span></label><button class="mobile-filter-open" type="button" data-action="open-filter-sheet" data-focus-key="open-filter-sheet" aria-label="Open filters">${icon('filter')}${activeFilterCount() ? `<span class="filter-value-count">${activeFilterCount()}</span>` : ''}</button></div>
        <div class="filter-row" aria-label="Filter by">${filterButtons}<span class="active-filters">${renderActiveFilters()}</span></div>
      </section>
      <div class="results-bar"><span class="results-count"><strong>${resources.length}</strong> ${resources.length === 1 ? 'resource' : 'resources'}${state.query || activeFilterCount() ? ' found' : ''}</span><div class="results-controls"><label class="sr-only" for="resource-sort">Sort resources</label><select id="resource-sort" class="sort-select" data-action="sort" aria-label="Sort resources">${sortOptions.map(([value, label]) => `<option value="${value}" ${state.sort === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div></div>
      ${resources.length ? `<div class="resource-grid">${cards}</div>` : emptyState('search', 'No resources found', 'Try a different phrase or remove some filters.', `<button class="button button-secondary" type="button" data-action="reset-search">${icon('close')} Reset search and filters</button>`)}
      `;
  }

  function renderFilterGroup(facet, inSheet = false) {
    const values = availableFacetValues(facet);
    const id = inSheet ? `sheet-${facet}` : `pop-${facet}`;
    return `<fieldset class="filter-group"><legend>${facetLabels[facet]}</legend><div class="filter-options">${values.map((value, index) => {
      const checked = state.filters[facet].includes(value);
      const inputId = `${id}-${index}`;
      return `<label class="check-option" for="${inputId}"><input id="${inputId}" type="checkbox" data-action="filter-value" data-facet="${facet}" value="${escapeHtml(value)}" ${checked ? 'checked' : ''} /><span>${escapeHtml(value)}</span></label>`;
    }).join('')}</div></fieldset>`;
  }

  function renderFilterSheet() {
    return `<div class="dialog-backdrop filter-sheet-backdrop" data-action="backdrop-close"><section class="filter-sheet dialog-card" role="dialog" aria-modal="true" aria-labelledby="filter-sheet-title"><div class="sheet-grabber"></div><header class="dialog-header"><div><h2 id="filter-sheet-title">Filters</h2><p>Choose one or more values in each group.</p></div><button class="icon-button" type="button" data-action="close-filter-sheet" aria-label="Close filters">${icon('close')}</button></header><div class="filter-sheet-content">${facetOrder.map((facet) => renderFilterGroup(facet, true)).join('')}</div><footer class="dialog-footer"><button class="button button-quiet" type="button" data-action="clear-filters">Reset</button><button class="button button-primary" type="button" data-action="close-filter-sheet">Done · ${filteredResources().length} results</button></footer></section></div>`;
  }

  function renderPackCollection() {
    const actions = `<button class="button button-primary" type="button" data-action="create-pack">${icon('plus')} New Lesson Pack</button>`;
    return `${renderHeader('YOUR COLLECTIONS', 'Lesson Packs', 'Build a small, reusable set of resources for each lesson or teaching goal.', actions)}
      <section class="pack-collection-section"><div class="section-heading"><div><h2>Your packs</h2><p>${state.packs.length} ${state.packs.length === 1 ? 'collection' : 'collections'} · ${state.packs.reduce((sum, pack) => sum + countAssets(pack), 0)} attached files</p></div></div>
        <div class="pack-grid">${state.packs.map((pack) => renderFolderCard(pack)).join('')}${renderQuickCreateCard()}</div>
      </section>`;
  }

  function renderPackResourceCard(resource, index, pack) {
    const resourceAssets = assetsFor(resource.id);
    const isUnavailable = resource.status !== 'published';
    return `<article class="pack-resource-card ${state.drag?.resourceId === resource.id ? 'is-dragging' : ''}" data-pack-resource-card="${escapeHtml(resource.id)}" data-pack-index="${index}" data-pack-id="${escapeHtml(pack.id)}">
      ${documentThumb(resource, resourceAssets[0])}
      <button class="pack-resource-open" type="button" data-action="open-preview" data-resource-id="${escapeHtml(resource.id)}" data-focus-key="preview-${escapeHtml(resource.id)}" aria-label="Preview ${escapeHtml(resource.title)}"><span class="pack-resource-title">${escapeHtml(resource.title)}</span></button>
      <div class="pack-resource-info"><span>${escapeHtml(resource.format)}</span><span>${icon('file')} ${resourceAssets.length}</span></div>
      ${isUnavailable ? `<span class="unavailable-label">${icon('info')} Unavailable</span>` : ''}
      <div class="pack-card-actions"><button class="icon-button drag-handle" type="button" data-action="drag-handle" data-resource-id="${escapeHtml(resource.id)}" data-pack-id="${escapeHtml(pack.id)}" aria-label="Move ${escapeHtml(resource.title)}" title="Drag to reorder">${icon('grip')}</button><span class="move-actions"><button class="icon-button" type="button" data-action="move-resource" data-direction="up" data-resource-id="${escapeHtml(resource.id)}" data-pack-id="${escapeHtml(pack.id)}" aria-label="Move ${escapeHtml(resource.title)} up" ${index === 0 ? 'disabled' : ''}>${icon('arrowUp')}</button><button class="icon-button" type="button" data-action="move-resource" data-direction="down" data-resource-id="${escapeHtml(resource.id)}" data-pack-id="${escapeHtml(pack.id)}" aria-label="Move ${escapeHtml(resource.title)} down" ${index === pack.resourceIds.length - 1 ? 'disabled' : ''}>${icon('arrowDown')}</button></span><button class="icon-button" type="button" data-action="remove-pack-resource" data-resource-id="${escapeHtml(resource.id)}" data-pack-id="${escapeHtml(pack.id)}" aria-label="Remove ${escapeHtml(resource.title)} from pack">${icon('close')}</button></div>
    </article>`;
  }

  function renderPackDetail() {
    const pack = getPack(state.activePackId);
    if (!pack) { state.activePackId = null; return renderPackCollection(); }
    const resources = pack.resourceIds.map(getResource).filter(Boolean);
    const css = `--pack-accent:${packAccent(pack.accent)}`;
    const actions = `<button class="button button-secondary" type="button" data-action="edit-pack" data-pack-id="${escapeHtml(pack.id)}">${icon('manage')} Edit pack</button><button class="button button-quiet" type="button" data-action="open-delete-pack" data-pack-id="${escapeHtml(pack.id)}" aria-label="Delete pack">${icon('dots')}</button>`;
    return `<div class="pack-detail-view" style="${css}">
      <div class="pack-back-row"><button class="text-link" type="button" data-action="back-to-packs">${icon('arrow-left')} Lesson Packs</button></div>
      <header class="pack-detail-header"><div class="pack-detail-identity"><span class="pack-detail-icon">${folderIcon(pack, 23)}</span><div><h1 class="pack-detail-title">${escapeHtml(pack.name)}</h1><p class="pack-detail-note">${escapeHtml(pack.note || 'A reusable set of teaching resources')} · ${countAssets(pack)} files</p></div></div><div class="header-actions">${actions}</div></header>
      <div class="section-heading pack-assets-heading"><div><h2>Resources in this pack</h2><p>${resources.length} ${resources.length === 1 ? 'resource' : 'resources'} · drag by the handle to reorder</p></div><button class="button button-primary" type="button" data-action="add-resource-to-pack" data-pack-id="${escapeHtml(pack.id)}">${icon('plus')} Add resources</button></div>
      ${resources.length ? `<div class="pack-resources-grid" data-pack-grid="${escapeHtml(pack.id)}">${resources.map((resource, index) => renderPackResourceCard(resource, index, pack)).join('')}</div>` : emptyState('folder', 'This pack is empty', 'Find a resource in Library and use + to add it here.', `<button class="button button-primary" type="button" data-action="navigate" data-section="library">${icon('search')} Browse Library</button>`)}
    </div>`;
  }

  function editorDefaults(resource = null) {
    return {
      id: resource?.id || null,
      title: resource?.title || '',
      titleRu: resource?.titleRu || '',
      description: resource?.description || '',
      descriptionRu: resource?.descriptionRu || '',
      level: resource?.level || 'A1',
      levelRu: resource?.levelRu || 'Начальный',
      topic: resource?.topic || 'Grammar',
      topicRu: resource?.topicRu || 'Грамматика',
      skill: resource?.skill || 'Speaking',
      skillRu: resource?.skillRu || 'Говорение',
      format: resource?.format || 'Worksheet',
      formatRu: resource?.formatRu || 'Рабочий лист',
      status: resource?.status || 'draft',
      assets: resource ? clone(assetsFor(resource.id)) : [],
    };
  }

  function renderManage() {
    const selected = state.editor;
    const list = state.resources.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const rows = list.map((resource) => {
      const selectedClass = selected?.id === resource.id ? 'is-selected' : '';
      const asset = assetsFor(resource.id)[0];
      return `<button class="manage-row ${selectedClass}" type="button" data-action="select-resource" data-resource-id="${escapeHtml(resource.id)}" aria-pressed="${selected?.id === resource.id}">${documentThumb(resource, asset, true)}<span class="manage-row-copy"><strong>${escapeHtml(resource.title)}</strong><small>${escapeHtml(resource.level)} · ${escapeHtml(resource.topic)} · ${assetsFor(resource.id).length} files</small></span><span class="status-badge ${resource.status === 'published' ? 'is-published' : 'is-draft'}"><span class="status-dot"></span>${resource.status === 'published' ? 'Published' : 'Draft'}</span></button>`;
    }).join('');
    return `${renderHeader('CATALOG TOOLS', 'Manage resources', 'Add and review teaching materials. Changes stay in this demo session.', `<button class="button button-primary" type="button" data-action="new-resource">${icon('plus')} New resource</button>`)}
      <div class="manage-layout"><section class="manage-list panel"><div class="manage-list-head"><h2>Resources</h2><span class="section-kicker">${list.length} items</span></div><div class="manage-items">${rows}</div></section>${renderResourceEditor()}</div>`;
  }

  function renderResourceEditor() {
    if (!state.editor) return `<section class="manage-editor panel">${emptyState('file', 'Choose a resource', 'Select a resource to edit, or create a new one.')}</section>`;
    const editor = state.editor;
    const assetRows = editor.assets.map((asset, index) => `<div class="asset-editor-row"><span class="asset-thumb">${icon({ pdf: 'file', image: 'image', audio: 'audio', video: 'video', external: 'external', download: 'download' }[asset.kind] || 'file')}</span><span class="asset-copy"><strong>${escapeHtml(asset.filename)}</strong><small>${escapeHtml(asset.format)} · demo placeholder</small></span><button class="icon-button" type="button" data-action="remove-editor-asset" data-index="${index}" aria-label="Remove ${escapeHtml(asset.filename)}">${icon('close')}</button></div>`).join('');
    const existing = Boolean(editor.id);
    const formTitle = existing ? 'Edit resource' : 'New resource';
    return `<section class="manage-editor panel"><div class="manage-list-head"><h2>${formTitle}</h2>${existing ? `<span class="status-badge ${editor.status === 'published' ? 'is-published' : 'is-draft'}">${editor.status === 'published' ? 'Published' : 'Draft'}</span>` : ''}</div>
      <form id="resource-editor-form" class="form-stack" novalidate>
        <div class="form-field"><label for="resource-title">Title <span aria-hidden="true">*</span></label><input id="resource-title" name="title" required maxlength="90" value="${escapeHtml(editor.title)}" placeholder="e.g. Present Perfect Practice" /></div>
        <div class="form-field"><label for="resource-description">Description</label><textarea id="resource-description" name="description" maxlength="240" placeholder="What will a teacher find in this resource?">${escapeHtml(editor.description)}</textarea></div>
        <div class="form-grid-two"><div class="form-field"><label for="resource-level">CEFR level</label><select id="resource-level" name="level">${['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((item) => `<option ${editor.level === item ? 'selected' : ''}>${item}</option>`).join('')}</select></div><div class="form-field"><label for="resource-topic">Topic</label><input id="resource-topic" name="topic" maxlength="45" value="${escapeHtml(editor.topic)}" /></div></div>
        <div class="form-grid-two"><div class="form-field"><label for="resource-skill">Skill</label><select id="resource-skill" name="skill">${['Speaking', 'Listening', 'Reading', 'Writing', 'Grammar', 'Vocabulary', 'Pronunciation'].map((item) => `<option ${editor.skill === item ? 'selected' : ''}>${item}</option>`).join('')}</select></div><div class="form-field"><label for="resource-format">Format</label><select id="resource-format" name="format">${['Worksheet', 'PDF', 'Audio lesson', 'Video lesson', 'Dialogue', 'Flashcards', 'Teacher guide', 'Interactive', 'Project'].map((item) => `<option ${editor.format === item ? 'selected' : ''}>${item}</option>`).join('')}</select></div></div>
        <div><div class="manage-list-head"><span class="field-label">Attached Assets</span><button class="text-link" type="button" data-action="add-editor-asset">${icon('plus')} Add file</button></div><div class="asset-editor-list">${assetRows || `<span class="form-help">No files attached. Add a demo placeholder below.</span>`}</div><p class="form-help">Adds a local placeholder only. No file is uploaded.</p></div>
        <div class="form-actions"><button class="button button-primary" type="submit">${icon('check')} ${existing ? 'Save changes' : 'Save as draft'}</button>${existing ? `<button class="button button-secondary" type="button" data-action="toggle-resource-status" data-resource-id="${escapeHtml(editor.id)}">${editor.status === 'published' ? 'Unpublish' : 'Publish resource'}</button>` : ''}</div>
      </form>
    </section>`;
  }

  function previewResourceArea(resource, asset) {
    if (!asset) return emptyState('file', 'No preview available', 'This resource has no demo asset attached.');
    const kind = asset.kind;
    if (kind === 'pdf') return `<div class="preview-media preview-pdf"><span class="document-sheet" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="thumb-caption">PDF · PAGE 1 OF 4</span></div>`;
    if (kind === 'image') return `<div class="preview-media preview-image">${icon('image', 40)}<span>Image preview</span></div>`;
    if (kind === 'audio' || kind === 'video') return `<div class="preview-media preview-audio"><span class="thumb-graphic">${icon(kind === 'audio' ? 'audio' : 'video', 30)}</span><button class="media-play" type="button" data-action="toggle-preview-play" aria-label="${state.previewPlaying ? 'Pause' : 'Play'} preview">${icon(state.previewPlaying ? 'pause' : 'play')}</button><div class="media-track"><i style="width:${state.previewPlaying ? '48%' : '23%'}"></i></div><span class="thumb-caption">${state.previewPlaying ? 'PLAYING DEMO' : `${kind.toUpperCase()} PREVIEW`}</span></div>`;
    if (kind === 'external') return `<div class="preview-media preview-link">${icon('external', 30)}<strong>Interactive resource</strong><span>External link · demo only</span></div>`;
    return `<div class="preview-media preview-download">${icon('download', 30)}<strong>${escapeHtml(asset.format)} resource</strong><span>Placeholder file · ready to download in a connected product</span></div>`;
  }

  function renderPreview() {
    if (!state.previewResourceId) return '';
    const resource = getResource(state.previewResourceId);
    if (!resource) return '';
    const resourceAssets = assetsFor(resource.id);
    const selected = resourceAssets.find((asset) => asset.id === state.previewAssetId) || resourceAssets[0] || null;
    const saved = isSaved(resource.id);
    const title = escapeHtml(resource.title);
    const assetList = resourceAssets.map((asset) => `<button class="asset-option" type="button" data-action="select-preview-asset" data-asset-id="${escapeHtml(asset.id)}" aria-pressed="${asset.id === selected?.id}"><span class="asset-thumb">${icon({ pdf: 'file', image: 'image', audio: 'audio', video: 'video', external: 'external', download: 'download' }[asset.kind] || 'file')}</span><span class="asset-copy"><strong>${escapeHtml(asset.filename)}</strong><small>${escapeHtml(asset.format)} · ${escapeHtml(asset.demoState)}</small></span>${asset.id === selected?.id ? `<span class="check-mark">${icon('checkCircle')}</span>` : ''}</button>`).join('');
    const actionLabel = selected?.kind === 'download' ? 'Download' : selected?.kind === 'external' ? 'View link' : 'Open';
    return `<div class="overlay-backdrop" data-action="close-preview-backdrop"><aside class="preview-panel" role="dialog" aria-modal="true" aria-labelledby="preview-title">
      <header class="preview-header"><div class="preview-head-copy"><p class="eyebrow">RESOURCE PREVIEW</p><h2 class="preview-title" id="preview-title">${title}</h2></div><button class="icon-button" type="button" data-action="close-preview" aria-label="Close preview">${icon('close')}</button></header>
      <div class="preview-body">${previewResourceArea(resource, selected)}<p class="preview-description">${escapeHtml(resource.description)}</p><div class="preview-tags">${tagsFor(resource, 4)}</div>
        <div class="preview-asset-heading"><span>Files in this resource</span><span class="section-kicker">${resourceAssets.length}</span></div><div class="asset-list">${assetList || `<span class="form-help">No files attached.</span>`}</div>
      </div>
      <footer class="preview-footer"><button class="icon-button save-heart ${saved ? 'is-saved' : ''}" type="button" data-action="toggle-favorite" data-resource-id="${escapeHtml(resource.id)}" aria-label="${saved ? 'Remove from Saved Resources' : 'Save resource'}" aria-pressed="${saved}">${icon('heart')}</button><button class="button button-secondary preview-add" type="button" data-action="open-pack-picker" data-resource-id="${escapeHtml(resource.id)}" aria-haspopup="menu">${icon('plus')} Add</button><button class="button button-primary preview-open" type="button" data-action="open-asset" data-resource-id="${escapeHtml(resource.id)}" data-asset-id="${escapeHtml(selected?.id || '')}">${icon(selected?.kind === 'download' ? 'download' : selected?.kind === 'external' ? 'external' : 'file')} ${actionLabel}</button></footer>
    </aside></div>`;
  }

  function renderViewer() {
    if (!state.viewer) return '';
    const resource = getResource(state.viewer.resourceId);
    const asset = state.assets.find((item) => item.id === state.viewer.assetId) || assetsFor(state.viewer.resourceId)[0];
    if (!resource || !asset) return '';
    let content = '';
    if (asset.kind === 'pdf') {
      content = `<article class="viewer-paper"><span class="eyebrow">${escapeHtml(resource.level)} · ${escapeHtml(resource.topic)}</span><h2>${escapeHtml(resource.title)}</h2><p>${escapeHtml(resource.description)}</p><div class="paper-rule"></div><p>Demo worksheet preview</p><div class="paper-lines"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="viewer-page-control"><button class="icon-button" type="button" data-action="viewer-page" data-direction="previous" aria-label="Previous page" ${state.viewer.page <= 1 ? 'disabled' : ''}>${icon('arrow-left')}</button><span>Page ${state.viewer.page} of 4</span><button class="icon-button" type="button" data-action="viewer-page" data-direction="next" aria-label="Next page" ${state.viewer.page >= 4 ? 'disabled' : ''}>${icon('chevron')}</button></div></article>`;
    } else if (asset.kind === 'image') {
      content = `<div class="viewer-image"><span class="thumb-graphic">${icon('image', 48)}</span></div>`;
    } else if (asset.kind === 'audio' || asset.kind === 'video') {
      const playing = Boolean(state.viewer.playing);
      const mediaTime = playing ? '01:12' : '00:00';
      content = `<div class="viewer-media-card"><span class="thumb-graphic">${icon(asset.kind === 'audio' ? 'audio' : 'video', 34)}</span><div><strong>${escapeHtml(asset.filename)}</strong><p>${asset.kind === 'audio' ? 'Audio lesson' : 'Video lesson'} · local demo</p></div><div class="media-track"><i style="width:${playing ? '46%' : '24%'}"></i></div><div class="viewer-controls"><button class="icon-button" type="button" data-action="viewer-toggle-play" aria-label="${playing ? 'Pause' : 'Play'} ${asset.kind}">${icon(playing ? 'pause' : 'play')}</button><span class="section-kicker">${playing ? 'Playing demo' : 'Ready to play'} · ${mediaTime}</span></div></div>`;
    } else if (asset.kind === 'external') {
      content = `<div class="viewer-message"><span class="empty-icon">${icon('external', 21)}</span><h2>External learning resource</h2><p>This link is a local demo placeholder. In the connected product it would open the teaching resource.</p><button class="button button-secondary" type="button" data-action="demo-external">${icon('external')} Preview destination</button></div>`;
    } else {
      content = `<div class="viewer-message"><span class="empty-icon">${icon('download', 21)}</span><h2>Download placeholder</h2><p>${escapeHtml(asset.filename)} is represented by a local demo state. No file is transferred.</p><button class="button button-primary" type="button" data-action="demo-download" data-asset-id="${escapeHtml(asset.id)}">${icon('download')} Confirm demo download</button></div>`;
    }
    return `<section class="demo-viewer" role="dialog" aria-modal="true" aria-label="Resource viewer"><header class="viewer-header"><button class="icon-button" type="button" data-action="close-viewer" aria-label="Close viewer">${icon('close')}</button><span class="viewer-title-wrap"><strong>${escapeHtml(asset.filename)}</strong><small>${escapeHtml(resource.title)} · ${escapeHtml(asset.format)} · demo viewer</small></span><button class="button button-secondary viewer-close-button" type="button" data-action="close-viewer">Done</button></header><div class="viewer-canvas">${content}</div></section>`;
  }

  function renderDialog() {
    if (!state.dialog) return '';
    if (state.dialog.type === 'confirm-delete-pack') {
      const pack = getPack(state.dialog.packId);
      if (!pack) return '';
      return `<div class="dialog-backdrop" data-action="backdrop-close"><section class="dialog-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><header class="dialog-header"><div><h2 id="confirm-title">Delete “${escapeHtml(pack.name)}”?</h2><p>The Lesson Pack will be removed. Resources stay in Library and other packs.</p></div><button class="icon-button" type="button" data-action="close-dialog" aria-label="Cancel">${icon('close')}</button></header><div class="confirm-copy"><span class="empty-icon">${icon('info')}</span><span>This only deletes the collection and its order. Attached Resources and Assets are not deleted.</span></div><footer class="dialog-footer"><button class="button button-secondary" type="button" data-action="close-dialog">Keep pack</button><button class="button button-danger" type="button" data-action="confirm-delete-pack" data-pack-id="${escapeHtml(pack.id)}">Delete pack</button></footer></section></div>`;
    }
    return renderPackEditorDialog();
  }

  function renderPackEditorDialog() {
    const dialog = state.dialog;
    const pack = dialog.packId ? getPack(dialog.packId) : null;
    const name = dialog.name || '';
    const note = dialog.note || '';
    const previewIds = [...(pack?.resourceIds || [])];
    if (dialog.pendingResourceId && !previewIds.includes(dialog.pendingResourceId)) previewIds.push(dialog.pendingResourceId);
    const preview = { id: pack?.id || 'new', name: name.trim() || 'New Lesson Pack', note, icon: dialog.icon, accent: dialog.accent, resourceIds: previewIds };
    const iconChoices = packIcons.map(([key, label]) => `<button class="icon-choice" type="button" data-action="choose-pack-icon" data-value="${key}" data-focus-key="pack-icon-${key}" aria-label="${label}" aria-pressed="${dialog.icon === key}">${icon(key)}</button>`).join('');
    const colorChoices = accents.map((accent) => `<button class="accent-choice" type="button" style="--choice-color:${accent.color}" data-action="choose-pack-accent" data-value="${accent.key}" data-focus-key="pack-accent-${accent.key}" aria-label="${accent.label}" title="${accent.label}" aria-pressed="${dialog.accent === accent.key}"></button>`).join('');
    const title = pack ? 'Edit Lesson Pack' : 'Create a Lesson Pack';
    return `<div class="dialog-backdrop" data-action="backdrop-close"><section class="dialog-card pack-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="pack-editor-title"><header class="dialog-header"><div><h2 id="pack-editor-title">${title}</h2><p>Make a clear, reusable home for the resources you need.</p></div><button class="icon-button" type="button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></header>
      <form id="pack-editor-form"><div class="dialog-content"><div class="folder-live-preview" style="--pack-accent:${packAccent(dialog.accent)}"><span class="folder-icon">${folderIcon(preview, 22)}</span><span><strong data-live-pack-name>${escapeHtml(preview.name)}</strong><small>${countAssets(preview)} files · ready to fill</small></span></div>
        <div class="form-field"><label for="pack-name">Pack name <span aria-hidden="true">*</span></label><input id="pack-name" name="name" required maxlength="48" value="${escapeHtml(name)}" placeholder="e.g. B1 Speaking Lab" data-pack-field="name" /></div>
        <div class="form-field"><label for="pack-note">Note <span class="form-help">Optional</span></label><textarea id="pack-note" name="note" maxlength="120" placeholder="A short reminder about this set" data-pack-field="note">${escapeHtml(note)}</textarea></div>
        <div><span class="field-label">Choose an icon</span><div class="choice-grid icon-choice-grid" role="group" aria-label="Pack icon">${iconChoices}</div></div>
        <div><span class="field-label">Folder accent</span><div class="choice-grid accent-choice-grid" role="group" aria-label="Folder accent">${colorChoices}</div></div>
      </div><footer class="dialog-footer"><button class="button button-secondary" type="button" data-action="close-dialog">Cancel</button><button class="button button-primary" type="submit">${icon('check')} ${pack ? 'Save changes' : 'Create pack'}</button></footer></form>
    </section></div>`;
  }

  function renderOverlay() {
    return `${renderPreview()}${renderViewer()}${renderDialog()}${state.filterSheet ? renderFilterSheet() : ''}`;
  }

  function renderPopover() {
    const target = state.popover;
    if (!target) { popoverRoot.innerHTML = ''; return; }
    if (target.type === 'facet') {
      popoverRoot.innerHTML = `<div class="popover" data-popover="facet"><div class="popover-title"><span>${facetLabels[target.facet]}</span><button class="text-link" type="button" data-action="clear-one-filter" data-facet="${target.facet}">Clear</button></div><div class="popover-list">${renderFilterGroup(target.facet)}</div></div>`;
    } else if (target.type === 'pack-picker') {
      const resource = getResource(target.resourceId);
      if (!resource) { popoverRoot.innerHTML = ''; return; }
      const packs = state.packs.map((pack) => {
        const already = pack.resourceIds.includes(resource.id);
        return `<button class="pack-choice" type="button" role="menuitem" data-action="add-to-pack" data-pack-id="${escapeHtml(pack.id)}" data-resource-id="${escapeHtml(resource.id)}"><span class="folder-icon" style="--pack-accent:${packAccent(pack.accent)}">${folderIcon(pack, 17)}</span><span class="pack-choice-name">${escapeHtml(pack.name)}</span><span class="pack-choice-count">${already ? 'Added' : `${countAssets(pack)} files`}</span>${already ? icon('check', 15) : ''}</button>`;
      }).join('');
      const preferred = getPack(target.preferredPackId);
      const preferredAction = preferred ? `<button class="popover-action preferred-pack-action" type="button" data-action="add-to-pack" data-pack-id="${escapeHtml(preferred.id)}" data-resource-id="${escapeHtml(resource.id)}">${icon('plus')} Add to ${escapeHtml(preferred.name)}</button><div class="popover-divider"></div>` : '';
      popoverRoot.innerHTML = `<div class="popover pack-picker" role="menu" aria-label="Choose a Lesson Pack"><div class="popover-title"><span>Add to a Lesson Pack</span><button class="icon-button popover-close" type="button" data-action="close-popover" aria-label="Close">${icon('close', 15)}</button></div>${preferredAction}<div class="popover-list">${packs || `<p class="form-help">Create a pack to organize this resource.</p>`}</div><div class="popover-divider"></div><button class="popover-action" type="button" data-action="create-pack-from-picker" data-resource-id="${escapeHtml(resource.id)}">${icon('plus')} Create a new pack</button></div>`;
    } else if (target.type === 'profile') {
      const isDark = state.theme === 'dark';
      popoverRoot.innerHTML = `<div class="popover profile-menu" role="menu" aria-label="Profile and display settings"><div class="popover-title"><span>Display</span><span class="section-kicker">METHODIST</span></div><button class="menu-row" type="button" role="menuitem" data-action="toggle-theme"><span>${icon(isDark ? 'sun' : 'moon')}</span><span>${isDark ? 'Light appearance' : 'Dark appearance'}</span><span class="menu-check">${icon(isDark ? 'check' : 'chevron')}</span></button><div class="popover-divider"></div><div class="profile-menu-foot"><span class="profile-avatar">M</span><span><strong>Methodist</strong><small>LanguagePower Hub</small></span></div></div>`;
    } else if (target.type === 'asset-picker') {
      const choices = [['pdf', 'PDF document', 'file'], ['image', 'Image', 'image'], ['audio', 'Audio', 'audio'], ['video', 'Video', 'video'], ['external', 'External link', 'external'], ['download', 'Download file', 'download']];
      popoverRoot.innerHTML = `<div class="popover asset-picker"><div class="popover-title"><span>Add a demo Asset</span></div><div class="popover-list">${choices.map(([kind, label, iconName]) => `<button class="pack-choice" type="button" data-action="create-demo-asset" data-kind="${kind}"><span class="asset-thumb">${icon(iconName)}</span><span class="pack-choice-name">${label}</span></button>`).join('')}</div><p class="form-help">Creates a placeholder only. No file is uploaded.</p></div>`;
    }
    positionPopover();
  }

  function positionPopover() {
    const target = state.popover;
    const element = popoverRoot.querySelector('.popover');
    if (!target || !element) return;
    const rect = target.rect || { left: window.innerWidth / 2, right: window.innerWidth / 2, top: 80, bottom: 120 };
    const width = Math.min(element.offsetWidth || 300, window.innerWidth - 20);
    const height = element.offsetHeight || 280;
    let left = rect.left;
    if (left + width > window.innerWidth - 10) left = window.innerWidth - width - 10;
    left = Math.max(10, left);
    let top = rect.bottom + 8;
    if (top + height > window.innerHeight - 10) top = rect.top - height - 8;
    top = Math.max(10, Math.min(top, window.innerHeight - height - 10));
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  }

  function focusDialogIfNeeded() {
    const dialog = overlayRoot.querySelector('.demo-viewer') || overlayRoot.querySelector('[role="alertdialog"]') || overlayRoot.querySelector('.dialog-card') || overlayRoot.querySelector('.filter-sheet') || overlayRoot.querySelector('.preview-panel');
    if (!dialog) return;
    const active = document.activeElement;
    if (dialog.contains(active)) return;
    const initial = dialog.querySelector('input:not([type="hidden"]), button:not(:disabled), select, textarea');
    initial?.focus({ preventScroll: true });
  }

  function showToast(message, kind = 'success') {
    toastRoot.innerHTML = `<div class="toast ${kind === 'error' ? 'is-error' : ''}">${icon(kind === 'error' ? 'info' : 'checkCircle')}<span>${escapeHtml(message)}</span></div>`;
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => { toastRoot.innerHTML = ''; }, 2600);
  }

  function setPopover(type, anchor, details = {}) {
    if (state.popover?.type === type && state.popover?.resourceId === details.resourceId && state.popover?.facet === details.facet) {
      state.popover = null;
    } else {
      const rect = anchor?.getBoundingClientRect();
      state.popover = { type, rect: rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } : null, ...details };
    }
    render();
  }

  function openPreview(resourceId, focusKey = null) {
    const resource = getResource(resourceId);
    if (!resource) return;
    state.popover = null;
    state.previewResourceId = resource.id;
    state.previewAssetId = assetsFor(resource.id)[0]?.id || null;
    state.previewPlaying = false;
    state.recent = [resource.id, ...state.recent.filter((id) => id !== resource.id)].slice(0, 6);
    state.focusKey = null;
    render();
  }

  function closePreview() {
    const resourceId = state.previewResourceId;
    state.focusKey = resourceId ? `preview-${resourceId}` : null;
    state.previewResourceId = null;
    state.previewAssetId = null;
    state.previewPlaying = false;
    render();
  }

  function openPackDialog(pack = null, pendingResourceId = null, returnKey = null) {
    state.popover = null;
    state.dialog = {
      type: 'pack-editor', packId: pack?.id || null, pendingResourceId,
      name: pack?.name || '', note: pack?.note || '', icon: pack ? packIconName(pack.icon) : 'book', accent: pack?.accent || 'blue',
      returnKey: returnKey || (pendingResourceId ? `add-${pendingResourceId}` : 'create-pack-button'),
    };
    render();
  }

  function toggleFavorite(resourceId) {
    if (isSaved(resourceId)) state.favorites = state.favorites.filter((id) => id !== resourceId);
    else state.favorites = [resourceId, ...state.favorites];
    render();
    showToast(isSaved(resourceId) ? 'Added to Saved Resources' : 'Removed from Saved Resources');
  }

  function addToPack(packId, resourceId) {
    const pack = getPack(packId);
    const resource = getResource(resourceId);
    if (!pack || !resource) return;
    const result = core.addResourceToPack(pack, resourceId);
    state.packs = state.packs.map((item) => item.id === packId ? result.pack : item);
    state.popover = null;
    state.addedResourceId = result.added ? resourceId : null;
    render();
    showToast(result.added ? `Added to ${pack.name}` : `Already in ${pack.name}`, result.added ? 'success' : 'error');
    if (result.added) window.setTimeout(() => { if (state.addedResourceId === resourceId) { state.addedResourceId = null; render(); } }, 1400);
  }

  function navigate(section) {
    if (!navItems.some((item) => item.id === section)) return;
    state.section = section;
    state.animateView = true;
    if (section === 'library') state.savedOnly = false;
    else state.pendingPackTargetId = null;
    state.activePackId = null;
    state.popover = null;
    state.filterSheet = false;
    state.dialog = null;
    state.viewer = null;
    state.previewResourceId = null;
    state.focusKey = null;
    window.scrollTo({ top: 0, behavior: 'instant' });
    render();
  }

  function captureEditorForm() {
    const form = document.getElementById('resource-editor-form');
    if (!form || !state.editor) return;
    const values = new FormData(form);
    for (const field of ['title', 'description', 'level', 'topic', 'skill', 'format']) state.editor[field] = values.get(field) || '';
  }

  function saveResource() {
    captureEditorForm();
    const editor = state.editor;
    if (!editor?.title.trim()) {
      document.getElementById('resource-title')?.focus();
      showToast('Add a title before saving.', 'error');
      return;
    }
    const id = editor.id || `res-demo-${Date.now()}`;
    const existing = getResource(id);
    const resource = {
      id,
      title: editor.title.trim(), titleRu: existing?.titleRu || '',
      description: editor.description.trim(), descriptionRu: existing?.descriptionRu || '',
      level: editor.level, levelRu: existing?.levelRu || '',
      topic: editor.topic.trim(), topicRu: existing?.topicRu || '',
      skill: editor.skill, skillRu: existing?.skillRu || '',
      format: editor.format, formatRu: existing?.formatRu || '',
      status: existing?.status || 'draft', createdAt: existing?.createdAt || new Date().toISOString(),
    };
    if (existing) state.resources = state.resources.map((item) => item.id === id ? resource : item);
    else state.resources = [resource, ...state.resources];
    const newAssets = editor.assets.map((asset) => ({ ...asset, resourceId: id }));
    state.assets = [...state.assets.filter((asset) => asset.resourceId !== id), ...newAssets];
    state.editor = editorDefaults(resource);
    state.editor.assets = clone(newAssets);
    render();
    showToast(existing ? 'Resource changes saved' : 'Draft saved in Manage');
  }

  function editorFromForm() {
    captureEditorForm();
    return state.editor;
  }

  function changeResourceStatus(resourceId) {
    const resource = getResource(resourceId);
    if (!resource) return;
    if (state.editor?.id === resourceId) saveResource();
    const current = getResource(resourceId);
    const status = current.status === 'published' ? 'draft' : 'published';
    state.resources = core.setResourceStatus(state.resources, resourceId, status);
    if (state.editor?.id === resourceId) state.editor.status = status;
    render();
    showToast(status === 'published' ? 'Resource published to Library' : 'Resource unpublished; pack links remain');
  }

  function createEditorAsset(kind) {
    const editor = editorFromForm();
    const normalized = String(kind || '').trim().toLowerCase();
    const kinds = { pdf: ['PDF', 'pdf'], image: ['PNG', 'image'], audio: ['MP3', 'audio'], video: ['MP4', 'video'], external: ['WEB', 'external'], download: ['ZIP', 'download'] };
    if (!kinds[normalized]) { showToast('Use pdf, image, audio, video, external, or download.', 'error'); return; }
    const [format, assetKind] = kinds[normalized];
    const title = editor.title.trim() || 'New resource';
    const asset = { id: `asset-demo-${Date.now()}`, resourceId: editor.id || 'pending', filename: `${title.replace(/[^a-z0-9 -]/gi, '').trim().replace(/\s+/g, '-') || 'Demo-resource'}.${format.toLowerCase()}`, filenameRu: '', format, kind: assetKind, demoState: `${format} placeholder` };
    editor.assets.push(asset);
    state.popover = null;
    render();
    document.querySelector('[data-action="add-editor-asset"]')?.focus({ preventScroll: true });
  }

  function savePackDialog(event) {
    event.preventDefault();
    const dialog = state.dialog;
    if (!dialog || dialog.type !== 'pack-editor') return;
    const nameInput = document.getElementById('pack-name');
    if (!dialog.name.trim()) { nameInput?.focus(); showToast('Give your Lesson Pack a name.', 'error'); return; }
    const packData = { name: dialog.name.trim(), note: dialog.note.trim(), icon: dialog.icon, accent: dialog.accent };
    if (dialog.packId) {
      state.packs = state.packs.map((pack) => pack.id === dialog.packId ? { ...pack, ...packData } : pack);
      state.dialog = null;
      state.focusKey = `edit-pack-${dialog.packId}`;
      render();
      showToast('Lesson Pack updated');
      return;
    }
    const id = `pack-demo-${Date.now()}`;
    const newPack = { id, ...packData, resourceIds: [] };
    if (dialog.pendingResourceId) {
      const result = core.addResourceToPack(newPack, dialog.pendingResourceId);
      state.packs = [result.pack, ...state.packs];
      state.section = 'library';
      state.activePackId = null;
      state.addedResourceId = dialog.pendingResourceId;
    } else {
      state.packs = [newPack, ...state.packs];
      state.section = dialog.returnKey === 'create-pack-button' ? state.section : 'lesson-packs';
      state.animateView = true;
      state.activePackId = state.section === 'lesson-packs' ? id : null;
    }
    state.dialog = null;
    state.focusKey = `open-pack-${id}`;
    render();
    showToast(dialog.pendingResourceId ? `Created ${newPack.name} and added resource` : `Created ${newPack.name}`);
  }

  function movePackResource(packId, resourceId, direction) {
    const pack = getPack(packId);
    if (!pack) return;
    const currentIndex = pack.resourceIds.indexOf(resourceId);
    const nextIndex = currentIndex + (direction === 'up' ? -1 : 1);
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= pack.resourceIds.length) return;
    const resourceIds = [...pack.resourceIds];
    [resourceIds[currentIndex], resourceIds[nextIndex]] = [resourceIds[nextIndex], resourceIds[currentIndex]];
    state.packs = state.packs.map((item) => item.id === packId ? { ...item, resourceIds } : item);
    state.focusKey = `resource-${resourceId}`;
    render();
  }

  function openViewer(resourceId, assetId) {
    const resource = getResource(resourceId);
    const asset = state.assets.find((item) => item.id === assetId) || assetsFor(resourceId)[0];
    if (!resource || !asset) { showToast('No demo file is attached.', 'error'); return; }
    if (asset.kind === 'external') {
      state.viewer = { resourceId, assetId: asset.id, page: 1, playing: false };
      render();
      return;
    }
    if (asset.kind === 'download') {
      showToast(`${asset.filename} is a demo placeholder. No file was downloaded.`);
      return;
    }
    state.viewer = { resourceId, assetId: asset.id, page: 1, playing: false };
    render();
  }

  function closeViewer() {
    state.viewer = null;
    render();
    if (state.previewResourceId) document.querySelector('[data-action="close-preview"]')?.focus({ preventScroll: true });
  }

  function handleClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) {
      if (state.popover && !event.target.closest('.popover')) { state.popover = null; render(); }
      return;
    }
    const action = target.dataset.action;
    switch (action) {
      case 'navigate': navigate(target.dataset.section); break;
      case 'toggle-profile': setPopover('profile', target); break;
      case 'toggle-theme': state.theme = state.theme === 'light' ? 'dark' : 'light'; state.popover = null; render(); showToast(`${state.theme === 'dark' ? 'Dark' : 'Light'} appearance`); break;
      case 'open-preview': openPreview(target.dataset.resourceId, target.dataset.focusKey); break;
      case 'close-preview': closePreview(); break;
      case 'close-preview-backdrop': if (event.target === target) closePreview(); break;
      case 'toggle-favorite': event.stopPropagation(); toggleFavorite(target.dataset.resourceId); break;
      case 'open-pack-picker': event.stopPropagation(); setPopover('pack-picker', target, { resourceId: target.dataset.resourceId, preferredPackId: state.pendingPackTargetId }); break;
      case 'close-popover': state.popover = null; render(); break;
      case 'add-to-pack': addToPack(target.dataset.packId, target.dataset.resourceId); break;
      case 'create-pack-from-picker': openPackDialog(null, target.dataset.resourceId, `add-${target.dataset.resourceId}`); break;
      case 'create-pack': openPackDialog(null, null, target.dataset.focusKey || 'create-pack-button'); break;
      case 'edit-pack': openPackDialog(getPack(target.dataset.packId), null, `edit-pack-${target.dataset.packId}`); break;
      case 'open-pack': state.section = 'lesson-packs'; state.animateView = true; state.activePackId = target.dataset.packId; state.popover = null; window.scrollTo({ top: 0, behavior: 'instant' }); render(); break;
      case 'back-to-packs': state.animateView = true; state.activePackId = null; render(); break;
      case 'open-delete-pack': state.dialog = { type: 'confirm-delete-pack', packId: target.dataset.packId }; render(); break;
      case 'confirm-delete-pack': {
        const pack = getPack(target.dataset.packId);
        state.packs = state.packs.filter((item) => item.id !== target.dataset.packId);
        state.activePackId = null;
        state.dialog = null;
        render();
        showToast(pack ? `${pack.name} deleted; resources are unchanged` : 'Lesson Pack deleted');
        break;
      }
      case 'close-dialog': state.dialog = null; render(); break;
      case 'backdrop-close': if (event.target === target) { if (state.filterSheet) { state.filterSheet = false; state.focusKey = 'open-filter-sheet'; render(); } else if (state.dialog) { state.dialog = null; render(); } } break;
      case 'choose-pack-icon': state.dialog.icon = target.dataset.value; state.focusKey = `pack-icon-${target.dataset.value}`; render(); break;
      case 'choose-pack-accent': state.dialog.accent = target.dataset.value; state.focusKey = `pack-accent-${target.dataset.value}`; render(); break;
      case 'open-facet': setPopover('facet', target, { facet: target.dataset.facet }); break;
      case 'clear-one-filter': state.filters[target.dataset.facet] = []; render(); break;
      case 'clear-filters': state.filters = { level: [], topic: [], skill: [], format: [] }; state.popover = null; render(); break;
      case 'clear-query': state.query = ''; render(); document.querySelector('.search-input')?.focus(); break;
      case 'reset-search': state.query = ''; state.filters = { level: [], topic: [], skill: [], format: [] }; state.popover = null; state.filterSheet = false; render(); document.querySelector('.search-input')?.focus(); break;
      case 'remove-filter': state.filters[target.dataset.facet] = state.filters[target.dataset.facet].filter((value) => value !== target.dataset.value); render(); break;
      case 'open-filter-sheet': state.filterSheet = true; state.popover = null; render(); break;
      case 'close-filter-sheet': state.filterSheet = false; state.focusKey = 'open-filter-sheet'; render(); break;
      case 'select-preview-asset': state.previewAssetId = target.dataset.assetId; state.previewPlaying = false; render(); break;
      case 'toggle-preview-play': state.previewPlaying = !state.previewPlaying; render(); break;
      case 'open-asset': openViewer(target.dataset.resourceId, target.dataset.assetId); break;
      case 'close-viewer': closeViewer(); break;
      case 'viewer-page': if (state.viewer) { state.viewer.page = Math.max(1, Math.min(4, state.viewer.page + (target.dataset.direction === 'next' ? 1 : -1))); render(); } break;
      case 'viewer-toggle-play': if (state.viewer) { state.viewer.playing = !state.viewer.playing; render(); } break;
      case 'demo-external': showToast('External destination is a non-connected demo placeholder.'); break;
      case 'demo-download': showToast('Demo download confirmed. No file was transferred.'); break;
      case 'new-resource': state.editor = editorDefaults(); render(); document.getElementById('resource-title')?.focus(); break;
      case 'select-resource': state.editor = editorDefaults(getResource(target.dataset.resourceId)); render(); break;
      case 'add-editor-asset': setPopover('asset-picker', target); break;
      case 'create-demo-asset': createEditorAsset(target.dataset.kind); break;
      case 'remove-editor-asset': if (state.editor) { captureEditorForm(); state.editor.assets.splice(Number(target.dataset.index), 1); render(); } break;
      case 'toggle-resource-status': changeResourceStatus(target.dataset.resourceId); break;
      case 'show-saved': state.section = 'library'; state.animateView = true; state.query = ''; state.filters = { level: [], topic: [], skill: [], format: [] }; state.sort = 'title'; state.savedOnly = true; render(); break;
      case 'show-all-library': state.savedOnly = false; state.query = ''; state.filters = { level: [], topic: [], skill: [], format: [] }; state.sort = 'relevance'; render(); break;
      case 'add-resource-to-pack': state.section = 'library'; state.animateView = true; state.activePackId = null; state.sort = 'relevance'; state.savedOnly = false; state.pendingPackTargetId = target.dataset.packId; render(); showToast('Choose resources with + to add them to this pack.'); break;
      case 'move-resource': movePackResource(target.dataset.packId, target.dataset.resourceId, target.dataset.direction); break;
      case 'remove-pack-resource': {
        const pack = getPack(target.dataset.packId);
        if (pack) state.packs = state.packs.map((item) => item.id === pack.id ? core.removeResourceFromPack(item, target.dataset.resourceId) : item);
        render(); showToast('Resource removed from this pack'); break;
      }
      case 'drag-handle': event.preventDefault(); break;
      default: break;
    }
  }

  function handleInput(event) {
    if (event.target.matches('.search-input')) {
      state.query = event.target.value;
      state.popover = null;
      render();
      return;
    }
    if (event.target.matches('[data-pack-field="name"]')) {
      state.dialog.name = event.target.value;
      const label = document.querySelector('[data-live-pack-name]');
      if (label) label.textContent = state.dialog.name.trim() || 'New Lesson Pack';
    } else if (event.target.matches('[data-pack-field="note"]')) state.dialog.note = event.target.value;
    else if (event.target.closest('#resource-editor-form') && state.editor) captureEditorForm();
  }

  function handleChange(event) {
    if (event.target.matches('[data-action="filter-value"]')) {
      const facet = event.target.dataset.facet;
      const value = event.target.value;
      const values = state.filters[facet];
      state.filters[facet] = event.target.checked ? [...new Set([...values, value])] : values.filter((item) => item !== value);
      render();
      return;
    }
    if (event.target.matches('[data-action="sort"]')) {
      state.sort = event.target.value;
      render();
      return;
    }
    if (event.target.closest('#resource-editor-form') && state.editor) captureEditorForm();
  }

  function handleSubmit(event) {
    if (event.target.id === 'pack-editor-form') { savePackDialog(event); return; }
    if (event.target.id === 'resource-editor-form') { event.preventDefault(); saveResource(); }
  }

  function handleKeydown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      state.section = 'library';
      state.animateView = true;
      state.activePackId = null;
      state.previewResourceId = null;
      state.popover = null;
      state.filterSheet = false;
      render();
      requestAnimationFrame(() => document.querySelector('.search-input')?.focus({ preventScroll: true }));
      return;
    }
    if (event.key === 'Escape') {
      if (state.viewer) { closeViewer(); return; }
      if (state.dialog) { state.dialog = null; render(); return; }
      if (state.filterSheet) { state.filterSheet = false; state.focusKey = 'open-filter-sheet'; render(); return; }
      if (state.previewResourceId) { closePreview(); return; }
      if (state.popover) { state.popover = null; render(); return; }
    }
    if (event.key === 'Enter' && event.target.matches('.card-open-hit')) {
      openPreview(event.target.dataset.resourceId, event.target.dataset.focusKey);
    }
    if (event.target.matches('.pack-resource-card') && event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      movePackResource(event.target.dataset.packId, event.target.dataset.packResourceCard, event.key === 'ArrowUp' ? 'up' : 'down');
    }
    if (event.key === 'Tab' && (state.dialog || state.viewer || state.previewResourceId || state.filterSheet)) {
      const root = state.viewer ? overlayRoot.querySelector('.demo-viewer') : state.dialog ? overlayRoot.querySelector('[role="dialog"], [role="alertdialog"]') : state.filterSheet ? overlayRoot.querySelector('.filter-sheet') : overlayRoot.querySelector('.preview-panel');
      if (root) trapTab(event, root);
    }
  }

  function trapTab(event, root) {
    const nodes = [...root.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter((node) => node.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  let dragPointerId = null;
  function handlePointerDown(event) {
    const handle = event.target.closest('[data-action="drag-handle"]');
    if (!handle) return;
    const card = handle.closest('[data-pack-resource-card]');
    if (!card) return;
    dragPointerId = event.pointerId;
    state.drag = { resourceId: card.dataset.packResourceCard, packId: card.dataset.packId, startY: event.clientY, currentY: event.clientY, moved: false };
    handle.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!state.drag || dragPointerId !== event.pointerId) return;
    if (Math.abs(event.clientY - state.drag.startY) > 5) state.drag.moved = true;
    state.drag.currentY = event.clientY;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-pack-resource-card]');
    document.querySelectorAll('.pack-resource-card.is-drop-target').forEach((node) => node.classList.remove('is-drop-target'));
    if (target && target.dataset.packId === state.drag.packId && target.dataset.packResourceCard !== state.drag.resourceId) target.classList.add('is-drop-target');
  }

  function handlePointerUp(event) {
    if (!state.drag || dragPointerId !== event.pointerId) return;
    const source = state.drag;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-pack-resource-card]');
    if (source.moved && target && target.dataset.packId === source.packId && target.dataset.packResourceCard !== source.resourceId) {
      reorderResource(source.packId, source.resourceId, target.dataset.packResourceCard);
    } else state.drag = null;
    dragPointerId = null;
    document.querySelectorAll('.pack-resource-card.is-drop-target').forEach((node) => node.classList.remove('is-drop-target'));
  }

  function reorderResource(packId, fromId, toId) {
    const pack = getPack(packId);
    if (!pack) return;
    const ids = [...pack.resourceIds];
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, fromId);
    state.packs = state.packs.map((item) => item.id === packId ? { ...item, resourceIds: ids } : item);
    state.drag = null;
    render();
    showToast('Lesson Pack order updated');
  }

  function handleOutsideClick(event) {
    if (!state.popover) return;
    if (event.target.closest('.popover') || event.target.closest('[data-action="open-facet"]') || event.target.closest('[data-action="open-pack-picker"]') || event.target.closest('[data-action="toggle-profile"]') || event.target.closest('[data-action="add-editor-asset"]')) return;
    state.popover = null;
    render();
  }

  document.addEventListener('click', handleClick);
  document.addEventListener('input', handleInput);
  document.addEventListener('change', handleChange);
  document.addEventListener('submit', handleSubmit);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('pointerdown', handlePointerDown);
  document.addEventListener('pointermove', handlePointerMove);
  document.addEventListener('pointerup', handlePointerUp);
  document.addEventListener('click', handleOutsideClick, true);
  window.addEventListener('resize', positionPopover);
  window.addEventListener('scroll', positionPopover, true);
  render();
})();

