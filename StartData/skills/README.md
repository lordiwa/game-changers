# GamerAlliance — Skills

Esta carpeta contiene los **4 skills combinados** que cubren el runtime operativo del producto Gamer Wellness. Reemplazan los 10 agentes específicos previos (que vivían en `projects/gamer-alliance/agents/` antes de la refactorización del 2026-04-27).

## Filosofía

- **Agentes genéricos** (`agents/` en la raíz del repo) = fase de diseño/análisis (intake → expert analysis). Son los 6 agentes del pipeline: business-analyst, architect, product-ux, project-manager, research-analyst, security-compliance.
- **Skills combinados** (esta carpeta) = runtime operativo del producto, agrupados por dominio funcional, no por rol granular.

Los 10 agentes anteriores creaban solapamientos (ej. `compliance-watcher` vs `security-compliance`, `onboarding-wizard` vs `product-ux`) y forzaban coordinación para tareas naturalmente integradas. La nueva estructura agrupa por dominio operativo cohesivo.

## Skills disponibles

| Skill | Dominio | Reemplaza a los agentes |
|-------|---------|--------------------------|
| [`community-ops.md`](community-ops.md) | Onboarding, eventos, coaching de líderes | onboarding-wizard + event-planner + club-coach |
| [`content-engine.md`](content-engine.md) | Creación, SEO/growth, traducción | contenido-gg + growth-hacker + traductor-gg |
| [`trust-safety.md`](trust-safety.md) | Moderación, compliance LOPDP, reportes B2B | guardian-bot + compliance-watcher + partner-pulse |
| [`challenge-framework.md`](challenge-framework.md) | Diseño de challenges gamificados | desafio-master (stand-alone, no se fusionó) |

## Cómo se invocan

Cada skill es un archivo Markdown con frontmatter (`name`, `description`, `model`, `tools`). Se invocan desde Claude Code o desde el pipeline orquestador igual que `skills/update-knowledge.md` (skill global del pipeline).

Para tareas que cruzan dominios (ej. lanzar un challenge nuevo), invocar varios skills:
1. `challenge-framework` define el spec
2. `content-engine` produce el copy ES/EN
3. `community-ops` lo promueve y conecta a eventos
4. `trust-safety` valida que los datos del challenge no rompan k-anonimidad en reportes B2B

## Notas de migración (2026-04-27)

- **Decisión**: pasar de 10 agentes específicos → 4 skills combinados, mantener los 6 agentes genéricos del repo.
- **Alcance actual**: solo GamerAlliance. Si el patrón se valida, se replicará a `virtual-stage` y futuros proyectos.
- **Outputs históricos** (`projects/gamer-alliance/output/expert-*.md`) no se modifican — son artefactos del pipeline ya ejecutado.
- Para consultar el contenido original de los agentes eliminados, usar `git log -- projects/gamer-alliance/agents/`.
