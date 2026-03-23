/**
 * Valores por defecto, límites y utilidades compartidas (content, background, popup, options).
 * Sin módulos ES para compatibilidad directa con MV3 y content scripts.
 */
var DARK_EVERYWHERE = {
  STYLE_ID: 'dark-everywhere-ext-style',

  DEFAULTS: {
    enabled: true,
    brightness: 0.97,
    contrast: 1.02,
    profile: 'balanced',
    excludedHosts: [],
  },

  /** Metadatos solo en chrome.storage.local (no se sincronizan entre dispositivos). */
  STORAGE_META_KEY: 'darkEverywhereMeta',

  /** Claves de datos de usuario (migrables entre sync ↔ local). */
  STORAGE_DATA_KEYS: ['enabled', 'brightness', 'contrast', 'profile', 'excludedHosts'],

  LIMITS: {
    brightnessMin: 0.7,
    brightnessMax: 1.0,
    contrastMin: 0.95,
    contrastMax: 1.15,
  },

  /** Perfiles: brillo/contraste predefinidos */
  PROFILES: {
    balanced: { label: 'Equilibrado', brightness: 0.97, contrast: 1.02 },
    night: { label: 'Lectura nocturna', brightness: 0.86, contrast: 1.06 },
    cinema: { label: 'Modo cine', brightness: 0.78, contrast: 1.12 },
  },

  /** Perfiles permitidos al persistir (OWASP: lista blanca). */
  ALLOWED_PROFILE_IDS: ['balanced', 'night', 'cinema', 'custom'],

  /** Líneas de exclusión: longitud máx. alineada con nombres de host (DNS). */
  MAX_HOST_LINE_LEN: 253,

  /** Máximo de patrones de exclusión persistidos (anti abuso / rendimiento). */
  MAX_EXCLUDED_HOSTS: 200,

  clampBrightness: function (v) {
    var n = Number(v);
    if (Number.isNaN(n)) return DARK_EVERYWHERE.DEFAULTS.brightness;
    var L = DARK_EVERYWHERE.LIMITS;
    return Math.min(Math.max(n, L.brightnessMin), L.brightnessMax);
  },

  clampContrast: function (v) {
    var n = Number(v);
    if (Number.isNaN(n)) return DARK_EVERYWHERE.DEFAULTS.contrast;
    var L = DARK_EVERYWHERE.LIMITS;
    return Math.min(Math.max(n, L.contrastMin), L.contrastMax);
  },

  parseExcludedHostsText: function (text) {
    return String(text || '')
      .split(/\r?\n/)
      .map(function (l) {
        return DARK_EVERYWHERE.sanitizeExcludedHostLine(l);
      })
      .filter(Boolean);
  },

  /**
   * Sanitiza una línea de dominio/patrón: sin espacios ni caracteres fuera de [a-z0-9.*-].
   * Reduce riesgo de inyección en comparaciones y almacenamiento (OWASP: validación de entradas).
   */
  sanitizeExcludedHostLine: function (line) {
    var s = String(line || '').trim();
    if (!s) return '';
    if (s.length > DARK_EVERYWHERE.MAX_HOST_LINE_LEN) {
      s = s.slice(0, DARK_EVERYWHERE.MAX_HOST_LINE_LEN);
    }
    if (s.indexOf('*.') === 0) {
      var rest = s
        .slice(2)
        .replace(/[^a-z0-9.-]/gi, '')
        .replace(/^\.+|\.+$/g, '');
      if (!rest) return '';
      return ('*.' + rest).toLowerCase();
    }
    var core = s.replace(/[^a-z0-9.-]/gi, '').replace(/^\.+|\.+$/g, '');
    if (!core) return '';
    return core.toLowerCase();
  },

  /**
   * Normaliza el objeto leído de storage: tipos seguros y valores acotados.
   */
  normalizeSettingsFromStorage: function (raw) {
    raw = raw || {};
    var D = DARK_EVERYWHERE.DEFAULTS;
    var out = {};
    var en = raw.enabled;
    if (typeof en === 'boolean') {
      out.enabled = en;
    } else if (typeof en === 'string') {
      out.enabled = en !== 'false' && en !== '0' && en !== '';
    } else if (en === 0 || en === null) {
      out.enabled = false;
    } else {
      out.enabled = D.enabled;
    }
    out.brightness = DARK_EVERYWHERE.clampBrightness(
      raw.brightness != null ? raw.brightness : D.brightness
    );
    out.contrast = DARK_EVERYWHERE.clampContrast(raw.contrast != null ? raw.contrast : D.contrast);
    var prof = String(raw.profile != null ? raw.profile : '').toLowerCase();
    out.profile =
      DARK_EVERYWHERE.ALLOWED_PROFILE_IDS.indexOf(prof) >= 0 ? prof : D.profile;
    var hosts = raw.excludedHosts;
    if (!Array.isArray(hosts)) hosts = [];
    out.excludedHosts = hosts
      .map(function (h) {
        return DARK_EVERYWHERE.sanitizeExcludedHostLine(h);
      })
      .filter(Boolean)
      .slice(0, DARK_EVERYWHERE.MAX_EXCLUDED_HOSTS);
    return out;
  },

  /**
   * Solo claves conocidas y valores validados antes de escribir en storage.
   */
  sanitizePatchForStorage: function (patch) {
    var out = {};
    if (!patch || typeof patch !== 'object') return out;
    var keys = DARK_EVERYWHERE.STORAGE_DATA_KEYS;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (!Object.prototype.hasOwnProperty.call(patch, k)) continue;
      var v = patch[k];
      if (k === 'enabled') {
        if (typeof v === 'boolean') out.enabled = v;
        else if (typeof v === 'string') out.enabled = v !== 'false' && v !== '0';
        else if (v === 0) out.enabled = false;
        else out.enabled = true;
      } else if (k === 'brightness') {
        out.brightness = DARK_EVERYWHERE.clampBrightness(v);
      } else if (k === 'contrast') {
        out.contrast = DARK_EVERYWHERE.clampContrast(v);
      } else if (k === 'profile') {
        var p = String(v != null ? v : '').toLowerCase();
        if (DARK_EVERYWHERE.ALLOWED_PROFILE_IDS.indexOf(p) >= 0) out.profile = p;
      } else if (k === 'excludedHosts') {
        var arr = Array.isArray(v) ? v : [];
        out.excludedHosts = arr
          .map(function (h) {
            return DARK_EVERYWHERE.sanitizeExcludedHostLine(h);
          })
          .filter(Boolean)
          .slice(0, DARK_EVERYWHERE.MAX_EXCLUDED_HOSTS);
      }
    }
    return out;
  },

  /**
   * Patrones por línea: dominio exacto (ej. github.com) o *.dominio.com
   */
  hostMatchesExcluded: function (host, patterns) {
    if (!patterns || !patterns.length) return false;
    var h = String(host).toLowerCase();
    for (var i = 0; i < patterns.length; i++) {
      var line = String(patterns[i]).trim().toLowerCase();
      if (!line) continue;
      if (line.indexOf('*.') === 0) {
        var suffix = line.slice(2);
        if (h === suffix || h.endsWith('.' + suffix)) return true;
      } else if (h === line || h.endsWith('.' + line)) {
        return true;
      }
    }
    return false;
  },
};
