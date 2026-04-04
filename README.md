# Sistema de Gestión de Productividad Personal

Aplicación web full-stack modular que integra múltiples herramientas de productividad en una sola plataforma. Desarrollada como proyecto de portafolio, demostrando arquitectura moderna con Next.js 15, autenticación robusta y buenas prácticas de desarrollo.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Estilos | Tailwind CSS v4 |
| Auth | Auth.js v5 (JWT, credentials + bcryptjs) |
| Base de datos | PostgreSQL vía Supabase + Prisma 5 |
| Notificaciones | Sonner |
| Deploy | Vercel + Supabase |

## Módulos

| Módulo | Estado | Descripción |
|---|---|---|
| Autenticación |  Completado | Registro, login, middleware, sesiones JWT |
| Tareas |  Completado | CRUD con sistema de ciclos configurables |
| Finanzas |  En desarrollo | Gastos/ingresos, categorías, gráficos |
| Nutrición |  Planificado | Planificación de comidas, tracking de macros |
| Análisis IA |  Planificado | Insights personalizados con IA |

## Características implementadas

- Autenticación completa con registro, login y protección de rutas por middleware
- Tareas cíclicas: cada tarea tiene un ciclo configurable (diario, semanal, mensual o personalizado) y se resetea automáticamente según días calendario
- CRUD completo con edición inline, atajos de teclado (Enter/Escape) y confirmación de eliminación
- Notificaciones toast con Sonner
- Arquitectura modular con desarrollo por ramas independientes

## Desarrollo local
```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Completar DATABASE_URL y AUTH_SECRET en .env

# Aplicar migraciones
npx prisma migrate deploy

# Iniciar servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Variables de entorno requeridas
```
DATABASE_URL=
AUTH_SECRET=
```

## Estructura del proyecto
```
mi-app-productividad/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # Auth.js v5 handlers
│   │   ├── register/             # Registro de usuario
│   │   └── tasks/                # CRUD de tareas
│   ├── dashboard/                # Área protegida
│   │   └── tasks/                # Módulo de tareas
│   ├── login/
│   ├── register/
│   └── layout.tsx                # SessionProvider + Toaster
├── lib/auth.ts                   # Configuración Auth.js v5
├── middleware.ts                  # Protección de rutas
└── prisma/
    └── schema.prisma             # Modelos de base de datos

## Autor

Recién egresado de Ingeniería en Informática — Inacap La Serena.
Experiencia previa en Python/Django, Unity/C# y Blender.
```