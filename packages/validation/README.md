# @meetflow/validation

Esquemas Zod compartidos.

## Uso

- `apps/web`: validación de formularios con React Hook Form (`zodResolver`).
- `apps/api`: validación de query params y payloads donde encaje mejor Zod que
  `class-validator`. Los DTOs de NestJS con decoradores siguen siendo la fuente
  de verdad del contrato Swagger.

## Qué NO va aquí

- Reglas de negocio (existen solo en el backend).
- Esquemas de una sola app que nadie más va a reutilizar.
