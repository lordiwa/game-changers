# GamerAlliance — Bootstrap Guide

> **Para humanos y para IAs**: este README es la guía de auto-despliegue del proyecto. Una IA con Claude Code (o un humano) debe poder seguir estos pasos secuencialmente y dejar el entorno listo para empezar a trabajar sobre Gamer Wellness.

---

## 0. Contexto rápido

- **Producto**: Gamer Wellness — primera comunidad LATAM gaming + bienestar (físico, mental, social). Lanzamiento Ecuador, escalado a LATAM (372M gamers).
- **Stack**: Vue 3 (Composition API + Vite) + Firebase (Cloud Functions, Firestore, Auth, Storage, Hosting). Discord como community-only (TOS prohíbe data collection ahí).
- **Compliance crítico**: LOPDP Ecuador — DPO + DPIA antes de cualquier recolección de datos de salud. K-anonimidad k≥50 en exports B2B.
- **Documentación canónica**: ver `output/project-definition.md` (síntesis final) y `output/expert-*.md` (análisis por experto).

---

## 1. Estructura del proyecto

```
projects/gamer-alliance/
├── README.md                        ← este archivo (bootstrap)
├── skills/                          ← 4 skills operativos del producto
│   ├── README.md                    ← mapa de migración de agentes → skills
│   ├── community-ops.md             ← onboarding + eventos + coaching
│   ├── content-engine.md            ← contenido + SEO + traducción
│   ├── trust-safety.md              ← moderación + LOPDP + reportes B2B
│   └── challenge-framework.md       ← diseño de challenges gamificados
└── output/                          ← artefactos del pipeline ya ejecutado
    ├── intake.md
    ├── gaming-wellness-latam-brief.md
    ├── expert-business-analyst.md
    ├── expert-research-analyst.md
    ├── expert-product-ux.md
    ├── expert-architect.md
    ├── expert-security-compliance.md
    ├── expert-project-manager.md
    ├── project-definition.md
    └── pipeline-state.md
```

**Importante**: este proyecto **NO contiene agentes locales**. Los 6 agentes genéricos (business-analyst, architect, product-ux, project-manager, research-analyst, security-compliance) viven en la raíz del repo (`agents/`) y son compartidos por todos los proyectos. Lo único específico de Gamer Wellness son los 4 skills en `skills/`.

---

## 2. Pre-requisitos (verificar antes de desplegar)

| Herramienta | Cómo verificar | Si falta |
|---|---|---|
| Claude Code CLI | `claude --version` | Instalar: https://claude.com/claude-code |
| Node.js ≥ 20 | `node --version` | Instalar desde nodejs.org o nvm |
| Git | `git --version` | Instalar git |
| Firebase CLI | `firebase --version` | `npm install -g firebase-tools` |
| Vue CLI / Vite scaffolder | (opcional) `npm create vue@latest --help` | Se invoca con `npm create` |

---

## 3. Despliegue paso a paso (orden estricto)

### Paso 3.1 — Instalar plugins de Claude Code

**GSD (Get Shit Done)** — workflow spec-driven con slash commands (`/gsd-new-project`, `/gsd-plan-phase`, `/gsd-execute-phase`, etc.).

```bash
# Desde Claude Code (interactivo):
/plugin install gsd

# Verificar:
/gsd-help
```

Si GSD ya está instalado globalmente (es el caso del usuario actual, v1.34.2), saltar este paso.

### Paso 3.2 — Configurar MCP servers

Editar (o crear) `.claude/settings.json` en la raíz del repo y añadir los MCPs necesarios para este proyecto:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "firebase": {
      "command": "npx",
      "args": ["-y", "firebase-tools", "experimental:mcp"]
    },
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": { "FIRECRAWL_API_KEY": "${FIRECRAWL_API_KEY}" }
    }
  }
}
```

**MCPs justificados para este proyecto**:
- **context7** — docs actualizadas de Vue 3, Firebase, Discord.js, Pinia (los skills `content-engine` y `community-ops` los necesitan).
- **firebase** — leer/escribir Firestore, deploy Functions, Auth (todos los skills tocan Firebase).
- **firecrawl** — scraping para `content-engine` (research SEO, competitive content).

Ejecutar después: `claude mcp list` para verificar que carguen.

### Paso 3.3 — Registrar agentes y skills en Claude Code

Claude Code descubre agentes en `.claude/agents/` y skills en `.claude/skills/` (a nivel proyecto) o `~/.claude/agents` y `~/.claude/skills` (global).

Para este repo, crear los enlaces a nivel proyecto:

```bash
# Desde la raíz del repo
mkdir -p .claude/agents .claude/skills

# Linkear los 6 agentes genéricos del repo a Claude Code
for f in agents/*.md; do
  cp "$f" ".claude/agents/$(basename $f)"
done

# Linkear el skill global del pipeline
cp skills/update-knowledge.md .claude/skills/update-knowledge.md

# Linkear los 4 skills operativos de Gamer Wellness
for f in projects/gamer-alliance/skills/*.md; do
  [ "$(basename $f)" = "README.md" ] && continue
  cp "$f" ".claude/skills/$(basename $f)"
done
```

**Alternativa (Windows / sin bash)**:
```powershell
New-Item -ItemType Directory -Force -Path .claude\agents, .claude\skills
Get-ChildItem agents\*.md | Copy-Item -Destination .claude\agents\
Copy-Item skills\update-knowledge.md .claude\skills\
Get-ChildItem projects\gamer-alliance\skills\*.md -Exclude README.md | Copy-Item -Destination .claude\skills\
```

Reiniciar Claude Code después: los agentes aparecen invocables vía `Agent` tool y los skills vía `/community-ops`, `/content-engine`, `/trust-safety`, `/challenge-framework`, `/update-knowledge`.

### Paso 3.4 — Inicializar el proyecto GSD

Si vas a empezar implementación (no solo planning), ejecutar:

```bash
# Desde Claude Code:
/gsd-new-project
```

Cuando pregunte por el contexto, apuntar al output existente:
- Visión y problema → `projects/gamer-alliance/output/intake.md`
- Síntesis técnica → `projects/gamer-alliance/output/project-definition.md`
- Análisis por experto → `projects/gamer-alliance/output/expert-*.md`

Esto generará `.planning/PROJECT.md` y la roadmap inicial.

### Paso 3.5 — Variables de entorno

Crear `.env.local` en la raíz del repo (no commitear — añadir a `.gitignore`):

```env
# Firebase
FIREBASE_PROJECT_ID=gamer-wellness-prod
FIREBASE_API_KEY=<from Firebase Console>

# Discord
DISCORD_BOT_TOKEN=<from Discord Developer Portal>
DISCORD_CLIENT_ID=<from Discord Developer Portal>
DISCORD_GUILD_ID=<server ID>

# Wearables (Open Wearables — MIT)
OPEN_WEARABLES_WEBHOOK_SECRET=<generate>

# Optional: PostHog, Stripe, Firecrawl
POSTHOG_API_KEY=<optional>
STRIPE_SECRET_KEY=<optional>
FIRECRAWL_API_KEY=<for content-engine MCP>
```

---

## 4. Cómo trabajar después del bootstrap

### Para tareas operativas del producto (runtime)

Usar los slash commands de los skills:

| Tarea | Skill |
|---|---|
| Diseñar funnel onboarding, planear evento, soportar líder | `/community-ops` |
| Crear contenido bilingual, optimizar SEO, traducir | `/content-engine` |
| Auditar LOPDP, generar reporte B2B, moderar incidente | `/trust-safety` |
| Diseñar challenge gamificado | `/challenge-framework` |

### Para tareas de planning/análisis (fase de diseño)

Usar los agentes genéricos del repo:

| Tarea | Agente |
|---|---|
| Refinar requisitos, casos de uso | `agents/business-analyst.md` |
| Decisiones de arquitectura, tech stack | `agents/architect.md` |
| User journey, IA, feature prioritization | `agents/product-ux.md` |
| Threat model, LOPDP framework, compliance | `agents/security-compliance.md` |
| Market research, competitive analysis | `agents/research-analyst.md` |
| Roadmap, estimación, riesgos | `agents/project-manager.md` |

### Para implementar (con GSD)

```bash
/gsd-progress              # ver dónde está el proyecto
/gsd-next                  # avanzar al siguiente paso lógico
/gsd-discuss-phase         # discutir contexto antes de planear
/gsd-plan-phase            # crear PLAN.md detallado
/gsd-execute-phase         # ejecutar el plan con commits atómicos
```

Ver `/gsd-help` para el comando completo.

---

## 5. Checklist de verificación post-bootstrap

- [ ] `claude --version` ejecuta sin error
- [ ] `/gsd-help` muestra los comandos GSD
- [ ] `claude mcp list` muestra context7, firebase, firecrawl como conectados
- [ ] `.claude/agents/` contiene los 6 agentes genéricos
- [ ] `.claude/skills/` contiene update-knowledge + los 4 skills de gamer-alliance
- [ ] `/community-ops` (o cualquier otro skill) aparece como invocable
- [ ] `.env.local` tiene las variables Firebase + Discord como mínimo
- [ ] `firebase login` y `firebase use <project-id>` ejecutan sin error

Si todo lo anterior pasa, el entorno está listo. Empezar con `/gsd-progress` o leyendo `output/project-definition.md`.

---

## 6. Notas para futuras IAs que arranquen aquí

- **No dupliques agentes**. Los 6 genéricos viven en `agents/` (raíz). No los copies dentro de `projects/gamer-alliance/`.
- **Skills nuevos van en `projects/gamer-alliance/skills/`**, no en `skills/` raíz (que es para skills globales del pipeline).
- **Outputs históricos en `output/`** son artefactos congelados — no reescribirlos a menos que sea para reflejar una refactorización (como ocurrió con la sección 10 de `project-definition.md` el 2026-04-27).
- **Consultar siempre**:
  1. `output/project-definition.md` para visión/decisiones unificadas
  2. `skills/README.md` para entender la migración 10 agentes → 4 skills
  3. `output/expert-*.md` para profundidad por dominio
- **Tech stack no negociable**: Vue 3 + Firebase. No proponer React/NestJS/Supabase (decisión documentada en memoria del usuario y en `expert-architect.md`).
- **LOPDP first**: cualquier feature que toque datos de salud requiere validar contra `output/expert-security-compliance.md` antes de implementar.

---

## 7. Cómo reproducir esta estructura en proyectos futuros

Esta convención de bootstrap (skill-centric + README desplegable) aplica a todos los proyectos del repo. Para un proyecto nuevo:

1. Copiar `templates/project-bootstrap.md` (plantilla genérica) a `projects/{nuevo-proyecto}/README.md`.
2. Reemplazar placeholders (`{nombre}`, `{stack}`, `{MCPs}`, etc.).
3. Crear `projects/{nuevo-proyecto}/skills/` con los skills operativos del producto.
4. Reutilizar los 6 agentes genéricos de `agents/` — no duplicarlos.
