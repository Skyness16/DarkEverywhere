/* global DARK_EVERYWHERE, DARK_EVERYWHERE_STORAGE */

var excludedEl = document.getElementById('excluded');
var saveBtn = document.getElementById('save');
var statusEl = document.getElementById('status');
var storageLocalCheckbox = document.getElementById('storageLocalOnly');
var storageHint = document.getElementById('storageHint');

function sanitizeExcludedLines(text) {
  var lines = DARK_EVERYWHERE.parseExcludedHostsText(text);
  if (lines.length > DARK_EVERYWHERE.MAX_EXCLUDED_HOSTS) {
    lines = lines.slice(0, DARK_EVERYWHERE.MAX_EXCLUDED_HOSTS);
  }
  return lines;
}

function showStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.className = 'status' + (isError ? ' error' : '');
}

function refreshStorageUi() {
  DARK_EVERYWHERE_STORAGE.isLocalOnly(function (local) {
    storageLocalCheckbox.checked = local;
    storageHint.textContent = local
      ? 'Los ajustes solo se guardan en este dispositivo (chrome.storage.local).'
      : 'Los ajustes se sincronizan con tu cuenta de Chrome cuando la sync está activada (chrome.storage.sync).';
  });
}

function load() {
  DARK_EVERYWHERE_STORAGE.get(DARK_EVERYWHERE.DEFAULTS, function (d) {
    var list = d.excludedHosts || [];
    excludedEl.value = Array.isArray(list) ? list.join('\n') : '';
  });
  refreshStorageUi();
}

saveBtn.addEventListener('click', function () {
  var sanitized = sanitizeExcludedLines(excludedEl.value);
  DARK_EVERYWHERE_STORAGE.set({ excludedHosts: sanitized }, function () {
    if (chrome.runtime.lastError) {
      showStatus('No se pudo guardar.', true);
      return;
    }
    excludedEl.value = sanitized.join('\n');
    showStatus('Guardado.', false);
    window.setTimeout(function () {
      statusEl.textContent = '';
    }, 2500);
  });
});

storageLocalCheckbox.addEventListener('change', function () {
  var wantLocal = storageLocalCheckbox.checked;
  storageLocalCheckbox.disabled = true;
  showStatus(wantLocal ? 'Migrando a almacenamiento local…' : 'Migrando a sincronización…', false);

  function finish(err) {
    storageLocalCheckbox.disabled = false;
    if (err) {
      showStatus(err, true);
      refreshStorageUi();
      return;
    }
    showStatus(wantLocal ? 'Modo solo local activo.' : 'Sincronización con la cuenta activada.', false);
    refreshStorageUi();
    window.setTimeout(function () {
      statusEl.textContent = '';
    }, 3500);
  }

  if (wantLocal) {
    DARK_EVERYWHERE_STORAGE.migrateToLocalOnly(finish);
  } else {
    DARK_EVERYWHERE_STORAGE.migrateToSync(finish);
  }
});

document.getElementById('openShortcuts').addEventListener('click', function () {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }, function () {
    void chrome.runtime.lastError;
  });
});

chrome.storage.onChanged.addListener(function (changes, area) {
  var mk = DARK_EVERYWHERE.STORAGE_META_KEY;
  if (area === 'local' && changes[mk]) {
    refreshStorageUi();
  }
});

load();
