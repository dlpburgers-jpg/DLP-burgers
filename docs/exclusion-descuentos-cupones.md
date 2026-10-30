# Exclusión de productos de descuentos por cupones (propuesta V5)

Estado: especificación en rama de prueba; **no implementado ni publicado**.

## Requisito

En la edición de cada producto, incorporar un checkbox con el texto **Excluir este producto de los descuentos por cupones**. El valor persistido por producto debe ser booleano `excludeFromCouponDiscount`, con valor predeterminado `false` para productos existentes y nuevos.

## Cálculo

- Para cupones porcentuales, la base elegible es la suma de los importes de líneas cuyo producto tenga `excludeFromCouponDiscount !== true`.
- Los productos excluidos conservan su precio completo, incluso si comparten carrito con otros productos elegibles.
- El descuento jamás debe exceder el subtotal elegible.
- Los extras y variantes de un producto excluido también se excluyen, ya que forman parte de esa línea.
- El total y el desglose deben coincidir entre carrito, checkout, pedido persistido y cualquier cálculo del servidor; validar la exclusión en el backend, no solo en la interfaz.
- Revisar reglas de cupones de monto fijo, límites, combinaciones y delivery antes de implementarlas; no alterar su comportamiento sin definirlo.

## Casos de aceptación

1. Burger excluida $15.000 + papas elegibles $5.000, cupón 10%: descuento $500; total $19.500.
2. Dos productos excluidos, cupón 10%: descuento $0.
3. Dos productos elegibles por $20.000, cupón 10%: descuento $2.000.
4. Un producto existente sin el campo nuevo continúa siendo elegible.
5. Al editar y guardar un producto, el checkbox conserva su estado tras recargar y entre dispositivos.
6. El cálculo no cambia por modificar cantidades, variantes o extras de un producto excluido.

## Nota técnica del repositorio

Este repositorio contiene la publicación estática de V5 y bundles compilados en `assets/`. El archivo `app.js` es una implementación distinta y no es el punto de entrada del `index.html` actual. El código fuente y las migraciones de Supabase no están presentes aquí. La implementación debe hacerse en el código fuente V5 y su backend, generar una compilación nueva y desplegarla después de validar estos casos.
