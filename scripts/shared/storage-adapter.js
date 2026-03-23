/**
 * Capa de almacenamiento: datos en sync O local según darkEverywhereMeta.storageBackend.
 * La meta vive siempre en chrome.storage.local.
 */
/* global DARK_EVERYWHERE */

var DARK_EVERYWHERE_STORAGE = {
  getMeta: function (cb) {
    var key = DARK_EVERYWHERE.STORAGE_META_KEY;
    var req = {};
    req[key] = { storageBackend: 'sync' };
    chrome.storage.local.get(req, function (r) {
      var m = r[key];
      if (!m || typeof m !== 'object') m = { storageBackend: 'sync' };
      if (m.storageBackend !== 'local' && m.storageBackend !== 'sync') {
        m.storageBackend = 'sync';
      }
      cb(m);
    });
  },

  getArea: function (cb) {
    this.getMeta(function (meta) {
      cb(meta.storageBackend === 'local' ? chrome.storage.local : chrome.storage.sync);
    });
  },

  get: function (defaults, cb) {
    this.getArea(function (area) {
      area.get(defaults, function (raw) {
        if (chrome.runtime.lastError) {
          cb(DARK_EVERYWHERE.normalizeSettingsFromStorage(defaults));
          return;
        }
        cb(DARK_EVERYWHERE.normalizeSettingsFromStorage(raw));
      });
    });
  },

  set: function (data, cb) {
    var patch = DARK_EVERYWHERE.sanitizePatchForStorage(data);
    if (Object.keys(patch).length === 0) {
      if (cb) cb();
      return;
    }
    this.getArea(function (area) {
      area.set(patch, cb || function () {});
    });
  },

  /**
   * Indica si un evento onChanged debe procesarse y si fue cambio de modo (meta).
   * kind: 'meta' | 'data'
   */
  filterChange: function (changes, area, cb) {
    var metaKey = DARK_EVERYWHERE.STORAGE_META_KEY;
    if (area === 'local' && changes[metaKey]) {
      cb(true, 'meta');
      return;
    }
    this.getMeta(function (meta) {
      var backend = meta.storageBackend === 'local' ? 'local' : 'sync';
      if (area === backend) {
        cb(true, 'data');
      } else {
        cb(false);
      }
    });
  },

  isLocalOnly: function (cb) {
    this.getMeta(function (m) {
      cb(m.storageBackend === 'local');
    });
  },

  migrateToLocalOnly: function (cb) {
    var keys = DARK_EVERYWHERE.STORAGE_DATA_KEYS;
    chrome.storage.sync.get(keys, function (syncData) {
      chrome.storage.local.get(keys, function (localData) {
        var merged = {};
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          if (syncData[key] !== undefined) merged[key] = syncData[key];
          else if (localData[key] !== undefined) merged[key] = localData[key];
          else merged[key] = DARK_EVERYWHERE.DEFAULTS[key];
        }
        var norm = DARK_EVERYWHERE.normalizeSettingsFromStorage(merged);
        var patch = {};
        for (var k = 0; k < keys.length; k++) {
          patch[keys[k]] = norm[keys[k]];
        }
        var metaKey = DARK_EVERYWHERE.STORAGE_META_KEY;
        patch[metaKey] = { storageBackend: 'local' };
        chrome.storage.local.set(patch, function () {
          if (chrome.runtime.lastError) {
            if (cb) cb(chrome.runtime.lastError.message);
            return;
          }
          chrome.storage.sync.remove(keys, function () {
            if (chrome.runtime.lastError) {
              if (cb) cb(chrome.runtime.lastError.message);
              return;
            }
            if (cb) cb(null);
          });
        });
      });
    });
  },

  migrateToSync: function (cb) {
    var keys = DARK_EVERYWHERE.STORAGE_DATA_KEYS;
    chrome.storage.local.get(keys, function (localData) {
      chrome.storage.sync.get(keys, function (syncData) {
        var merged = {};
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          if (localData[key] !== undefined) merged[key] = localData[key];
          else if (syncData[key] !== undefined) merged[key] = syncData[key];
          else merged[key] = DARK_EVERYWHERE.DEFAULTS[key];
        }
        var norm = DARK_EVERYWHERE.normalizeSettingsFromStorage(merged);
        var patch = {};
        for (var k = 0; k < keys.length; k++) {
          patch[keys[k]] = norm[keys[k]];
        }
        chrome.storage.sync.set(patch, function () {
          if (chrome.runtime.lastError) {
            if (cb) cb(chrome.runtime.lastError.message);
            return;
          }
          var metaKey = DARK_EVERYWHERE.STORAGE_META_KEY;
          var fix = {};
          fix[metaKey] = { storageBackend: 'sync' };
          chrome.storage.local.set(fix, function () {
            if (chrome.runtime.lastError) {
              if (cb) cb(chrome.runtime.lastError.message);
              return;
            }
            chrome.storage.local.remove(keys, function () {
              if (chrome.runtime.lastError) {
                if (cb) cb(chrome.runtime.lastError.message);
                return;
              }
              if (cb) cb(null);
            });
          });
        });
      });
    });
  },
};
