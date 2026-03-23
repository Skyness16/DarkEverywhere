# Dark Everywhere — notas para auditoría (seguridad y datos)

Documento orientado a equipos de seguridad, cumplimiento o TI. Versión del manifiesto: **1.6.1**.

## Marco de prácticas aplicadas (referencia)

| Referencia | Aplicación en el código |
|------------|-------------------------|
| **OWASP Secure Coding** | Validación de entradas y lista blanca: `sanitizeExcludedHostLine`, `sanitizePatchForStorage`, `normalizeSettingsFromStorage`, límites numéricos (`clampBrightness` / `clampContrast`), tope de patrones (`MAX_EXCLUDED_HOSTS`). Sin `eval`, sin concatenación de datos de usuario en código dinámico. |
| **Políticas Chrome Web Store / MV3** | Manifiesto en Manifest V3, `service_worker`, sin `background.persistent`, sin código remoto (todo el JS del paquete). La CSP la aplica el propio Chrome (mínimo MV3); no se sobrescribe en el manifiesto para evitar romper popup/opciones. `minimum_chrome_version` declarado. |
| **Mozilla Add-ons (orientación)** | Permisos mínimos en el array `permissions` (`storage`); alcance de content scripts documentado por `matches` (no es un permiso adicional con ese nombre). |
| **Menor privilegio (NIST)** | Solo `storage` en `permissions`; sin `host_permissions` ni red para la lógica de la extensión. La opción “solo almacenamiento local” reduce datos en sync de Chrome. |

## Alcance de la extensión

- **Propósito:** aplicar un filtro CSS de “modo oscuro” (inversión de color) en páginas web mediante un content script.
- **Código:** JavaScript y CSS inyectados; **sin** backend propio, **sin** analítica y **sin** llamadas de red añadidas por la extensión (no hay `fetch`, `XMLHttpRequest`, WebSockets ni URLs remotas en el código de la extensión).

## Permisos declarados (`manifest.json`)

| Permiso   | Uso |
|-----------|-----|
| `storage` | Guardar preferencias del usuario (`chrome.storage.sync` y/o `chrome.storage.local`). |

Los **content scripts** se declaran con `matches: ["<all_urls>"]` para ejecutarse en páginas web; eso define **dónde** corre el script, no es un permiso adicional con ese nombre en el array `permissions`.

## Qué datos se guardan

Solo configuración local de la extensión, con claves definidas en `constants.js` (`STORAGE_DATA_KEYS`):

- `enabled` (booleano): modo oscuro activo o no.
- `brightness` / `contrast` (números acotados): ajustes del filtro.
- `profile` (cadena): perfil seleccionado (p. ej. equilibrado, noche, cine, custom).
- `excludedHosts` (lista de cadenas): dominios/patrones donde no aplicar el modo.

**Metadato de almacenamiento** (solo en `chrome.storage.local`):

- `darkEverywhereMeta.storageBackend`: `"sync"` o `"local"` — indica si los datos de usuario anteriores viven en **sync** o **local**.

No se almacenan contraseñas, contenido de páginas, historial ni identificadores de seguimiento generados por la extensión.

## Dónde viven los datos (modo sync vs solo local)

| Modo | API | Comportamiento típico |
|------|-----|-------------------------|
| **Sincronizado (predeterminado)** | `chrome.storage.sync` | Chrome puede sincronizar estos valores con la cuenta del usuario si la sincronización de extensiones está activada en el navegador. |
| **Solo local (opción en Opciones)** | `chrome.storage.local` | Los datos permanecen en el dispositivo; no se usan para la sync entre dispositivos vía la cuenta de Chrome. |

La preferencia de modo se elige en la página **Opciones** (“Solo almacenamiento local”). Al cambiar de modo, la extensión **migra** las claves de datos entre áreas (con merge razonable si falta un valor en un lado).

## Qué “toca” en las páginas web

- El **content script** inserta un elemento `<style>` y puede ajustar variables CSS en el elemento raíz del documento para el filtro.
- **No** envía el HTML, URL ni capturas a ningún servidor: no hay código de red en la extensión.
- El script corre en el contexto de la página con el alcance habitual de los content scripts de Chrome (lectura/modificación del DOM y estilos según lo implementado).

## Cumplimiento y despliegue empresarial

- Para políticas estrictas, suele usarse **lista blanca** de extensiones, **empaquetado interno** y **revisión de código**.
- Quienes **no** deseen datos de configuración asociados a la sync de Chrome pueden activar **solo almacenamiento local** en Opciones.
- Los administradores pueden gestionar extensiones con las políticas de Chrome/Edge (p. ej. instalación forzada, bloqueo de tienda).

## Limitación de responsabilidad

Este documento describe el comportamiento **previsto** del código en el repositorio. La revisión final de riesgos en tu organización corresponde a seguridad/TI y a las políticas internas.
