# Cuentas creadas y alta automática

Las cuentas nuevas por celular quedan habilitadas al registrarse. El ingreso sigue requiriendo la contraseña; no se devuelve una sesión desde el registro. Se mantienen validación de datos, consentimiento, límites de intentos e idempotencia de la solicitud. Ya no se solicita enviar un WhatsApp para habilitar.

El módulo de Mostrador se llama **Cuentas creadas**. También está disponible dentro de Usuarios para administradores. Permite elegir fecha, ver cantidad total, nombre, celular y hora. Usa días de medianoche a medianoche de Buenos Aires y páginas de 100 cuentas; excluye usuarios anónimos, empleados y cuentas eliminadas. Los datos no son públicos: la función comprueba el rol del usuario en el servidor.

El titular autorizó habilitar cuentas pendientes. Se aplicó la migración limitada a registros de clientes coincidentes. Había **0** pendientes antes y quedaron **0** después; no se cambiaron cuentas ajenas al flujo.

Implementación: migraciones 092 y 093; función dlp-users versión 14; componentes CreatedAccounts y PhoneRegistration. Se conserva el método de pedidos por WhatsApp de la entrega anterior.

Validación: 163 pruebas Node aprobadas; pruebas SQL con rollback de alta automática (incluida la secuencia real de Auth: alta, metadatos y confirmación), pendientes, permisos, fechas y paginación. Interfaz comprobada con datos ficticios: listado, fecha vacía, error recuperable, alta inmediata y acceso posterior. No se crearon clientes reales ni pedidos de prueba.

La web se prepara desde release-static y su manifiesto SHA-256. No reconstruir toda la aplicación desde src hasta reconciliar las diferencias históricas entre el código fuente y el sitio publicado. El script prepare-automatic-accounts.mjs sustituye únicamente los componentes y las etiquetas revisados sobre el bundle de la entrega anterior. Las fuentes correspondientes también se actualizaron.

La secuencia de confirmación se contrastó con el [código oficial de Supabase Auth](https://github.com/supabase/auth/blob/master/internal/api/admin.go). Los metadatos que habilitan la cuenta pertenecen al servidor, no a los campos editables por clientes.

Reversión de la interfaz: volver a la versión Sites 115. El respaldo del servicio anterior está en ops/dlp-users-live-before-accounts.ts. No deshabilitar clientes ya habilitados como parte de una reversión visual.
