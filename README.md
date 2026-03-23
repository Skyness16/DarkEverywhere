# Dark Everywhere

Extension para Chrome/Edge que aplica modo oscuro a sitios web mediante inversion inteligente, con perfiles de brillo, contraste y exclusiones por dominio.

## Estructura

```text
assets/   Recursos visuales
docs/     Documentacion de apoyo
pages/    Vistas HTML de la extension
scripts/  Logica JavaScript separada por contexto
styles/   Hojas de estilo
```

## Carpetas principales

- `assets/`: iconos e imagenes usadas por la extension.
- `docs/`: archivos de auditoria o documentacion tecnica.
- `pages/`: `popup.html` y `options.html`.
- `scripts/background/`: service worker.
- `scripts/content/`: content script inyectado en paginas.
- `scripts/options/`: logica de la pagina de opciones.
- `scripts/popup/`: logica del popup.
- `scripts/shared/`: constantes y utilidades compartidas.
- `styles/`: estilos del popup y de opciones.

## Desarrollo

1. Abre `chrome://extensions/`.
2. Activa el modo desarrollador.
3. Carga esta carpeta con "Load unpacked" / "Cargar descomprimida".

El archivo `manifest.json` ya apunta a la nueva estructura de carpetas.
