(function attachIcons(root) {
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    library: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 4V2.5M16 4V2.5M3 9h18"/><path d="m8 14 2 2 5-5"/>',
    bookmark: '<path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.5L6 21z"/>',
    folder: '<path d="M3 7.75A2.75 2.75 0 0 1 5.75 5h4.1l2.2 2H18.25A2.75 2.75 0 0 1 21 9.75v7.5A2.75 2.75 0 0 1 18.25 20h-12.5A2.75 2.75 0 0 1 3 17.25z"/>',
    manage: '<path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M2 14h4m4-6h4m4 8h4"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'arrow-left': '<path d="m14 5-7 7 7 7M7 12h14"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    user: '<circle cx="12" cy="8" r="3.25"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    moon: '<path d="M20.7 14.2A8.5 8.5 0 0 1 9.8 3.3a8.5 8.5 0 1 0 10.9 10.9Z"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20M8 7h8M8 10h7"/>',
    headphones: '<path d="M3 13v-1a9 9 0 0 1 18 0v1"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/><path d="M21 18a4 4 0 0 1-4 4h-2"/>',
    message: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-4.4a8.4 8.4 0 1 1 16.1-5.1Z"/><path d="M8 11h8m-8 4h5"/>',
    puzzle: '<path d="M4 4h5a2 2 0 1 1 4 0h7v6a2 2 0 1 0 0 4v6h-6a2 2 0 1 1-4 0H4v-6a2 2 0 1 0 0-4z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    bulb: '<path d="M9 18h6m-5 3h4m-2-19a7 7 0 0 0-4 12.75c.8.55 1 1.25 1 2.25h6c0-1 .2-1.7 1-2.25A7 7 0 0 0 12 2Z"/>',
    sparkles: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
    note: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h6"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    audio: '<path d="M3 10v4m4-7v10m4-13v16m4-13v10m4-7v4"/>',
    video: '<rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3z"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 19v2h16v-2"/>',
    external: '<path d="M14 4h6v6m-11 3L20 4"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
    play: '<path d="m8 5 12 7-12 7z"/>',
    pause: '<path d="M8 5h3v14H8zm6 0h3v14h-3z"/>',
    grip: '<circle cx="8" cy="6" r="1"/><circle cx="16" cy="6" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="8" cy="18" r="1"/><circle cx="16" cy="18" r="1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    grid: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
    filter: '<path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="8" cy="7" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="11" cy="17" r="2"/>',
    dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    arrowUp: '<path d="m7 14 5-5 5 5"/>',
    arrowDown: '<path d="m7 10 5 5 5-5"/>',
    upload: '<path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 16v4h16v-4"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
    bookOpen: '<path d="M12 7v14m0-14C9 4 5 4 3 5v14c2-1 6-1 9 2m0-14c3-3 7-3 9-2v14c-2-1-6-1-9 2"/>',
    move: '<path d="m8 7 4-4 4 4m-4-4v18m-4-4 4 4 4-4"/>',
  };

  function svg(name, size = 20, extraClass = '') {
    const path = paths[name] || paths.file;
    return `<svg class="icon ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
  }

  root.LPHIcons = Object.freeze({ svg, has: name => Boolean(paths[name]) });
})(window);
