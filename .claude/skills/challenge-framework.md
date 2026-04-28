---
name: challenge-framework
description: Skill operativo de gamificación — diseña challenges wellness con narrativa gaming auténtica, calibrados a tres tiers (Bronce/Plata/Oro). Absorbe desafio-master.
model: sonnet
tools:
  - Read
  - Write
  - WebSearch
  - WebFetch
---

# Challenge Framework — Diseño de Challenges Gamificados

Skill stand-alone para diseñar challenges de wellness que se sientan auténticos a la cultura gamer — no programas corporativos de wellness con pintura de gaming. Este skill no se fusiona con los demás porque su dominio es decisión de diseño de producto (qué challenge correr, qué narrativa, qué tier), no operación de comunidad ni contenido editorial. Sin embargo, sus outputs alimentan a `community-ops` (para promoción) y a `content-engine` (para copy).

## Cuándo invocarlo

- Diseñar el roster semanal/mensual de challenges
- Calibrar tiers Bronce/Plata/Oro con datos de la comunidad
- Crear seasonal events estilo battle-pass
- Mapear equivalencias gaming (distancias en mapas, BPM en clutch, etc.)
- Ajustar dificultad de challenges futuros con base en completion rates
- Definir reglas anti-cheat para datos sospechosos

## Tipos de challenge

| Tipo | Ejemplo | Métrica |
|------|---------|---------|
| Movement | "Recorre la distancia de Summoner's Rift" | Pasos/km |
| Streak | "7 días sin saltarte el desayuno" | Check-in diario |
| Social | "Asiste a 3 eventos este mes" | Asistencia |
| Mental | "5 minutos de respiración antes de cada ranked" | Self-report |
| Hybrid | "Camina 10K pasos + asiste a un meetup" | Pasos + asistencia |

## Calibración de tiers

| Tier | Target | Audiencia |
|------|--------|-----------|
| Bronce | Alcanzable para gamer sedentario (~15K pasos/semana) | Casual, primeras veces |
| Plata | Esfuerzo moderado (~35K pasos/semana) | Miembros activos |
| Oro | Ambicioso (~60K pasos/semana) | Competitivos buscando reto |

## Estilo narrativo

Usar contexto gaming concreto:
- "Caminaste 4.2km — equivalente a cruzar el mapa de Summoner's Rift 47 veces"
- "Tu frecuencia cardíaca fue 145 bpm — la misma que un pro en clutch round"
- "Completaste un streak de 7 días — eso es como mantener una win streak en ranked"

## Anti-patterns

- NO "spin the wheel" o "collect stars" — gamers detectan fake gamification
- NO pay-to-win — premium nunca da ventajas en XP
- NO shaming por no completar — framing "next time", nunca "you failed"
- Anti-cheat: flag de datos irreales (>100K pasos/día, BPM imposibles, geolocalización inconsistente)

## Workflow típico

1. Leer histórico de completion rates en `output/challenge-framework/history/`
2. Identificar gaps temáticos (ej. faltan challenges Mental este mes)
3. Diseñar challenge con: tipo, narrativa, métrica, tier targets, ventana temporal
4. Validar tiers contra datos reales de la comunidad (no asumir)
5. Definir reglas anti-cheat específicas para esa métrica
6. Pasar a `content-engine` para copy ES y a `community-ops` para promoción/eventos asociados
7. Guardar spec en `projects/gamer-alliance/output/challenge-framework/{YYYY-MM}-{slug}.md`
8. Post-challenge: registrar completion rate y ajustar la siguiente calibración

## Integraciones con agentes genéricos y otros skills

- **`agents/product-ux.md`**: define personas y feature matrix. Challenge Framework diseña dentro de ese contrato.
- **`agents/business-analyst.md`**: define KPIs (engagement, retention) que los challenges deben mover.
- **`skills/content-engine.md`** (sibling): produce el copy bilingual final del challenge.
- **`skills/community-ops.md`** (sibling): promueve y opera challenges sociales (eventos vinculados).
- **`skills/trust-safety.md`** (sibling): valida que los datos del challenge no exponen información individual en reportes B2B.

## Outputs típicos

- Spec de challenge: tipo, narrativa, métricas, tier targets, anti-cheat rules
- Calendario seasonal estilo battle-pass
- Reportes de completion rate y recalibración propuesta
- Tabla de equivalencias gaming actualizada (distancias, BPM, etc.)
