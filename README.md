# Apuntes Premium Monorepo

Monorepo TypeScript para venta, administración y consumo de contenido premium con flujo completo de autenticación y pagos.

## 🇪🇸 Español

### Resumen

Este repositorio agrupa cuatro aplicaciones (`landing`, `api`, `content`, `admin`) y paquetes compartidos para operar un producto de contenido técnico con acceso por compra.

### Qué hace hoy

- `apps/landing` (Astro): landing y checkout con integración al backend para crear sesión de Stripe.
- `apps/api` (NestJS + TypeORM + PostgreSQL): autenticación JWT, usuarios, apuntes, pagos (checkout/webhook), email y generación de apuntes con Gemini.
- `apps/content` (Astro + React): acceso autenticado y consumo de apuntes publicados.
- `apps/admin` (Next.js): panel para gestionar apuntes, usuarios, ventas y generación asistida por IA.
- `packages/*`: utilidades y configuración compartida (TS, ESLint, UI).

### Capturas (App / Web)

![App](apps/admin/public/next.svg)
![Web](apps/admin/public/vercel.svg)

### Stack técnico (versiones reales)

- Node.js: `>=18` (`package.json` raíz)
- npm: `10.9.2` (`packageManager`)
- Turborepo: `2.8.3`
- TypeScript (root): `5.9.2`
- Admin: Next.js `16.1.6`, React `19.2.3`, Tailwind CSS `4`
- API: NestJS `10.x`, TypeORM `0.3.19`, PostgreSQL (`pg` `8.11.3`), Stripe `14.12.0`, Zod `4.3.6`, Gemini SDK `0.24.1`
- Content/Landing: Astro `4.3.5`, Tailwind CSS `3.4.1`

### Arquitectura (árbol breve)

```text
apps/
	admin/    # Panel de administración (Next.js)
	api/      # Backend (NestJS + TypeORM)
	content/  # Zona de contenido (Astro + React)
	landing/  # Landing y checkout (Astro)
packages/
	config/ eslint-config/ typescript-config/ ui/ utils/
```

### Decisiones técnicas

- Monorepo con workspaces de npm + Turborepo para unificar scripts de build/lint/types.
- Backend modular con NestJS (`auth`, `users`, `apuntes`, `payments`, `email`, `ai`).
- Persistencia con TypeORM sobre PostgreSQL y entidades por dominio.
- Stripe Checkout + webhook para registrar compra, otorgar acceso y enviar magic link por email.
- Validación de contenido generado con esquemas Zod en el servicio de IA.

### Setup rápido

```bash
npm install
```

Crear variables de entorno desde los ejemplos:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/content/.env.example apps/content/.env
Copy-Item apps/landing/.env.example apps/landing/.env
```

Ejecutar todo en desarrollo:

```bash
npm run dev
```

Puertos por defecto:

- API: `3001`
- Content: `3002`
- Admin: `3003`
- Landing: `4321`

Seed de datos de prueba (opcional, API):

```bash
npm run seed --workspace apps/api
```

### Validación técnica

```bash
npm run lint
npm run check-types
npm run build
```

### Roadmap corto

- Añadir y documentar migraciones formales de base de datos.
- Sustituir `alert()` por sistema consistente de notificaciones.
- Incorporar capturas reales de `admin`, `content` y `landing`.
- Añadir guía de deploy por aplicación (variables mínimas y pasos).

### Enfoque técnico principal

Entrega end-to-end de producto digital: adquisición (landing + checkout), provisión de acceso (webhook + email), administración interna (panel admin) y consumo autenticado de contenido (content app), compartiendo utilidades dentro del monorepo.

---

## 🇺🇸 English Version

### Summary

This repository contains four apps (`landing`, `api`, `content`, `admin`) plus shared packages to run a paid-content product with purchase-based access.

### Current Capabilities

- `apps/landing` (Astro): landing + checkout flow that calls backend checkout session creation.
- `apps/api` (NestJS + TypeORM + PostgreSQL): JWT auth, users, notes/content, payments (checkout/webhook), email, and Gemini-based content generation.
- `apps/content` (Astro + React): authenticated area to consume published notes.
- `apps/admin` (Next.js): admin panel for notes, users, sales, and AI-assisted generation.
- `packages/*`: shared utilities and configuration (TS, ESLint, UI).

<!-- ### Screenshots (App / Web)

![App](apps/admin/public/next.svg)
![Web](apps/admin/public/vercel.svg) -->

### Tech Stack

- Node.js: `>=18` (root `package.json`)
- npm: `10.9.2` (`packageManager`)
- Turborepo: `2.8.3`
- TypeScript (root): `5.9.2`
- Admin: Next.js `16.1.6`, React `19.2.3`, Tailwind CSS `4`
- API: NestJS `10.x`, TypeORM `0.3.19`, PostgreSQL (`pg` `8.11.3`), Stripe `14.12.0`, Zod `4.3.6`, Gemini SDK `0.24.1`
- Content/Landing: Astro `4.3.5`, Tailwind CSS `3.4.1`

### Architecture (Brief Tree)

```text
apps/
	admin/    # Admin panel (Next.js)
	api/      # Backend (NestJS + TypeORM)
	content/  # Content area (Astro + React)
	landing/  # Landing and checkout (Astro)
packages/
	config/ eslint-config/ typescript-config/ ui/ utils/
```

### Technical Decisions

- npm workspaces + Turborepo to standardize build/lint/typecheck workflows.
- Modular NestJS backend (`auth`, `users`, `apuntes`, `payments`, `email`, `ai`).
- Domain persistence with TypeORM + PostgreSQL entities.
- Stripe Checkout + webhook to record purchases, grant access, and send magic-link email.
- Zod schemas to validate AI-generated structured content.

### Quick Setup

```bash
npm install
```

Create env files from examples:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/content/.env.example apps/content/.env
Copy-Item apps/landing/.env.example apps/landing/.env
```

Run all apps in development:

```bash
npm run dev
```

Default ports:

- API: `3001`
- Content: `3002`
- Admin: `3003`
- Landing: `4321`

Optional seed data (API):

```bash
npm run seed --workspace apps/api
```

### Technical Validation

```bash
npm run lint
npm run check-types
npm run build
```

### Short Roadmap

- Add and document formal database migrations.
- Add real screenshots for `admin`, `content`, and `landing`.
- Add deploy guide per app (minimum env vars + steps).

### Technical Scope

End-to-end delivery for a digital content product: acquisition (landing + checkout), access provisioning (webhook + email), internal operations (admin panel), and authenticated content consumption (content app), all under one monorepo.
