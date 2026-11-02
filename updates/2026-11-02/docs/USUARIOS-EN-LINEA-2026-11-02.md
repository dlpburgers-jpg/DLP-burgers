# Usuarios en línea

Nuevo módulo en Administrador → Clientes y equipo → Usuarios en línea, disponible para administradores con acceso total. Muestra clientes identificados, personal e invitados, plataforma, conexiones y antigüedad de la última señal. Una cuenta con varias conexiones se agrupa; los invitados se cuentan por pestaña.

Cada pestaña envía una señal cada 30 segundos mientras está visible. Al ocultarse informa la salida. El panel actualiza cada 15 segundos y descarta señales con más de 2 minutos. Es una estimación de presencia, no una medición exacta de personas ni de acciones realizadas.

La tabla vive en un esquema privado con RLS y sin permisos directos para clientes. El servidor determina la identidad a partir de la sesión, nunca de un identificador de usuario suministrado por el navegador. La consulta del listado requiere administrador total. No se envían ubicación, contraseñas, contenido de formularios, correo, teléfono ni historial de pantallas. La política de privacidad describe la señal de actividad.

La presencia no bloquea pedidos o ingresos si falla. El panel muestra un error y quita los datos anteriores si no puede actualizar. La función limita actualizaciones repetidas, limita sesiones almacenadas a 5000 y limpia señales vencidas al recibir nuevas sesiones o consultar el panel.

Las apps instaladas desde TestFlight/App Store/Play Store necesitan una nueva compilación que incorpore el seguimiento. La publicación web no actualiza recursos que ya están incluidos dentro de una app nativa. El script de preparación de recursos móviles utiliza esta entrega revisada e incluye el registro automático corregido.

Validaciones locales: pruebas del seguimiento y detección de plataforma, suite del proyecto y pantalla con datos ficticios para lista activa y vacía. `tests/presence.sql` verifica permisos, identidad, agrupación, vencimiento y salida dentro de una transacción que se revierte; ejecutar después de aplicar `supabase/094_online_visitors.sql`.
