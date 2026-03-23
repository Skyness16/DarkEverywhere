/**
 * Content script: solo DOM y estilos. Estado vía DARK_EVERYWHERE_STORAGE (sync o local).
 */
/* global DARK_EVERYWHERE, DARK_EVERYWHERE_STORAGE */

var state = {
  enabled: true,
  excluded: false,
  brightness: DARK_EVERYWHERE.DEFAULTS.brightness,
  contrast: DARK_EVERYWHERE.DEFAULTS.contrast,
};

var styleObserver = null;

function buildCss() {
  return (
    '\n    :root {\n' +
    '      --dark-bg: ' +
    state.brightness +
    ';\n' +
    '      --dark-text: ' +
    state.contrast +
    ';\n' +
    '    }\n' +
    '    html {\n' +
    '      filter: invert(1) hue-rotate(180deg) brightness(var(--dark-bg)) contrast(var(--dark-text)) !important;\n' +
    '    }\n' +
    '    img, video, canvas, picture, svg:not(:root), embed, object, iframe,\n' +
    '    [style*="background-image"] {\n' +
    '      filter: invert(1) hue-rotate(180deg) !important;\n' +
    '    }\n'
  );
}

function setRootVars() {
  var root = document.documentElement;
  root.style.setProperty('--dark-bg', String(state.brightness));
  root.style.setProperty('--dark-text', String(state.contrast));
}

function shouldApplyDark() {
  return state.enabled && !state.excluded;
}

function applyStylesheet() {
  if (!shouldApplyDark()) return;
  var id = DARK_EVERYWHERE.STYLE_ID;
  var existing = document.getElementById(id);
  if (existing) {
    existing.textContent = buildCss();
    setRootVars();
    return;
  }
  var style = document.createElement('style');
  style.id = id;
  style.setAttribute('data-dark-everywhere', '1');
  style.textContent = buildCss();
  (document.head || document.documentElement).appendChild(style);
  setRootVars();
}

function removeStylesheet() {
  var el = document.getElementById(DARK_EVERYWHERE.STYLE_ID);
  if (el) el.remove();
  document.documentElement.style.removeProperty('--dark-bg');
  document.documentElement.style.removeProperty('--dark-text');
}

function syncStateFromStorage(done) {
  DARK_EVERYWHERE_STORAGE.get(DARK_EVERYWHERE.DEFAULTS, function (d) {
    state.enabled = d.enabled !== false;
    state.excluded = DARK_EVERYWHERE.hostMatchesExcluded(location.hostname, d.excludedHosts || []);
    state.brightness = DARK_EVERYWHERE.clampBrightness(d.brightness);
    state.contrast = DARK_EVERYWHERE.clampContrast(d.contrast);
    if (typeof done === 'function') done();
  });
}

function applyOrRemoveFromState() {
  if (shouldApplyDark()) applyStylesheet();
  else removeStylesheet();
}

function startStyleProtectionObserver() {
  if (styleObserver) return;
  var target = document.head || document.documentElement;
  styleObserver = new MutationObserver(function () {
    if (!shouldApplyDark()) return;
    if (!document.getElementById(DARK_EVERYWHERE.STYLE_ID)) applyStylesheet();
  });
  styleObserver.observe(target, { childList: true, subtree: true });
}

function init() {
  syncStateFromStorage(function () {
    applyOrRemoveFromState();
    startStyleProtectionObserver();
  });
}

chrome.storage.onChanged.addListener(function (changes, area) {
  DARK_EVERYWHERE_STORAGE.filterChange(changes, area, function (relevant, kind) {
    if (!relevant) return;
    if (kind === 'meta') {
      syncStateFromStorage(applyOrRemoveFromState);
      return;
    }
    if (
      changes.enabled ||
      changes.brightness ||
      changes.contrast ||
      changes.excludedHosts ||
      changes.profile
    ) {
      syncStateFromStorage(applyOrRemoveFromState);
    }
  });
});

init();
