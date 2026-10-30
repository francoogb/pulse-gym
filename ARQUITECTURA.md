# Arquitectura de Pulse en diagramas

Esta página muestra cómo se conecta todo. Los diagramas se ven en GitHub y en cualquier visor de Markdown que soporte Mermaid.

## 1. Vista general

Pulse corre en tu PC como un solo servidor. El celular se conecta por Tailscale; la app instalada (PWA) usa el service worker para avisos.

```mermaid
flowchart TD
    U["👤 Usuario<br/>(celular / PC)"]
    TS["🔒 Tailscale Serve<br/>HTTPS privado"]
    U -->|HTTPS| TS

    subgraph SRV["🖥️ Servidor Next.js 16 · puerto 4317"]
        PX{"🛡️ proxy.js<br/>cookie firmada o Basic"}
        LOGIN["🔑 /acceso<br/>inicio de sesión"]
        PG["📄 Páginas App Router<br/>pulse-dashboard.js"]
        API["⚙️ API Route Handlers<br/>src/app/api/*"]
        SW["📦 sw.js (Serwist)<br/>caché y avisos"]
    end
    TS --> PX
    PX -->|sin sesión| LOGIN
    PX -->|con sesión| PG --> API

    DB[("🗄️ gym.db<br/>SQLite")]
    CLI["🤖 Claude Code CLI<br/>fotos · describir · coach · ejercicio IA"]
    OFF["🍎 Open Food Facts<br/>códigos de barras"]
    API -->|lee y escribe| DB
    API -->|prompt + imagen| CLI
    API -->|código de barras| OFF

    subgraph TAREAS["⏰ Programador de tareas (Windows)"]
        T1["Pulse servidor<br/>al iniciar sesión"]
        T2["Pulse avisos<br/>cada hora"]
    end
    T1 -.->|npm run start| SRV
    T2 -.->|lee registros| DB
    T2 -.->|web-push con VAPID| PUSH["📲 Servicio push<br/>del navegador"]
    PUSH -.-> SW
    SW -.-> U
```

## 2. Flujo de una foto de comida

Lo mismo sirve para **Describir con IA** y **Escanear código**, cambiando solo la ruta y la fuente de datos.

```mermaid
sequenceDiagram
    actor U as Tú
    participant UI as Pulse (navegador)
    participant F as /api/foto
    participant C as Claude Code CLI
    participant DB as gym.db

    U->>UI: Tomar foto de la comida
    UI->>F: POST imagen (multipart)
    F->>F: valida tipo, tamaño y firma del archivo
    F->>C: prompt + archivo temporal (herramienta Read)
    C-->>F: JSON con nombre, tipo, kcal y macros
    F->>F: borra el archivo temporal
    F-->>UI: borrador de comida
    UI->>U: formulario prellenado
    U->>UI: Guardar
    UI->>DB: /api/comidas guarda la comida
```

## 3. Flujo del Coach

```mermaid
sequenceDiagram
    actor U as Tú
    participant UI as Pantalla Coach
    participant R as /api/coach
    participant DB as gym.db
    participant C as Claude Code CLI (Sonnet)

    U->>UI: Analizar mi progreso
    UI->>R: POST fecha
    R->>DB: series, comidas, peso, sueño, agua (30 días)
    DB-->>R: indicadores (KPI)
    R->>C: prompt con los indicadores como datos
    C-->>R: JSON: resumen, fortalezas, mejoras, pasos
    R-->>UI: KPI + análisis
    UI->>U: tarjetas con el resultado
```

## 4. Modelo de datos

```mermaid
erDiagram
    RUTINAS ||--o{ RUTINA_EJERCICIOS : "tiene"
    RUTINAS ||--o| CICLO : "próxima sesión"
    RUTINA_EJERCICIOS }o..o{ SERIES : "se registra por nombre"
    COMIDAS }o..o{ ALIMENTOS_FRECUENTES : "favoritos por nombre"
    PUSH_SUSCRIPCIONES ||--o{ AVISOS_ENVIADOS : "avisos del día"

    RUTINAS {
        int id PK
        text nombre
        text dias
        int activa
    }
    RUTINA_EJERCICIOS {
        int id PK
        int rutina_id FK
        int dia
        text nombre
        int series
        text repeticiones
        int descanso
    }
    CICLO {
        int id PK
        int rutina_siguiente_id FK
    }
    SERIES {
        int id PK
        text fecha
        text sesion
        text ejercicio
        text repeticiones
        real peso
        real peso_base
        real peso_extra
        text notas
    }
    COMIDAS {
        int id PK
        text fecha
        text nombre
        real calorias
        real proteina
    }
    ALIMENTOS_FRECUENTES {
        int id PK
        text nombre
        real calorias
    }
    SUENO {
        text fecha PK
        real horas
    }
    PESO_CORPORAL {
        text fecha PK
        real kg
    }
    HABITOS {
        text fecha PK
        int vasos
    }
    PERFIL {
        int id PK
        real estatura_cm
    }
    PLAN_SEMANAL {
        int dia PK
        int activo
    }
    PUSH_SUSCRIPCIONES {
        text endpoint PK
        text p256dh
        text auth
    }
    AVISOS_ENVIADOS {
        text fecha PK
        text tipo PK
    }
```

## 5. Mapa de pantallas y rutas

La barra inferior del celular y la barra lateral del PC llevan a las pantallas principales. Captura de comida no tiene enlace en la barra: se abre con el botón **+**, que aparece en celular y en PC.

```mermaid
flowchart TD
    INICIO["/ Inicio<br/>tira de la semana"]
    ENTRENAR["/entrenamiento<br/>Empezar rutina"]
    NUTRICION["/nutricion"]
    PROGRESO["/progreso"]
    CALENDARIO["/calendario"]
    COACH["/coach<br/>análisis con Claude"]
    CAPTURA["/captura<br/>Tomar foto · Galería · Describir · Código · Favorito"]
    DESCRIBIR["/captura/describir"]
    CODIGO["/captura/codigo"]
    MAS["+ flotante<br/>(celular y PC)"]
    CAMARA["Botón central del celular<br/>(Coach)"]

    INICIO -->|día de la tira| CALENDARIO
    INICIO --> ENTRENAR
    ENTRENAR --> NUTRICION
    MAS --> CAPTURA
    CAPTURA --> DESCRIBIR
    CAPTURA --> CODIGO
    CAMARA --> COACH
    COACH -->|Ver progreso| PROGRESO
```

## 6. Sesión de entrenamiento (modo guiado)

```mermaid
stateDiagram-v2
    [*] --> Inicio: Empezar rutina
    Inicio --> Ejercicio: primer ejercicio sin completar
    Ejercicio --> Descanso: Completar ejercicio
    Descanso --> Ejercicio: termina el cronómetro<br/>o Saltar descanso
    Ejercicio --> Lista: Ver lista completa
    Lista --> Ejercicio: Volver al modo guiado
    Ejercicio --> Final: último ejercicio completado
    Final --> Guardado: Finalizar sesión
    Guardado --> [*]
```

## 7. Dónde vive cada cosa

| Pieza | Ruta en el proyecto |
| --- | --- |
| Pantallas y componentes | `src/app/`, `src/app/_components/pulse-dashboard.js`, `routine-builder.js`, `meal-form.js` |
| API | `src/app/api/*/route.js` |
| Acceso y sesión | `src/proxy.js`, `src/lib/sesion.js`, `src/app/acceso/` |
| Base de datos | `src/lib/db.js` (crea las tablas), archivo `gym.db` |
| Claude Code | `src/lib/comida-ia.js` (lanza el CLI) |
| Progresión de peso | `src/lib/progresion.js` |
| PWA y avisos | `src/app/sw.js`, `src/app/manifest.js`, `scripts/avisos.mjs` |
| Textos y reglas de validación | `src/lib/validacion.js`, `src/lib/plan.js`, `src/lib/exercise-library.js` |
