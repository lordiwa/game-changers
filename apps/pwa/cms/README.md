# CMS Workflow — GameChangers Content Hub

Articles are authored as Markdown files committed to this directory. A build-time script
(`scripts/cms-publish.ts`) reads the files, writes them to Firestore, and exports a static
snapshot for pre-rendering.

## Directory structure

```
apps/pwa/cms/
  sample-content/
    movimiento-stretching-gamer.es.md   ← Spanish (authoritative)
    movimiento-stretching-gamer.en.md   ← English (legally equivalent translation)
    mente-burnout-en-rankeds.es.md
    mente-burnout-en-rankeds.en.md
    quiz-estres.es.md
    quiz-estres.en.md
  README.md                             ← this file
```

## Frontmatter schema

Every `.es.md` file must include a YAML frontmatter block:

```yaml
---
id: movimiento-stretching-gamer        # unique slug (also used as Firestore doc ID)
title:
  es: "Stretching para gamers: 5 minutos entre partidas"
  en: "Stretching for gamers: 5 minutes between matches"
slug:
  es: movimiento-stretching-gamer
  en: movimiento-stretching-gamer
pillar: movimiento                     # movimiento | mente | nutricion | comunidad | data
contentType: article                   # article | video | quiz
gameClusters:                          # free-fire | dota | minecraft | lol | valorant | general
  - free-fire
  - general
estReadMinutes: 5
authorName: "GameChangers Team"
status: published                      # draft | published | archived
coverImage: ""                         # optional CDN URL
embeddedMedia:                         # optional, for video contentType
  provider: youtube
  videoId: PLACEHOLDER
# assessment:                          # required for contentType: quiz
#   schema:
#     type: pss4
#     questions: [...]
#     scoring:
#       low:  { range: [0, 5],  message_es: "...", message_en: "..." }
#       moderate: { range: [6, 9],  message_es: "...", message_en: "..." }
#       high: { range: [10, 16], message_es: "...", message_en: "..." }
---
```

The `.en.md` file must carry the same frontmatter `id` but its body is the English translation.
The `cms-publish.ts` script reads `body.es` from the `.es.md` file and `body.en` from the `.en.md`.

## Publishing workflow

```bash
# 1. Write or edit a Markdown file in apps/pwa/cms/sample-content/
# 2. Run the publish script (requires GOOGLE_APPLICATION_CREDENTIALS or firebase login):
pnpm cms:publish

# The script:
#   - Reads all *.es.md files
#   - Merges the matching *.en.md body
#   - Writes each article to Firestore /content/{id}
#   - Exports apps/pwa/src/cms/snapshot.json (used by vite build for static pre-render)

# 3. Commit the snapshot.json alongside the Markdown sources:
git add apps/pwa/cms/ apps/pwa/src/cms/snapshot.json
git commit -m "content: add/update article <id>"

# 4. Deploy (CI picks up the commit and runs pnpm build + firebase deploy):
firebase deploy --only hosting
```

## Idempotency

Running `pnpm cms:publish` multiple times is safe. The script uses the article `id` as the
Firestore document ID, so re-running updates the document in-place. The `publishedAt` field
is set only on the first write; subsequent runs update `updatedAt` only.

## Audit trail

git history of `apps/pwa/cms/` provides a full editorial audit trail. Each article version
is traceable to its commit (T-02-06-06: accepted risk per threat model).

## LOPDP note

Article bodies are public content — no personal data is stored in `/content/{id}` documents.
Assessment schemas embedded in `quiz-estres.es.md` define question text only; user answers
are stored in the private `/users/{uid}/wellnessAssessments/{id}` subcollection, never in
the public `/content` collection.
