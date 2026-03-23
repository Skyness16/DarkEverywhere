/* global DARK_EVERYWHERE, DARK_EVERYWHERE_STORAGE */

var toggle = document.getElementById('toggle');
var brightnessEl = document.getElementById('brightness');
var contrastEl = document.getElementById('contrast');
var brightnessVal = document.getElementById('brightnessVal');
var contrastVal = document.getElementById('contrastVal');
var sliderWrap = document.getElementById('sliderWrap');
var sliderWrap2 = document.getElementById('sliderWrap2');
var profilesEl = document.getElementById('profiles');

function percentToBrightness(p) {
  return DARK_EVERYWHERE.clampBrightness(Number(p) / 100);
}

function contrastSliderToValue(p) {
  return DARK_EVERYWHERE.clampContrast(Number(p) / 100);
}

function brightnessToPercent(b) {
  return Math.round(DARK_EVERYWHERE.clampBrightness(b) * 100);
}

function contrastToSlider(c) {
  return Math.round(DARK_EVERYWHERE.clampContrast(c) * 100);
}

function updateSliderUi() {
  var on = toggle.checked;
  sliderWrap.classList.toggle('active', on);
  sliderWrap2.classList.toggle('active', on);
}

function setProfileButtonsActive(profileId) {
  var buttons = profilesEl.querySelectorAll('.profile-btn');
  for (var i = 0; i < buttons.length; i++) {
    var b = buttons[i];
    var id = b.getAttribute('data-profile');
    var on = profileId !== 'custom' && id === profileId;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
}

function loadUi(d) {
  toggle.checked = d.enabled !== false;
  var b = d.brightness != null ? d.brightness : DARK_EVERYWHERE.DEFAULTS.brightness;
  var c = d.contrast != null ? d.contrast : DARK_EVERYWHERE.DEFAULTS.contrast;
  brightnessEl.value = String(brightnessToPercent(b));
  contrastEl.value = String(contrastToSlider(c));
  brightnessVal.textContent = brightnessEl.value + '%';
  contrastVal.textContent = contrastEl.value + '%';
  setProfileButtonsActive(d.profile || 'balanced');
  updateSliderUi();
}

function buildProfileButtons() {
  var P = DARK_EVERYWHERE.PROFILES;
  profilesEl.innerHTML = '';
  for (var key in P) {
    if (!Object.prototype.hasOwnProperty.call(P, key)) continue;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'profile-btn';
    btn.setAttribute('data-profile', key);
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = P[key].label;
    btn.addEventListener('click', function () {
      var id = this.getAttribute('data-profile');
      var preset = DARK_EVERYWHERE.PROFILES[id];
      if (!preset) return;
      var br = DARK_EVERYWHERE.clampBrightness(preset.brightness);
      var ct = DARK_EVERYWHERE.clampContrast(preset.contrast);
      /**
       * Chrome suele no disparar storage.onChanged en el mismo documento que escribió (p. ej. popup).
       * Refrescamos la UI en el callback del set para que sliders y estado de botones coincidan.
       */
      DARK_EVERYWHERE_STORAGE.set(
        {
          profile: id,
          brightness: br,
          contrast: ct,
        },
        function () {
          DARK_EVERYWHERE_STORAGE.get(DARK_EVERYWHERE.DEFAULTS, loadUi);
        }
      );
    });
    profilesEl.appendChild(btn);
  }
}

chrome.storage.onChanged.addListener(function (changes, area) {
  DARK_EVERYWHERE_STORAGE.filterChange(changes, area, function (relevant, kind) {
    if (!relevant) return;
    if (kind === 'meta') {
      DARK_EVERYWHERE_STORAGE.get(DARK_EVERYWHERE.DEFAULTS, loadUi);
      return;
    }
    if (changes.enabled || changes.brightness || changes.contrast || changes.profile) {
      DARK_EVERYWHERE_STORAGE.get(DARK_EVERYWHERE.DEFAULTS, loadUi);
    }
  });
});

toggle.addEventListener('change', function () {
  var enabled = toggle.checked;
  DARK_EVERYWHERE_STORAGE.set({ enabled: enabled });
  updateSliderUi();
});

var debounceTimer;
function debouncedSaveSliders() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(function () {
    var brightness = percentToBrightness(brightnessEl.value);
    var contrast = contrastSliderToValue(contrastEl.value);
    brightnessVal.textContent = brightnessEl.value + '%';
    contrastVal.textContent = contrastEl.value + '%';
    DARK_EVERYWHERE_STORAGE.set(
      {
        brightness: brightness,
        contrast: contrast,
        profile: 'custom',
      },
      function () {
        DARK_EVERYWHERE_STORAGE.get(DARK_EVERYWHERE.DEFAULTS, loadUi);
      }
    );
  }, 120);
}

brightnessEl.addEventListener('input', debouncedSaveSliders);
contrastEl.addEventListener('input', debouncedSaveSliders);

document.getElementById('openOptions').addEventListener('click', function (e) {
  e.preventDefault();
  if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
});

document.getElementById('openShortcuts').addEventListener('click', function (e) {
  e.preventDefault();
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }, function () {
    void chrome.runtime.lastError;
  });
});

function applyShortcutHint() {
  var el = document.getElementById('shortcutHint');
  if (!el) return;
  try {
    if (
      typeof chrome !== 'undefined' &&
      chrome.commands &&
      typeof chrome.commands.getAll === 'function'
    ) {
      chrome.commands.getAll(function (cmds) {
        if (chrome.runtime.lastError) return;
        var list = cmds || [];
        var cmd = list.filter(function (c) {
          return c.name === 'toggle-dark-mode';
        })[0];
        if (cmd && cmd.shortcut) el.textContent = cmd.shortcut;
      });
    }
  } catch (e) {
    void e;
  }
}
applyShortcutHint();

buildProfileButtons();
DARK_EVERYWHERE_STORAGE.get(DARK_EVERYWHERE.DEFAULTS, loadUi);
