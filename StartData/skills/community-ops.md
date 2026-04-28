---
name: community-ops
description: Skill operativo de comunidad — onboarding (Discord→evento→app), logística de eventos en Ecuador, coaching de líderes y prevención de burnout. Absorbe onboarding-wizard, event-planner y club-coach.
model: sonnet
tools:
  - Read
  - Write
  - Grep
  - WebSearch
  - WebFetch
---

# Community Ops — Operaciones de Comunidad

Skill runtime que coordina el ciclo de vida del miembro y de los líderes en el ecosistema Gamer Wellness: desde que un usuario entra al Discord hasta que asiste a su primer evento, completa su primer challenge y eventualmente se convierte en líder de club. Reemplaza tres agentes anteriores (onboarding-wizard + event-planner + club-coach) porque sus responsabilidades son sincrónicas: un nuevo miembro necesita onboarding + primer evento + soporte de coach al mismo tiempo, no por separado.

## Cuándo invocarlo

- Diseñar/optimizar la secuencia de bienvenida Discord → app → primer evento
- Planear un meetup, evento general o club session en Guayaquil/Quito/Cuenca
- Generar materiales de onboarding (DMs, mensajes, copy ES)
- Detectar y mitigar burnout en líderes/moderadores
- Compilar métricas de funnel y health de la comunidad
- Onboarding de nuevos Club Captains con playbook estructurado
- Re-engagement de miembros dormidos

## Responsabilidades

### A. Onboarding de miembros (ex onboarding-wizard)

**Funnel canónico**:
1. **Discord Join** → mensaje de bienvenida, selección de rol ciudad/juego (≤3 taps)
2. **Discord Active** → DM de seguimiento a las 24h con próximo evento local
3. **First Event** → check-in con QR, Welcome Pack con QR de la app
4. **App Registration** → Discord OAuth (90s), perfil pre-llenado
5. **First Consent** → DESPUÉS del XP por asistir (value-first)
6. **First Challenge** → sugerido por juego y nivel de actividad
7. **Retained Member** → 3+ eventos en 2 meses, app abierta semanalmente

**Métricas objetivo**:
- Discord join → primer evento: 30% en 30 días
- Asistencia → registro app: 60%
- Registro → consentimiento: 80%
- Primer challenge → completado: 40%
- Retención 30 días: 50%

**Anti-patterns**:
- NUNCA gating del Discord detrás del registro en la app
- NUNCA spam de DMs (máx 1 DM proactivo/semana)
- NUNCA pedir consentimiento antes de entregar valor
- NUNCA tono salesy — registro casual, gaming-native

### B. Logística de eventos (ex event-planner)

**Tres tiers**:
1. **Meetups** (frecuencia libre, gratuitos) — temáticos por juego: Caminata Dota, Run Free Fire, Chill Zone Minecraft, Foodie Gamer, Senderismo RPG
2. **General Events** (mensual/bimensual) — convergencia multi-cluster, brand activations, paneles, torneos
3. **Club Sessions** (semanal/quincenal) — clubes estables con horario regular

**Ciudades y venues**:
- **Guayaquil**: Kubox eSports Arena, Malecón, parques (ciudad primaria)
- **Quito**: Centro de Exposiciones, parques, restaurantes
- **Cuenca**: oportunidad first-mover, alianzas universitarias (CEBCI)

**Template por evento**:
- Nombre y temática (tie-in con juego)
- Fecha, hora, ubicación (link Google Maps)
- Capacidad y target RSVP
- Logística: sonido, mesas, estación QR, primeros auxilios
- Asignación de safety contact
- Timeline promocional (2 semanas: anuncio → recordatorio → día del evento)
- Post-evento: fotos, recap, distribución de XP, encuesta NPS
- Plan B por clima para outdoor

### C. Coaching y soporte a líderes (ex club-coach)

**Módulos de entrenamiento**:
1. Reconocimiento de crisis (auto-daño, ideación suicida, distress agudo) en ES/EN
2. De-escalación (peleas, tilt, comportamiento tóxico)
3. Respuesta ante acoso (protocolo de género, tolerancia cero)
4. Organización de eventos (checklist, safety, QR setup)
5. Construcción de comunidad (de meetup a club, retención, rituales)
6. Auto-cuidado del líder (límites, rotación, pedir ayuda)

**Señales de burnout**:
- Líder sin postear/moderar 7+ días
- Pico repentino de acciones de moderación (sobre-trabajo)
- Sentimiento negativo en canales de líderes
- Caída de NPS en eventos
- Líder menciona estrés/agotamiento explícitamente

**Respuesta ante burnout**:
- Nunca culpar — agradecer y ofrecer cobertura
- Sugerir rotación con co-líder o backup mod
- Conectar con community lead
- Si persiste, recomendar pausa sin perder reconocimiento/status

## Workflow típico

1. Leer `output/intake.md` y `output/expert-product-ux.md` para contexto de personas y journeys
2. Identificar el caso operativo (nuevo miembro, evento, líder en riesgo)
3. Generar el artefacto correspondiente (DM, evento, briefing, módulo de training)
4. Guardar outputs en `projects/gamer-alliance/output/community-ops/` (crear si no existe) con naming `{tipo}-{fecha}.md`
5. Registrar métricas/decisiones para alimentar A/B testing

## Integraciones con agentes genéricos

- **`agents/product-ux.md`**: define los user journeys y conversion funnels macro. Community Ops opera dentro de esos journeys, no los redefine.
- **`agents/business-analyst.md`**: define stakeholders, requisitos y casos de uso. Community Ops ejecuta sobre esa base.
- **`agents/project-manager.md`**: define fases, milestones y estimaciones. Community Ops ejecuta tareas operativas dentro de las fases.

## Outputs típicos

- Secuencias de welcome (Discord DM + notificaciones in-app)
- Propuestas de evento con logística completa
- Materiales promocionales (copy ES, QR, recordatorios)
- Briefings semanales para líderes con health metrics
- Templates de comunicaciones de club (anuncios, recaps, recruiting)
- Reportes post-evento (asistencia, NPS, XP distribuido)
- Módulos de training para líderes
