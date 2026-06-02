# Eventos Boyacá — Plataforma de Gestión y Venta de Entradas

Aplicación web full-stack para la gestión y venta de entradas a eventos presenciales en Colombia, desarrollada como proyecto de la materia **Software II**.

---

## Tabla de contenido

1. [Descripción general](#1-descripción-general)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [SDLC — Ciclo de vida del desarrollo](#3-sdlc--ciclo-de-vida-del-desarrollo)
4. [Arquitectura y diagramas](#4-arquitectura-y-diagramas)
5. [Mensajería — Broker y Worker con LLM](#5-mensajería--broker-y-worker-con-llm)
6. [Sockets — Comunicación en tiempo real](#6-sockets--comunicación-en-tiempo-real)
7. [Integración con LLM (Ollama)](#7-integración-con-llm-ollama)
8. [Instalación y ejecución](#8-instalación-y-ejecución)
9. [Variables de entorno](#9-variables-de-entorno)
10. [Integrantes](#10-integrantes)

---

## 1. Descripción general

**Eventos Boyacá** permite a usuarios explorar eventos, comprar entradas con pago por tarjeta y recibir sus tickets con código QR. Los administradores gestionan eventos, categorías, tipos de ticket y consultan reportes de ventas.

### Roles del sistema

| Rol | Capacidades |
|---|---|
| `admin` | Crear/editar/eliminar eventos, gestionar categorías y catálogo de tickets, ver reportes de ventas y estadísticas |
| `user` | Explorar eventos, comprar entradas, ver historial de compras, guardar favoritos, editar perfil |

### Funcionalidades principales

- Registro y autenticación con JWT
- Catálogo de eventos con filtros por categoría, nombre y fecha
- Tipos de ticket por evento (VIP, General, Oro, Plata) con precio y capacidad independientes
- Procesamiento de pagos con tarjeta (Visa / Mastercard) en COP
- Generación de tickets individuales con código QR al confirmar compra
- Sistema de favoritos e intereses de usuarios
- Dashboard de administración con estadísticas en tiempo real
- Reportes de ventas por evento
- Asistente IA integrado para soporte al usuario
- Mensajes de estado de transacción en tiempo real generados por LLM

---

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Nuxt 3 / Vue 3 |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL + Prisma ORM |
| LLM | Ollama — modelo `qwen2.5:0.5b` |
| Mensajería | Redis + BullMQ (Broker/Worker) |
| Imágenes | Cloudinary |
| Pagos | Pasarela de pagos propia (puerto 3003) |
| CI/CD | GitHub Actions |
| Calidad de código | ESLint, Prettier, Husky, Commitlint, SonarQube |

---

## 3. SDLC — Ciclo de vida del desarrollo

El proyecto sigue un ciclo de vida ágil con integración continua y control de calidad automatizado en cada contribución.

### 3.1 Control de versiones y ramas

```
main          ← rama de producción (requiere PR aprobado)
develop       ← rama de integración
feature/*     ← ramas de funcionalidad por desarrollador
```

### 3.2 Convención de commits (Conventional Commits)

Todos los commits siguen el estándar **Conventional Commits**, validado automáticamente con **Commitlint** vía hook de Husky:

```
feat: nueva funcionalidad
fix: corrección de bug
refactor: reestructuración de código
docs: cambios en documentación
chore: tareas de mantenimiento
style: cambios de formato sin lógica
```

### 3.3 Hooks pre-commit (Husky + lint-staged)

Antes de cada commit se ejecutan automáticamente:

```
prettier --write     ← formatea el código
eslint --fix         ← valida y corrige reglas de estilo
```

### 3.4 Pipeline CI/CD (GitHub Actions)

El pipeline se activa en cada push a `main` o `develop` y en Pull Requests a `main`:

```
Jobs:
  backend:
    - Checkout del código
    - Configurar Node.js 22.12.0
    - Instalar dependencias (npm ci)
    - Generar cliente Prisma
    - Verificar sintaxis (node --check)

  frontend:
    - Checkout del código
    - Configurar Node.js 22.12.0
    - Instalar dependencias
    - Build de producción (npm run build)
```

### 3.5 Calidad de código (SonarQube)

El proyecto está conectado a SonarQube para análisis estático de:
- Code smells y duplicaciones
- Vulnerabilidades de seguridad
- Cobertura de pruebas

---

## 4. Arquitectura y diagramas

### 4.1 Arquitectura general del sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE                                 │
│                    Nuxt 3 / Vue 3                               │
│              http://localhost:3002                              │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API / SSE
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Express)                             │
│                 http://localhost:3001                           │
│                                                                 │
│  /api/auth          /api/events       /api/purchases            │
│  /api/categories    /api/favorites    /api/admin/reports        │
│  /api/ticket-catalog /api/upload      /api/admin/users          │
└──────┬──────────────────────┬──────────────────┬───────────────┘
       │                      │                  │
       ▼                      ▼                  ▼
┌──────────────┐  ┌───────────────────┐  ┌──────────────────────┐
│  PostgreSQL  │  │  Pasarela de Pagos│  │  Redis (Broker)      │
│  + Prisma    │  │  localhost:3003   │  │  BullMQ Queue        │
│  gestor_     │  │  Visa/Mastercard  │  │  Worker → Ollama     │
│  eventos     │  └───────────────────┘  └──────────────────────┘
└──────────────┘
```

### 4.2 Modelo de datos (entidades principales)

```
Role ──< User >──< UserEvent >──< Event >──< EventTicketType >──< TicketTypeCatalog
                                    │              │
                                EventImage    EventTicketTypeHistory
                                    │
                                EventHistory
                                    │
                         Purchase >──< Ticket
                              │
                           Interest
```

| Entidad | Descripción |
|---|---|
| `User` | Usuarios con rol admin o user, soft delete |
| `Event` | Eventos con categoría, ubicación y fecha. Estado: activo / completado / eliminado |
| `TicketTypeCatalog` | Catálogo global de tipos (VIP, General, Oro, Plata) |
| `EventTicketType` | Asignación de tipo de ticket a evento con precio y capacidad propios |
| `Purchase` | Compra de entradas. Estado: pending → completed / cancelled |
| `Ticket` | Ticket individual con número único y QR por cada unidad comprada |
| `UserEvent` | Favoritos del usuario |
| `EventHistory` | Historial de cambios de eventos (auditoría) |

### 4.3 Flujo de compra y pago

```
Usuario
  │
  ├─[1] Selecciona evento + tipo de ticket + cantidad
  │
  ├─[2] Ingresa datos de tarjeta (PAN, CVV, titular)
  │
Frontend (Nuxt)
  │
  ├─[3] POST /api/purchases → Backend (Express)
  │
Backend
  ├─[4] Valida disponibilidad de cupos
  ├─[5] Llama a Pasarela de Pagos → Visa/Mastercard → Respuesta banco
  │       ├─ APPROVED → continúa
  │       └─ REJECTED → error al usuario
  ├─[6] Crea Purchase (status: completed) + Tickets con QR
  ├─[7] Publica job en Redis (Broker) → Worker → LLM genera mensaje
  │
  └─[8] Responde al frontend con resultado + mensaje LLM vía SSE
```

---

## 5. Mensajería — Broker y Worker con LLM

Este es el componente central de la arquitectura de mensajería. Permite informar al usuario en tiempo real sobre el estado de su transacción mediante mensajes generados por inteligencia artificial.

### 5.1 Arquitectura del sistema de mensajería

```
                    ┌─────────────────────────────────────┐
                    │            Express Backend          │
                    │                                     │
  Evento de pago ──►│  publisher.add(job)                 │
                    │       │                             │
                    └───────┼─────────────────────────────┘
                            │
                            ▼
                    ┌───────────────────┐
                    │   Redis Broker    │
                    │                  │
                    │  [Trabajo        │
                    │   pendiente]  ───┼──► Worker
                    │                  │        │
                    │  [Resultados] ◄──┼────────┘
                    └───────┬───────────┘
                            │ resultado
                            ▼
                    ┌───────────────────┐
                    │  Express → SSE   │──► Frontend → Usuario
                    └───────────────────┘
```

### 5.2 Worker y llamada al LLM

El Worker es un proceso independiente que:

1. Escucha la cola de Redis (BullMQ)
2. Recibe el job con el contexto de la transacción (evento, monto, estado)
3. Construye el prompt y llama a la API de Ollama
4. Devuelve el mensaje generado al broker
5. El broker notifica al backend, que lo envía al frontend vía SSE

```javascript
// Ejemplo de job publicado al broker
{
  type: 'payment_status',
  step: 'processing',        // validating | processing | confirming | success | rejected
  eventName: 'Concierto A',
  amount: 150000,
  currency: 'COP',
  ticketType: 'VIP',
  quantity: 2
}
```

### 5.3 Pasos y mensajes generados por el LLM

| Paso (`step`) | Mensaje generado por el LLM |
|---|---|
| `validating` | "¡Casi listo! Estamos verificando que haya cupos disponibles para ti." |
| `processing` | "Estamos procesando tu pago de forma segura. Por favor no cierres esta ventana." |
| `confirming` | "¡Tu pago fue aprobado! Estamos generando tus entradas, ya casi terminamos." |
| `success` | "¡Todo listo! Tu compra fue confirmada. Ya puedes ver tus entradas en 'Mis compras'." |
| `rejected` | "Lo sentimos, tu pago no pudo procesarse. Verifica los datos de tu tarjeta." |
| `timeout` | "La respuesta del banco tardó más de lo esperado. No se realizó ningún cobro." |
| `error` | "Ocurrió un error inesperado. Tranquilo, no se realizó ningún cobro." |

---

## 6. Sockets — Comunicación en tiempo real

Se utiliza **Server-Sent Events (SSE)** para enviar mensajes unidireccionales del servidor al cliente durante el proceso de pago, sin necesidad de polling.

### 6.1 Endpoint SSE

```
GET /api/purchases/status/:jobId
Content-Type: text/event-stream
```

### 6.2 Flujo de eventos

```
Frontend                          Backend (SSE)
   │                                   │
   ├──GET /api/purchases/status/:id ──►│
   │                                   │  (conexión abierta)
   │◄── event: status ─────────────────┤  { step: 'validating', message: '...' }
   │◄── event: status ─────────────────┤  { step: 'processing', message: '...' }
   │◄── event: status ─────────────────┤  { step: 'success',    message: '...' }
   │◄── event: done ────────────────────┤  (cierra conexión)
```

### 6.3 Manejo en el frontend (Vue 3)

```javascript
const source = new EventSource(`/api/purchases/status/${jobId}`)

source.addEventListener('status', (e) => {
  const { step, message } = JSON.parse(e.data)
  mostrarMensaje(message)
})

source.addEventListener('done', () => source.close())
```

---

## 7. Integración con LLM (Ollama)

### 7.1 Configuración de Ollama

```bash
# 1. Descargar la imagen
docker pull ollama/ollama

# 2. Iniciar el contenedor con soporte de orígenes externos
docker run -d --name ollama \
  -v ollama:/root/.ollama \
  -p 11434:11434 \
  -e OLLAMA_ORIGINS="*" \
  ollama/ollama

# 3. Descargar el modelo
docker exec -it ollama ollama pull qwen2.5:0.5b

# 4. Iniciar chat (opcional)
docker exec -it ollama ollama run qwen2.5:0.5b
```

### 7.2 Modelo utilizado

| Parámetro | Valor |
|---|---|
| Modelo | `qwen2.5:0.5b` |
| Puerto | `11434` |
| Temperatura | `0.7` |
| Max tokens | `200` |
| Idioma | Español (forzado por system prompt) |

### 7.3 Usos del LLM en la plataforma

**a) Asistente IA (chat flotante)**
Disponible en la vista pública para todos los usuarios. Responde preguntas sobre eventos, tickets, pagos y soporte general de la plataforma.

**b) Mensajes de estado de transacción (Worker)**
Durante el proceso de compra, el worker invoca al LLM para generar mensajes personalizados y amables que informan al usuario en cada etapa del pago.

### 7.4 System Prompt

El LLM tiene un contexto completo de la plataforma que incluye:
- Descripción de roles, eventos y estados del sistema
- Flujo de compra completo paso a paso
- Catálogo de tipos de ticket y reglas de capacidad
- Manejo empático de errores de pago con sugerencias concretas
- Mensajes amables y tranquilizadores para cada estado de transacción
- Restricciones: no revelar datos sensibles, responder solo en español, máximo 3 oraciones

---

## 8. Instalación y ejecución

### Requisitos previos

- Node.js 22.x
- Docker Desktop
- Git

### 8.1 Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd event-management-project
```

### 8.2 Base de datos (Docker)

```bash
cd database
docker build -t eventos-db .
docker run -d --name eventos-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=admin \
  -e POSTGRES_DB=gestor_eventos \
  -p 5432:5432 eventos-db
```

### 8.3 Backend

```bash
cd backend
cp .env.example .env    # configurar variables
npm install
npx prisma generate --schema src/prisma/schema.prisma
npm run dev             # http://localhost:3001
```

Documentación de la API disponible en: `http://localhost:3001/api-docs`

### 8.4 Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev             # http://localhost:3002
```

### 8.5 LLM (Ollama)

```bash
docker pull ollama/ollama
docker run -d --name ollama \
  -v ollama:/root/.ollama \
  -p 11434:11434 \
  -e OLLAMA_ORIGINS="*" \
  ollama/ollama
docker exec -it ollama ollama pull qwen2.5:0.5b
```

---

## 9. Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://postgres:admin@localhost:5432/gestor_eventos` |
| `PORT` | Puerto del backend | `3001` |
| `JWT_SECRET` | Clave secreta para tokens | `mi-clave-secreta` |
| `FRONTEND_URL` | URL del frontend para CORS | `http://localhost:3002` |
| `PAYMENT_GATEWAY_URL` | URL de la pasarela de pagos | `http://localhost:3003` |
| `CLOUDINARY_CLOUD_NAME` | Nombre del cloud en Cloudinary | `mi-cloud` |
| `CLOUDINARY_API_KEY` | API Key de Cloudinary | `123456789` |
| `CLOUDINARY_API_SECRET` | Secret de Cloudinary | `mi-secret` |

### Credenciales de prueba (seeds)

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `admin@eventos.com` | `admin123` |
| Usuario | `cliente@eventos.com` | `cliente123` |

---

## 10. Integrantes

Proyecto desarrollado por el grupo **8MB P6G** — Materia Software II, Semestre 2026-I.
