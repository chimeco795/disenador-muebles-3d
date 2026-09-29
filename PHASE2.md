# Fase 2 — Snap y colocación inteligente

Esta fase amplía la Fase 1 aprobada. Conserva el store, historial, formato de proyecto, paneles y manipuladores existentes.

## Uso

- **Caras:** acerca piezas mediante las flechas o planos del manipulador. Azul identifica la cara móvil y verde la candidata. La atracción es suave al acercarse y el contacto es exacto dentro del umbral de captura.
- **Guías:** aparecen hasta tres referencias de centros, bordes, altura o profundidad. ✓ indica ajuste exacto; «cerca» indica proximidad. Se respeta el eje o plano del manipulador y ninguna guía rompe el contacto de caras elegido.
- **Ángulos:** los aros X/Y/Z atraen a 0°, 15°, 30°, 45°, 60°, 90° y sus simétricos (incluidos 75°, negativos y vueltas completas). Se muestran el ángulo actual, el recomendado y una guía de arco.
- **Libre:** sigue arrastrando para salir del ajuste, o mantén **Alt** para suspender las ayudas. Soltar Alt vuelve a evaluar la posición real del cursor, incluso sin moverlo. El aro exterior y la rotación libre siguen siendo libres.
- Al soltar o cancelar la selección desaparecen las ayudas. Cada gesto sigue siendo una sola operación de Undo/Redo. Únicamente su posición/rotación final se guarda automáticamente.

## Arquitectura añadida

- `src/snap/config.ts`: tolerancias, atracción y parámetros visuales centralizados.
- `src/snap/geometry.ts`: caras y ejes orientados, proximidad y solapamiento de rectángulos mediante ejes separadores.
- `src/snap/placement.ts`: cálculo de contacto y guías en mm, independiente de React y de la escena. Excluye destinos ocultos; permite destinos bloqueados.
- `src/snap/angular.ts`: atracción angular y corrección sobre el eje activo conservando la inclinación en otros ejes.
- `src/snap/useSnapGesture.ts`: adaptador al manipulador, posición cruda del cursor, Alt, cancelación y confirmación del gesto.
- `src/scene/SnapPreview.tsx`: caras transparentes, contornos, líneas y etiquetas. Nunca modifica el proyecto.

Los cálculos parten de la pose original del cursor en cada evento, no de la posición atraída anterior. Esto permite separar las piezas sin quedar pegadas. Las caras del resto del proyecto se preparan una vez al iniciar el gesto. No se cambió el esquema de localStorage ni se agregaron operaciones de cortes, perforaciones, uniones o mediciones.

## Tolerancias

| Ayuda | Detectar / atraer | Ajuste exacto |
| --- | --- | --- |
| Caras | 45 mm | 12 mm |
| Centros y bordes | 18 mm | 6 mm |
| Giro | 4° del ángulo recomendado | 2° |

La búsqueda de guías se limita a piezas a 180 mm o menos por separación de sus cajas. La intensidad está en `magneticStrength` (0.7). Todos estos valores están en `SNAP`, en `src/snap/config.ts`.

## Pruebas

`npm test`: incluye contacto/separación, penetración superficial, espesores de 18 mm, caras rotadas, restricciones de ejes, rechazo de caras incompatibles, destinos ocultos/bloqueados, centros/bordes/altura/profundidad y captura/liberación angular con negativos y rotaciones compuestas.

`npm run test:e2e`: usa Edge y conserva las pruebas de Fase 1. Añade dos piezas desde el catálogo, arrastre hasta contacto, alejamiento y nueva aproximación dentro del mismo gesto, Alt, guías de centro/borde, paso por 45° y 90° y continuación libre, cancelación, Undo/Redo y recarga. Comprueba que el movimiento de la pieza no mueva la cámara.

`npm run build`: TypeScript estricto y compilación de producción.

## Límites conocidos

- Se prioriza **un par de caras a la vez**. No resuelve múltiples contactos simultáneos ni evita colisiones: puede haber intersecciones con otras piezas.
- Las caras deben ser paralelas y opuestas (tolerancia 0.05°) y sus superficies solaparse. No se gira una pieza automáticamente para hacerlas paralelas; primero oriéntala con los aros.
- Las guías de bordes se ofrecen cuando el eje correspondiente coincide con un eje real de ambas piezas, incluidos giros de 90°. Los centros usan X/Y/Z globales. No se inventan bordes a partir de una caja oblicua.
- En rotaciones compuestas, la ayuda mide el giro alrededor del eje mundial activo (descomposición swing/twist), que puede diferir del ángulo Euler del panel. Los aros libre/exterior no tienen snap.
- El snap actúa al **mover o rotar una pieza seleccionada**. El arrastre desde el catálogo conserva la colocación de Fase 1 sobre el plano; después puedes acercar la pieza con las flechas.
- Las tolerancias en mm no se adaptan al zoom. No se ha probado una carga de cientos de piezas.
- Persisten las limitaciones de Fase 1: un proyecto por navegador/origen, sin exportación ni sincronización; historial y paneles de sesión.

Fase 2 disponible para evaluación del usuario. No continuar a cortes ni a Fase 3 sin aprobación.
