# Fase 3 — Agarre y corte visual

Implementada sobre las Fases 1 y 2 aprobadas. Se conservan los manipuladores, paneles, catálogo, historial y persistencia. No se implementaron optimización ni fabricación.

## Agarrar desde un extremo

1. En **Mover** (G), pulsa directamente la superficie de la pieza cerca del extremo que quieres conectar.
2. Arrastra desde ese punto. La cámara queda suspendida durante el gesto; arrastrar el fondo sigue orbitando.
3. Al acercarte, se resaltan la cara móvil y la candidata, con un punto y guía de contacto.
4. Suelta para colocarla. Mantén Alt para omitir el snap, o sigue alejándote para salir de la atracción.

Se guarda el punto de agarre en coordenadas locales de la pieza. Se transforma con ella y participa en la prioridad junto con la distancia y la dirección del movimiento. Esto diferencia ambos extremos aunque el centro quede lejos. Además de las caras se consideran sus centros, esquinas y puntos medios de bordes próximos al agarre.

Las flechas y planos existentes siguen funcionando, con la detección anterior cuando no hay punto de agarre directo. Se conservan todas las guías y el snap angular.

El arrastre directo mantiene el plano paralelo a la pantalla que pasa por el punto inicial de agarre. Para cambiar la profundidad respecto de la cámara usa las flechas X/Y/Z o cambia de vista. En modo Rotar (R) se usan los aros; vuelve a Mover para tomar una pieza desde su superficie.

## Cortar

1. Selecciona una pieza visible y desbloqueada y pulsa **Cortar**.
2. Aparece una línea azul con un tirador. Deslízala y observa las dos medidas en vivo.
3. Cerca de múltiplos de 100 mm hay ajuste magnético de 3 mm. Alt lo suspende. El arrastre visual trabaja a pasos de 1 mm.
4. Usa ← / → para pasos de 1 mm, o Mayús para pasos de 10 mm.
5. Opcionalmente, haz clic en cualquiera de las medidas mostradas para escribir el valor exacto de la primera parte, incluidos decimales. Enter aplica ese valor; después confirma con el botón o Enter fuera del campo.
6. **Confirmar corte** crea dos piezas independientes. **Cancelar** o Esc abandona la vista previa sin alterar el proyecto.

Ambas piezas son utilizables: ninguna se marca como desperdicio. Conservan la posición y rotación del volumen original, pero tienen identificadores independientes. Se selecciona la primera; la segunda está disponible en el inventario o por clic. Puedes moverlas, girarlas, hacer snap y volver a cortarlas.

Cada corte es una sola acción de Undo/Redo. Deshacer restaura exactamente la pieza original y sus datos. Rehacer restaura las mismas piezas hijas e identificadores.

## Trazabilidad y persistencia

Se mantiene el formato de proyecto v1 y la clave existente de localStorage, con campos opcionales compatibles con proyectos de Fases 1/2:

- `sourceMaterialId`: material del catálogo.
- `stockId`: identidad de la tabla/hoja de origen, compartida por sus descendientes.
- `parentPieceId` y `producedByCutId`: padre y operación que produjo la pieza.
- `originalColor`: color base antes del corte.
- `project.stocks`: dimensiones, color, material y pieza raíz del stock original.
- `project.cuts`: instantánea completa del padre, identificadores de ambos hijos, eje, posición de corte y kerf.

El primer corte registra el stock de origen; cada recorte añade una operación conservando los ancestros. Los datos permanecen aunque el padre ya no se dibuje o se elimine una pieza hija. No se muestra el árbol completo en esta fase.

El pastel se deriva siempre del color del stock, por lo que cortar nuevamente no aclara el color una y otra vez. Duplicar una pieza crea una copia virtual independiente: conserva `duplicateOf`, pero no comparte el consumo físico del stock. Su primer corte registra un stock propio con las dimensiones de esa copia.

## Arquitectura añadida

- `src/snap/intent.ts`: agarre local/mundial, prioridad de caras y puntos de bordes/centros.
- `src/snap/useDirectDrag.ts`: arrastre directo, plano de interacción, separación entre cámara y objeto y cancelación.
- `src/snap/placement.ts`: se amplía con intención opcional; el comportamiento previo permanece cuando no hay agarre.
- `src/cutting/split.ts`: división geométrica, posicionamiento local/mundial, colores y árbol de procedencia, sin componentes de interfaz.
- `src/cutting/store.ts`: vista previa transitoria y acciones confirmar/cancelar. No añade historial mientras se mueve la línea.
- `src/cutting/config.ts`: pasos, atracción a medidas redondas, mínimo de pieza y kerf.
- `src/scene/CutPreview.tsx`: línea, tirador y medidas proyectadas.
- `src/ui/CutBar.tsx`: confirmación, cancelación, atajos y entrada opcional exacta.
- `src/validation.ts`: valida tanto los proyectos anteriores como los nuevos datos de trazabilidad.

El comando `cut` de `src/store.ts` integra el proyecto resultante completo en el historial existente. Guardado y restauración usan el mecanismo previo.

## Pruebas

```sh
npm test
npm run test:e2e
npm run build
```

Las pruebas de navegador usan Edge y un perfil aislado, sin modificar el proyecto guardado del usuario. Cubren las regresiones de Fases 1/2 y los nuevos flujos: agarre de ambos extremos, corte visual, medidas en vivo, pequeños incrementos, medida exacta, confirmación/cancelación, dos piezas independientes, snap de una pieza cortada, recorte de una pieza girada, trazabilidad, Undo/Redo y recarga. Las pruebas unitarias comprueban además conservación de longitud, transformaciones compuestas, prioridad entre caras competidoras, validación de datos y kerf preparado.

## Límites

- Corte recto transversal a lo largo del eje local de longitud. También funciona para MDF/triplay, conservando ancho y espesor. El modelo contempla el eje de ancho, pero la interfaz todavía no permite elegirlo.
- Mínimo de 1 mm por pieza resultante. El kerf efectivo es 0 mm; queda registrado y la función geométrica admite un valor no nulo para una configuración posterior.
- Si miras exactamente en dirección longitudinal, cambia a una vista lateral/isométrica para deslizar la línea. No hay una dimensión de longitud visible desde esa dirección.
- El snap sigue resolviendo un par de caras a la vez; requiere orientación compatible y no evita colisiones. No hay uniones físicas permanentes.
- Las tolerancias de agarre/snap son fijas en mm, configurables en código. No se probó rendimiento con cientos de piezas o miles de cortes.
- Guardado local de un proyecto por navegador/origen, sin importación/exportación ni sincronización. El historial de Undo/Redo sigue siendo de sesión; las piezas y su procedencia sí sobreviven a una recarga.

No se incluyen optimización, hoja de cortes, lista de compra, curvas, perforaciones, uniones, CNC ni fases posteriores. Fase 3 pendiente de evaluación personal del usuario.
