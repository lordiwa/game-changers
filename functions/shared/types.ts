// Re-export the canonical types from the workspace-wide shared package so
// Cloud Functions can pull a single source of truth. Plan 04 expands this
// surface as consent and audit-log types stabilize.
export type { ConsentCategory, ConsentDoc } from '@gamechangers/shared';
export {
  ConsentCategorySchema,
  ConsentDocSchema,
} from '@gamechangers/shared';
