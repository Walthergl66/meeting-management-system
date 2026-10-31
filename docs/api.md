# Contrato REST — MeetFlow

La lista de rutas implementadas se mantiene en el [mapa del sistema](./system-map.md#rutas-rest-implementadas), contrastada con los decoradores de los controladores. Swagger, servido en `GET /api/docs`, es la especificación OpenAPI generada por la aplicación y la referencia para esquemas y respuestas vigentes.

## Transporte y autenticación

- API local: `http://localhost:3000` (configurable con `PORT`). Los controladores no tienen prefijo global; por ejemplo, la ruta es `/meetings`, no `/api/meetings`.
- Las rutas privadas reciben `Authorization: Bearer <accessToken>`.
- Registro, login y refresh devuelven el access token en el cuerpo. El refresh token se establece en cookie `HttpOnly`; el cliente web incluye cookies con `credentials: 'include'`.
- El cliente web guarda el access token en `sessionStorage` y lo envía como Bearer. El guard global permite solo las rutas que el controlador marca con `@Public`; algunos dominios añaden guards de acceso al equipo o a la reunión.
- El namespace de Socket.IO `/realtime` es un canal separado, no una ruta REST. Su handshake requiere el JWT.

## Respuestas

El interceptor global envuelve valores de éxito como:

```json
{
  "data": { "id": "..." }
}
```

Si el controlador devuelve también `message`, ese campo se conserva. El interceptor conserva directamente los objetos que ya contienen `data` junto con `meta` o `message`; no se debe asumir que todas las colecciones están paginadas. El request ID se devuelve en la cabecera `X-Request-Id`.

Los errores usan el filtro global. El cuerpo puede incluir `statusCode`, `error`, `message`, `timestamp`, `path`, `requestId` y `details`; los campos opcionales solo aparecen cuando corresponde. `details` contiene problemas de validación como `{ "field": "...", "message": "..." }`. Los errores 500 no exponen el detalle interno.

## Validación y autorización

Los DTOs se validan con `ValidationPipe` global (`whitelist`, transformación y `forbidNonWhitelisted`). Un campo desconocido se rechaza y los errores de validación usan HTTP 422. La autorización se compone de:

1. JWT global salvo `@Public`.
2. Guards por módulo para pertenencia/acceso a equipo o reunión.
3. Reglas del servicio para acciones y propiedad del recurso.

Los permisos concretos son decisiones del backend; las copias de enums y tipos en el frontend sirven para el contrato visual, no sustituyen la autorización del servidor.

## Rutas implementadas

Consulta el [inventario completo por dominio](./system-map.md#rutas-rest-implementadas), con las 61 operaciones REST implementadas, sus métodos, rutas y clasificación de acceso. No forman parte de la implementación `POST /meetings/:id/duplicate` ni `POST /users/me/avatar`; el avatar se actualiza dentro de `PATCH /users/me`. No hay endpoints REST para enviar correo.

## Documentación OpenAPI

- UI: `GET /api/docs` cuando Swagger está habilitado.
- El documento OpenAPI se genera desde decoradores y DTOs del backend.
- Las descripciones de diseño históricas de este repositorio no prevalecen sobre los controladores activos ni sobre Swagger.
