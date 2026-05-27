# Pipeline CI — Documentación

## ¿Qué es el pipeline?

Es un proceso automatizado que se ejecuta en GitHub Actions cada vez que alguien abre un Pull Request hacia `main` o hace push directo a `main`. Su objetivo es detectar errores antes de que el código llegue a producción.

---

## Cuándo se ejecuta

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

Se dispara en dos casos:
- **Push a `main`**: cuando se fusiona un PR.
- **Pull Request hacia `main`**: cuando alguien sube una rama para revisión. El pipeline corre automáticamente y bloquea el merge si falla.

---

## Configuraciones globales

### `concurrency`
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```
Si alguien hace dos pushes seguidos al mismo PR, cancela el primer pipeline y solo corre el más reciente. Evita desperdiciar minutos de CI en runs obsoletos.

### `permissions`
```yaml
permissions:
  contents: read
```
El pipeline solo tiene permiso de lectura del repositorio. Si alguien lograra inyectar código malicioso en un paso, no podría escribir, borrar ramas ni publicar releases.

### `timeout-minutes: 10`
Si un job tarda más de 10 minutos (por ejemplo, un test que se cuelga), GitHub lo cancela automáticamente. Evita que los minutos de CI se agoten por procesos zombis.

---

## Job: Backend

Trabaja desde la carpeta `backend/` en cada paso.

### 1. Checkout del código
```yaml
uses: actions/checkout@v4
```
Descarga el código del repositorio en el runner de GitHub para poder trabajar con él.

### 2. Configurar Node.js
```yaml
uses: actions/setup-node@v4
with:
  node-version: "22"
  cache: "npm"
  cache-dependency-path: backend/package-lock.json
```
Instala Node.js 22 y activa caché de `node_modules` basado en el `package-lock.json`. Si el lock file no cambió desde el último run, las dependencias se restauran desde caché en segundos en lugar de descargarse de internet.

### 3. Instalar dependencias
```yaml
run: npm ci --ignore-scripts
```
`npm ci` es la versión de CI de `npm install`: usa el `package-lock.json` exacto (sin actualizarlo), falla si hay discrepancias y es reproducible. `--ignore-scripts` evita ejecutar scripts del `postinstall` de paquetes de terceros, reduciendo superficie de ataque.

### 4. Generar cliente Prisma
```yaml
run: npx prisma generate --no-hints
```
Prisma genera el cliente TypeScript/JS a partir del `schema.prisma`. Este paso es necesario porque el cliente generado no se versiona en git (está en `.gitignore`). Sin él, cualquier import de `@prisma/client` fallaría.

### 5. Verificar sintaxis
```yaml
run: find src -name "*.js" | xargs node --check
```
Recorre todos los archivos `.js` del backend y verifica que sean sintácticamente válidos con Node.js, sin necesidad de ejecutarlos. Detecta errores básicos como llaves sin cerrar o palabras reservadas mal usadas.

### 6. Lint
```yaml
run: npm run lint
```
Ejecuta ESLint sobre el código fuente. Detecta variables no usadas, imports innecesarios, y otros problemas de calidad de código definidos en `eslint.config.mjs`.

### 7. Tests y cobertura
```yaml
run: npm run test:coverage
```
Ejecuta Jest con reporte de cobertura. Corre todos los archivos `*.test.js` y genera métricas de qué porcentaje del código está cubierto por tests.

### 8. Subir reporte de cobertura
```yaml
uses: actions/upload-artifact@v4
with:
  name: coverage-backend
  path: backend/coverage/
  retention-days: 7
```
Guarda el reporte HTML de cobertura como artefacto descargable desde la UI de GitHub durante 7 días. Útil para revisar qué líneas no tienen tests sin tener que correrlos localmente.

### 9. Auditoría de seguridad
```yaml
run: npm audit --audit-level=critical --omit=dev
```
Revisa si alguna dependencia de producción tiene vulnerabilidades conocidas con severidad **crítica**. Las dependencias de desarrollo (`--omit=dev`) se excluyen porque no llegan al servidor. Solo falla ante vulnerabilidades críticas para evitar falsos positivos de vulnerabilidades de bajo riesgo.

---

## Job: Frontend

Trabaja desde la carpeta `frontend/` en cada paso. Corre **en paralelo** con el job de backend.

### 1 y 2. Checkout y Configurar Node.js
Igual que en backend, descarga el código y prepara Node.js 22 con caché basado en `frontend/package-lock.json`.

### 3. Instalar dependencias
```yaml
run: npm ci
```
Igual que en backend pero sin `--ignore-scripts`, porque Nuxt necesita algunos scripts de postinstall para funcionar correctamente.

### 4. Verificar formato (Prettier)
```yaml
run: npx prettier --check .
```
Comprueba que **todos** los archivos del frontend tienen el formato correcto según las reglas de `.prettierrc.mjs`. No modifica nada, solo falla si hay diferencias. Garantiza que el código tiene estilo consistente sin importar quién lo escribió o en qué sistema operativo.

### 5. Verificar tipos (TypeScript)
```yaml
run: npm run typecheck
```
Ejecuta `nuxi typecheck`, que corre el compilador de TypeScript sobre todo el proyecto Nuxt sin generar archivos de salida. Detecta errores de tipos como propiedades inexistentes, argumentos incorrectos o incompatibilidades entre interfaces.

### 6. Tests y cobertura
```yaml
run: npm run test:coverage
```
Ejecuta Vitest con reporte de cobertura usando `@vitest/coverage-v8`. Igual que en backend, genera métricas de líneas cubiertas por tests.

### 7. Subir reporte de cobertura
Igual que en backend, guarda el reporte de cobertura del frontend como artefacto durante 7 días.

### 8. Construir aplicación
```yaml
run: npm run build
```
Ejecuta `nuxt build` para generar la versión de producción de la aplicación. Si el build falla (por ejemplo, por un error de importación, un componente mal usado o un template inválido), el pipeline falla antes de que ese código pueda desplegarse.

---

## Dependabot (`.github/dependabot.yml`)

Dependabot es un bot de GitHub que revisa automáticamente si las dependencias del proyecto tienen versiones más nuevas disponibles y abre Pull Requests para actualizarlas.

```yaml
schedule:
  interval: "weekly"
  day: "monday"
```

Cada lunes revisa tres ecosistemas:
- **`/backend`** — dependencias npm del backend
- **`/frontend`** — dependencias npm del frontend  
- **`/` (github-actions)** — versiones de las actions usadas en el pipeline (`actions/checkout`, `actions/setup-node`, etc.)

Los PRs de Dependabot pasan por el mismo pipeline de CI, así que si una actualización rompe los tests o el build, se ve inmediatamente antes de fusionar.

---

## Archivos de soporte creados

| Archivo | Propósito |
|---|---|
| `.github/workflows/ci.yml` | Definición del pipeline |
| `.github/dependabot.yml` | Actualizaciones automáticas de dependencias |
| `.gitattributes` | Fuerza saltos de línea LF en todos los archivos (evita diferencias CRLF entre Windows y Linux/CI) |
| `backend/eslint.config.mjs` | Reglas de ESLint para el backend (formato flat config de ESLint v10) |
| `backend/prisma.config.js` | Configuración de conexión de Prisma v7 (requerido desde esa versión) |
| `frontend/vitest.config.ts` | Configuración de Vitest para tests del frontend con entorno `happy-dom` |
| `frontend/.prettierrc.mjs` | Reglas de Prettier incluyendo `endOfLine: lf` para consistencia con CI |

---

## Flujo completo de un PR

```
Developer hace push a una rama feature
        │
        ▼
Abre Pull Request hacia main
        │
        ▼
GitHub Actions dispara el pipeline
        │
   ┌────┴────┐
   │         │
Backend   Frontend   (en paralelo)
   │         │
   │  ┌──────┤
   │  │ Prettier check
   │  │ TypeScript check
   │  │ Tests + cobertura
   │  │ Build
   │  └──────┤
   │         │
   └────┬────┘
        │
   ¿Todo OK?
   ├── NO → Pipeline rojo, merge bloqueado, el dev corrige
   └── SÍ → Pipeline verde, compañero revisa y aprueba el PR
```
