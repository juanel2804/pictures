# Galeria Pintor

Pagina dinamica para mostrar pinturas, administrarlas desde un panel privado y enviar compradores a WhatsApp.

## Estructura

- `frontend/`: archivos publicos de la pagina (`html`, `css`, `js`).
- `backend/`: servidor, rutas, base de datos y autenticacion.
- `render.yaml`: configuracion para desplegar en Render.

## Variables de entorno

Copia `.env.example` a `.env` para desarrollo local.

- `DATABASE_URL`: conexion de PostgreSQL.
- `SESSION_SECRET`: texto secreto para firmar la sesion.
- `ADMIN_USER`: usuario inicial del administrador.
- `ADMIN_PASSWORD`: password inicial del administrador.
- `ADMIN_NAME`: nombre que se mostrara en el panel.
- `WHATSAPP_PHONE`: numero en formato internacional, sin `+` ni espacios.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

Si no configuras `DATABASE_URL`, el proyecto usa una base en memoria para pruebas locales. En ese modo puedes entrar al panel con:

- Usuario: `admin`
- Password: `admin123`

En Render debes configurar una password real con `ADMIN_PASSWORD`.

## Subir a Render

1. Sube este proyecto a GitHub.
2. En Render, crea un nuevo Blueprint usando `render.yaml`.
3. Configura `ADMIN_PASSWORD` y `WHATSAPP_PHONE`.
4. Render creara el servicio web y la base de datos PostgreSQL.

El primer arranque crea automaticamente el usuario administrador si no existe.
