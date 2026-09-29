# Fase 8 — UX v1.0

## Completado sobre la arquitectura existente

- Reporte: X superior derecha y Esc; conserva la vista, plan y desplazamiento de Fabricación.
- Snap: contacto de planos mediante una sola coordenada libre cuando basta; mantiene las posiciones tangenciales. El agarre influye para desempatar, sin saltos adicionales por esquina. Libre / Centro / Borde inicial / Borde final, con teclas 1–4 durante el arrastre. Elegir una alineación después del contacto la aplica en el plano de las caras con una entrada de historial. Alt libera el snap.
- Unir: clic en cara origen y destino, o arrastre entre caras; caras resaltadas y propiedades de unión existentes. Los contactos ofrecen + Crear unión. Marcas verdes/ocre indican uniones o revisión. La sugerencia da prioridad al contacto real sobre la cercanía de los centros.
- Perforar: clic y arrastre sobre la cara; círculo con diámetro, posición y profundidad. Presets Ø5, Ø8, Ø10, Ø35; datos exactos en un desplegable. El borrador conserva una superficie seleccionable hasta confirmar.
- Nueve plantillas del catálogo con ancho, alto, fondo y material. Producen piezas normales, cortes y sobrantes trazables. Transacción única deshacible; rechazo de tamaños incompatibles sin modificar el proyecto. La estantería gira las bases cuando corresponde para que entren en la hoja.
- Nuevo / Abrir / Exportar .crj: archivo versionado con proyecto completo, validado antes de reemplazar el actual. Guarda también preferencias de escena y alineación. El guardado local sigue funcionando y abrir puede deshacerse.
- Shift+clic (escena e inventario), traslado conjunto y agrupación temporal. Flechas: X/Z, 1 mm; Shift: 10 mm; PageUp/PageDown o Alt+arriba/abajo: Y. Arrastre conjunto con una sola entrada de historial y sin desplazamiento residual tras soltar o cancelar. Miembros bloqueados impiden el movimiento conjunto.
- Doble clic enfoca, Ajustar todo encuadra las piezas visibles, menú contextual ofrece acciones frecuentes. Las vistas rápidas terminan en su orientación exacta.
- Medir: dos puntos de las superficies y distancia en mm, temporal; Esc termina.
- Cotas alrededor de la selección: largo, ancho y espesor; se ocultan desde Propiedades o Configuración.

## Límites

- Grupos temporales: no se guardan como objetos del proyecto; giro y operaciones de carpintería actúan sobre la pieza principal. El movimiento y la eliminación incluyen la selección.
- Las plantillas son bases de diseño, no ensambles calculados: cajonera de tres cajones, escalera de cuatro peldaños, sin herrajes ni cálculo estructural. Los sobrantes quedan ocultos inicialmente y se pueden recuperar desde el inventario. Optimizar material propone después el aprovechamiento.
- La selección visual de caras y el snap usan las caras de la base rectangular; los contornos especiales conservan los límites de Fase 7. Medir devuelve distancia entre los puntos elegidos sobre las superficies, no separación mínima automática entre sólidos.
- Abrir admite archivos .crj de versión 1 hasta 50 MB. El historial, grupos, herramientas temporales y posición de cámara no viajan en el archivo. Sí viajan piezas, cortes, materiales, acabados, uniones, configuración y plan optimizado.

## Validación enfocada

Pruebas de las nueve plantillas, archivo completo y rechazo de archivos inválidos, selección/historial, plano de snap y alineación posterior. Recorrido de navegador con mesa, perforación arrastrada, unión visual, medición, Fabricación/Optimizar/Reporte, X/Esc, exportación/apertura y recarga. Prueba adicional del arrastre múltiple, foco, menú y cotas. Mesa, repisa y cajonera inspeccionadas visualmente. No se añaden nuevas funciones de carpintería.

Cierre verificado: 42 pruebas unitarias enfocadas aprobadas; 3 pruebas de navegador aprobadas (flujo v1 con archivo, arrastre múltiple/herramientas y snap con liberación/Alt/historial/recarga). TypeScript y build aprobados. Se actualizaron los selectores de pruebas anteriores para las tres cotas separadas y el desplegable de posición de perforación.
