# Taller · Diseñador visual de muebles

Editor funcional de **Fases 1–8 · v1.0**, construido con React, TypeScript, Three.js, React Three Fiber, Drei, Zustand y Vite. La Fase 6 añade una propuesta de optimización 1D/2D, reutilización de sobrantes y lista de material, separada del plan actual y del modelo 3D. Conserva el historial y amplía de forma compatible los datos guardados.

Consulta [PHASE8.md](PHASE8.md) para UX v1.0, plantillas, selección múltiple y archivos .crj. [PHASE7.md](PHASE7.md) para acabados, uniones, catálogo, repetición y reporte PDF/impresión. [PHASE6.md](PHASE6.md) para optimización, persistencia y límites. [PHASE5.md](PHASE5.md) para Fabricación, orientación de cortes y kerf. [PHASE4.md](PHASE4.md) para materiales, migración y sobrantes. [PHASE3.md](PHASE3.md) para agarre, corte visual, trazabilidad y límites actuales. [PHASE2.md](PHASE2.md) documenta el snap de la fase anterior.

## Ejecutar

Requiere Node.js **22.12 o superior** y un navegador de escritorio con WebGL. Recomendado: Node.js 24 LTS y Edge o Chrome.

```sh
npm install
npm run dev
```

Abre la dirección que muestra Vite (normalmente http://127.0.0.1:5173).
En PowerShell, si la política de scripts bloquea `npm.ps1`, usa `npm.cmd install` y `npm.cmd run dev`.

```sh
npm run build       # TypeScript estricto + compilación de producción
npm test            # Pruebas del modelo e historial
npm run test:e2e    # Pruebas reales de navegador; requiere Microsoft Edge instalado
```

Las pruebas E2E inician Vite si no está activo. Usan un perfil de navegador aislado; no cambian el proyecto personal guardado.

## Primer recorrido

1. Arrastra una tarjeta desde **Materiales** al plano. También puedes hacer clic para agregarla en el origen.
2. En Mover puedes arrastrar la pieza directamente desde un extremo. También puedes arrastrar las flechas: X = largo, Y = altura y Z = ancho. Usa los pequeños planos entre flechas para mover en dos ejes.
3. Pulsa **Rotar** y arrastra un aro; verás los ángulos en grados junto a la pieza.
4. Duplica y coloca la copia. En **Ajuste preciso** puedes introducir posiciones del centro en mm y ángulos opcionalmente.
5. Usa las filas de **En tu proyecto** para seleccionar piezas ocultas y volver a mostrarlas.
6. Arrastra el fondo para orbitar, usa la rueda para zoom y el botón derecho para desplazar la cámara.
7. Prueba las seis vistas y **Encuadrar** para centrar todas las piezas visibles.

## Funciones operativas

- Catálogo por categorías con búsqueda, cinco destacados y materiales personalizados con medidas persistentes.
- Drag & drop con colocación sobre el plano y selección automática. Un arrastre cancelado no agrega piezas.
- Selección por clic en escena o inventario; clic en fondo para deseleccionar.
- Traslación X/Y/Z y rotación mediante manipuladores unidos a la pieza real; ángulo visible durante el giro.
- Corte visual recto con dos piezas reutilizables, colores pastel y trazabilidad de cortes sucesivos.
- Duplicar con ID independiente, eliminar, bloquear/desbloquear, ocultar/mostrar.
- Historial de hasta 100 operaciones, con una entrada por gesto completo. Incluye alta, movimiento, giro, duplicación, eliminación, bloqueo, visibilidad, proyecto nuevo y cortes.
- Vistas frontal, posterior, izquierda, derecha, superior e isométrica con transición; órbita libre después.
- Cuadrícula de 100 mm, referencias cada 1000 mm en el plano X/Z, ejes, sombras y dimensiones de la selección.
- Materiales, Propiedades y Materiales del proyecto se cierran, restauran, redimensionan y acoplan a izquierda, derecha o abajo. Arrastra la cabecera a una zona de acoplamiento o elige su destino en el selector. El modo Flotante permite mover el panel por su cabecera.
- Configuración para cuadrícula/referencias, sombras, cotas y paneles; restablecer distribución.
- Guardado automático y manual en localStorage. Recargar conserva todas las piezas, transformaciones y estados.
- **Nuevo** vacía el proyecto y puede deshacerse durante la sesión.

Atajos: **G** mover, **R** rotar, **Supr** eliminar, **Esc** deseleccionar, **Ctrl+D** duplicar, **Ctrl+Z** deshacer, **Ctrl+Shift+Z / Ctrl+Y** rehacer, **Ctrl+S** guardar. En macOS se admite Cmd para las combinaciones.

## Arquitectura

- `src/model.ts`: interfaces Piece/Material/Project, catálogo y conversión consistente. Dimensiones y posiciones en mm; rotación en grados. Una unidad de escena equivale a 1000 mm. La geometría usa [largo, alto, ancho].
- `src/store.ts`: estado Zustand, selección, comandos, historial de instantáneas inmutables y persistencia versionada con validación. Las mutaciones pasan por `commit` o el comando de proyecto `cut`; los gestos 3D guardan al soltar.
- `src/scene/Part.tsx`: geometría, selección y manipuladores; el bloqueo evita transformar la pieza tanto en UI como en el store.
- `src/scene/CameraRig.tsx`: vistas, encuadre de geometrías rotadas y controles orbitales.
- `src/scene/DropBridge.tsx`: conversión de coordenadas de pantalla al plano mediante raycasting.
- `src/scene/SceneLabel.tsx`: etiquetas DOM proyectadas desde coordenadas 3D, sin raíces React anidadas.
- `src/scene/Scene.tsx`: composición de escena, iluminación y referencias.
- `src/ui/Panel.tsx`: panel reutilizable, acoplamiento, movimiento y redimensionamiento.
- `src/ui/Contents.tsx`: catálogo, propiedades e inventario.
- `src/App.tsx`: composición del editor y comandos de interfaz.

`catalogMaterialId` enlaza al catálogo. `sourceMaterialId` enlaza al material original (TABLA/HOJA). `stockId`, `parentPieceId` y `producedByCutId` conservan la procedencia real. El proyecto guarda registros de stock y snapshots de cada padre cortado; véase [PHASE3.md](PHASE3.md).

## Validación y límites

Se comprobó el flujo en Edge mediante Playwright, incluyendo arrastre real de flechas y aros, diferencias visuales al orbitar/zoom/desplazar sin modificar objetos, selección, seis vistas, bloqueo, duplicación, ocultación, eliminación, undo/redo, persistencia al recargar, cancelación de drag, movimiento/redimensionamiento/acoplamiento de paneles y configuración. Las pruebas fallan ante errores de consola del navegador. Vitest comprueba escala, independencia de duplicados, historial, bloqueo, validación de datos y fallos de almacenamiento.

- No hay detección de colisiones, cortes curvos, uniones ni nesting irregular. Fabricación conserva el plan actual y ofrece una propuesta separada de optimización rectangular. Las piezas pueden atravesarse o quedar bajo el plano; la colocación se realiza manualmente con las ayudas de snap y agarre.
- Las medidas del catálogo son fijas. Cortar divide realmente una pieza y conserva ambas partes.
- En vistas donde el rayo es paralelo al plano, soltar material usa el origen. Usa la vista superior/isométrica para colocar sobre el plano con precisión.
- Se guarda **un proyecto por navegador y origen web**; aún no hay archivos de proyecto, importación/exportación, nube ni sincronización entre pestañas. Usa siempre la misma dirección y puerto para recuperar el proyecto. Borrar los datos del navegador elimina ese guardado.
- Historial, distribución de paneles y preferencias visuales son de sesión y no se conservan tras recargar.
- Orientado a escritorio (recomendado 1280 px o más). Los paneles flotantes se redimensionan en ancho; su altura se adapta al límite de la ventana.
- La compilación avisa del tamaño del paquete 3D (~342 kB gzip); no impide su ejecución. No se realizó una prueba de carga con cientos de piezas.

Fase 6 disponible para evaluación del usuario. No continuar a fases posteriores sin aprobación.

