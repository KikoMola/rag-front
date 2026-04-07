# RAG Chat — Local Intelligence Platform

> **Español** · [English below](#english)

---

## Español

RAG Chat es una plataforma de inteligencia local que permite gestionar colecciones de documentos y mantener conversaciones con una IA que fundamenta sus respuestas exclusivamente en esos documentos (*Retrieval-Augmented Generation*). El frontend está construido con **Angular 21** y se comunica con un backend Python (FastAPI) disponible en `http://localhost:8000`.

### Características principales

| Sección | Descripción |
|---|---|
| **Dashboard** | Vista general con estadísticas (documentos, colecciones, modelos), documentos recientes con estado de indexación y accesos rápidos. |
| **Colecciones** | Listado, creación y eliminación de colecciones. Búsqueda en tiempo real con debounce de 300 ms. |
| **Detalle de colección** | Gestión de documentos: subida individual o por lotes (drag & drop), lista con nombre, tamaño, chunks y estado, y eliminación. |
| **Chat RAG** | Interfaz de chat con streaming de tokens en tiempo real. Incluye bloques de "razonamiento" (*thinking*) colapsables, renderizado Markdown y la posibilidad de cancelar la generación en curso. |

### Tecnologías

- **Angular 21** — Componentes standalone, Signals, `@if`/`@for`, lazy loading de rutas.
- **TypeScript 5.9** — Modo strict, tipos propios para todos los modelos.
- **RxJS 7.8** — Programación reactiva completa (switchMap, debounceTime, takeUntilDestroyed…).
- **Tailwind CSS 4** — Sistema de tokens vía `@theme` en `styles.css`.
- **ng-primitives** — Componentes headless (botones, progress, avatar…).
- **@lucide/angular** — Iconografía SVG.
- **marked** — Renderizado de Markdown en mensajes del chat.
- **Vitest** — Suite de tests unitarios.

### Arquitectura

```
src/app/
├── app.ts / app.routes.ts / app.config.ts   # Raíz y configuración
├── layout/                                   # Shell: sidebar + navbar + outlet
│   ├── navbar/                               # Barra superior con búsqueda
│   └── sidebar/                              # Navegación lateral
├── dashboard/                                # Página de inicio con estadísticas
├── collections/                              # Feature de colecciones
│   ├── collection-detail/                    # Subida y gestión de documentos
│   └── collection-chat/                      # Interfaz de chat con la colección
└── core/
    ├── models/collection.model.ts            # Interfaces TypeScript
    ├── services/
    │   ├── collections.service.ts            # CRUD colecciones y documentos
    │   ├── dashboard.service.ts              # Stats y búsqueda global
    │   ├── rag-chat.service.ts               # Streaming SSE con Fetch API
    │   └── search.service.ts                 # Estado de búsqueda como Signal
    └── pipes/markdown.pipe.ts                # Markdown → HTML seguro
```

#### Árbol de rutas

```
/                     → Dashboard
/collections          → Listado de colecciones
/collections/:id      → Detalle (documentos)
/collections/:id/chat → Chat RAG
```

### Flujo de datos

1. **Colecciones** — `CollectionsService` consume `GET/POST/DELETE /api/knowledge/collections`.
2. **Documentos** — `CollectionsService` consume `GET/POST/DELETE /api/knowledge/collections/:id/documents`. El componente de detalle *polling* los documentos en estado `processing` hasta que pasan a `indexed` o `error`.
3. **Chat** — `RagChatService` realiza un `POST /api/knowledge/collections/:id/query` y lee la respuesta como un `ReadableStream` de Server-Sent Events, separando eventos `thinking` (razonamiento) de eventos `token` (respuesta final).
4. **Búsqueda** — `SearchService` expone un Signal con el término actual; `NavbarComponent` actualiza el Signal y `CollectionsComponent` lo consume para filtrar el listado.

### Gestión de estado

No se usa NgRx ni ningún store externo. Todo el estado local se gestiona con **Signals de Angular**:

- `signal()` para valores primitivos y listas.
- `computed()` para valores derivados (p. ej. `displayedCollections`).
- `effect()` cuando es necesario reaccionar a cambios de señal con efectos secundarios.
- RxJS se usa únicamente para operaciones asíncronas (peticiones HTTP, debounce, streaming).

### Prerrequisitos

- Node.js ≥ 20
- Angular CLI ≥ 21 (`npm i -g @angular/cli`)
- Backend Python corriendo en `http://localhost:8000` (ver repositorio `local-rag`)

### Instalación y arranque

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
ng serve
# → http://localhost:4200
```

### Tests

```bash
ng test
```

### Build de producción

```bash
ng build
# Artefactos en dist/
```

---

## English

RAG Chat is a local intelligence platform for managing document collections and chatting with an AI that grounds its answers exclusively in those documents (*Retrieval-Augmented Generation*). The frontend is built with **Angular 21** and communicates with a Python/FastAPI backend running at `http://localhost:8000`.

### Key Features

| Section | Description |
|---|---|
| **Dashboard** | Overview with stats (documents, collections, models), recently indexed files with status indicators, and quick-access links. |
| **Collections** | List, create, and delete knowledge collections. Real-time search with a 300 ms debounce. |
| **Collection Detail** | Document management: single or batch upload (drag & drop), table with filename, size, chunk count, status, and delete action. |
| **RAG Chat** | Chat interface with real-time token streaming. Includes collapsible thinking blocks, Markdown rendering, and the ability to abort an ongoing generation. |

### Tech Stack

- **Angular 21** — Standalone components, Signals, `@if`/`@for`, lazy-loaded routes.
- **TypeScript 5.9** — Strict mode, typed models throughout.
- **RxJS 7.8** — Full reactive programming (switchMap, debounceTime, takeUntilDestroyed…).
- **Tailwind CSS 4** — Token system via `@theme` in `styles.css`.
- **ng-primitives** — Headless UI components (buttons, progress, avatar…).
- **@lucide/angular** — SVG icon library.
- **marked** — Markdown rendering for chat messages.
- **Vitest** — Unit test suite.

### Architecture

```
src/app/
├── app.ts / app.routes.ts / app.config.ts   # Root & configuration
├── layout/                                   # Shell: sidebar + navbar + outlet
│   ├── navbar/                               # Top bar with search
│   └── sidebar/                              # Side navigation
├── dashboard/                                # Home page with stats
├── collections/                              # Collections feature
│   ├── collection-detail/                    # Document upload & management
│   └── collection-chat/                      # Chat interface for a collection
└── core/
    ├── models/collection.model.ts            # TypeScript interfaces
    ├── services/
    │   ├── collections.service.ts            # CRUD for collections & documents
    │   ├── dashboard.service.ts              # Stats and global search
    │   ├── rag-chat.service.ts               # SSE streaming via Fetch API
    │   └── search.service.ts                 # Search query as a Signal
    └── pipes/markdown.pipe.ts                # Markdown → safe HTML
```

#### Route tree

```
/                     → Dashboard
/collections          → Collections list
/collections/:id      → Detail (documents)
/collections/:id/chat → RAG Chat
```

### Data Flow

1. **Collections** — `CollectionsService` calls `GET/POST/DELETE /api/knowledge/collections`.
2. **Documents** — `CollectionsService` calls `GET/POST/DELETE /api/knowledge/collections/:id/documents`. The detail component polls documents in `processing` state until they reach `indexed` or `error`.
3. **Chat** — `RagChatService` makes a `POST /api/knowledge/collections/:id/query` and reads the response as a `ReadableStream` of Server-Sent Events, separating `thinking` events (reasoning) from `token` events (final answer).
4. **Search** — `SearchService` exposes a Signal with the current query; `NavbarComponent` writes it and `CollectionsComponent` reads it to filter the list.

### State Management

No NgRx or external store is used. All local state is managed with **Angular Signals**:

- `signal()` for primitive values and lists.
- `computed()` for derived values (e.g. `displayedCollections`).
- `effect()` when side effects need to react to signal changes.
- RxJS is used exclusively for async operations (HTTP requests, debounce, streaming).

### Prerequisites

- Node.js ≥ 20
- Angular CLI ≥ 21 (`npm i -g @angular/cli`)
- Python backend running at `http://localhost:8000` (see `local-rag` repository)

### Installation & Development

```bash
# Install dependencies
npm install

# Development server
ng serve
# → http://localhost:4200
```

### Tests

```bash
ng test
```

### Production Build

```bash
ng build
# Artifacts in dist/
```
