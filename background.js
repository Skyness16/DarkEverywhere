/**
 * Service worker: atajos, estado visual de la acción, instalación.
 * Estado de datos vía DARK_EVERYWHERE_STORAGE (sync o local según meta).
 */
importScripts('constants.js');
importScripts('storage-adapter.js');

function updateActionAppearance() {
  DARK_EVERYWHERE_STORAGE.get(DARK_EVERYWHERE.DEFAULTS, function (d) {
    var on = d.enabled !== false;
    chrome.action.setTitle({
      title: on ? 'Dark Everywhere · activo' : 'Dark Everywhere · inactivo',
    });
    chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
    chrome.action.setBadgeText({ text: on ? 'ON' : '' });
  });
}

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install') {
    chrome.storage.sync.set(DARK_EVERYWHERE.DEFAULTS);
    var metaKey = DARK_EVERYWHERE.STORAGE_META_KEY;
    var meta = {};
    meta[metaKey] = { storageBackend: 'sync' };
    chrome.storage.local.set(meta);
  } else if (details.reason === 'update') {
    chrome.storage.local.get(DARK_EVERYWHERE.STORAGE_META_KEY, function (r) {
      if (!r[DARK_EVERYWHERE.STORAGE_META_KEY]) {
        var m = {};
        m[DARK_EVERYWHERE.STORAGE_META_KEY] = { storageBackend: 'sync' };
        chrome.storage.local.set(m);
      }
    });
  }
  updateActionAppearance();
});

chrome.runtime.onStartup.addListener(updateActionAppearance);

chrome.storage.onChanged.addListener(function (changes, area) {
  DARK_EVERYWHERE_STORAGE.filterChange(changes, area, function (relevant, kind) {
    if (!relevant) return;
    if (kind === 'meta') {
      updateActionAppearance();
      return;
    }
    if (changes.enabled) updateActionAppearance();
  });
});

chrome.commands.onCommand.addListener(function (command) {
  if (command !== 'toggle-dark-mode') return;
  DARK_EVERYWHERE_STORAGE.get({ enabled: true }, function (d) {
    var next = d.enabled === false;
    DARK_EVERYWHERE_STORAGE.set({ enabled: next });
  });
});

updateActionAppearance();
