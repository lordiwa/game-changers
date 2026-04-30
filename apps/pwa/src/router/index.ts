import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { getAuth } from 'firebase/auth';

// Plan 02-06 — Public content hub (no auth required; pre-rendered for SEO).
const ContentHub = () => import('../views/content/ContentHub.vue');
const ContentCategory = () => import('../views/content/ContentCategory.vue');
const ContentArticle = () => import('../views/content/ContentArticle.vue');
const WellnessAssessmentRoute = () => import('../views/content/WellnessAssessment.vue');

// Lazy-load auth views so the router chunk is split from the main bundle.
const Boot = () => import('../views/auth/Boot.vue');
const SignIn = () => import('../views/auth/SignIn.vue');
const SignUp = () => import('../views/auth/SignUp.vue');
const PasswordReset = () => import('../views/auth/PasswordReset.vue');
const AgeGate = () => import('../views/auth/AgeGate.vue');
const DiscordInit = () => import('../views/auth/DiscordInit.vue');
const DiscordCallback = () => import('../views/auth/DiscordCallback.vue');

// Plan 02-04 — Consent funnel layers (lazy-loaded; only shown at value moments).
const Layer0 = () => import('../views/consent/Layer0.vue');
const Layer1 = () => import('../views/consent/Layer1.vue');
const Layer2 = () => import('../views/consent/Layer2.vue');
const Layer3 = () => import('../views/consent/Layer3.vue');
// Layer4 is not a funnel route — only accessible from /me/consent settings page.
// Plan 02-04 — Consent management views.
const ConsentSettings = () => import('../views/consent/ConsentSettings.vue');
const ConsentHistory = () => import('../views/consent/ConsentHistory.vue');
const DataExport = () => import('../views/consent/DataExport.vue');
const AccountDeletion = () => import('../views/consent/AccountDeletion.vue');

// Plan 02-05 — Profile + gamification views.
const Me = () => import('../views/me/Me.vue');
const CharacterSheet = () => import('../views/me/CharacterSheet.vue');
const Profile = () => import('../views/me/Profile.vue');
const Badges = () => import('../views/me/Badges.vue');
const PublicProfile = () => import('../views/u/PublicProfile.vue');

// Route meta type extension.
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;   // requires any auth (anon is ok unless requiresFullAuth)
    requiresFullAuth?: boolean; // requires non-anonymous user
    requiresAge?: boolean;    // requires ageVerified custom claim
  }
}

const routes: RouteRecordRaw[] = [
  // Plan 02-06 — Public content hub (unauthenticated access allowed; pre-rendered for SEO).
  // /contenido is the canonical Spanish URL; /content is an alias.
  {
    path: '/contenido',
    alias: '/content',
    component: ContentHub,
    // No auth meta — public route
  },
  {
    path: '/contenido/categoria/:cat',
    alias: '/content/categoria/:cat',
    component: ContentCategory,
    // No auth meta — public route
  },
  {
    path: '/contenido/:slug',
    alias: '/content/article/:slug',
    component: ContentArticle,
    // No auth meta — public route
  },
  {
    path: '/quiz/:id',
    component: WellnessAssessmentRoute,
    // Consent gate enforced inside component (health_self_reports)
  },

  // Default landing — Boot (anonymous auth sufficient; expanded in Plan 05).
  {
    path: '/',
    component: Boot,
    meta: { requiresAuth: true },
  },
  // Auth surfaces.
  {
    path: '/auth/signin',
    component: SignIn,
  },
  {
    path: '/auth/signup',
    component: SignUp,
  },
  {
    path: '/auth/reset',
    component: PasswordReset,
  },
  {
    path: '/auth/age-gate',
    component: AgeGate,
    meta: { requiresAuth: true },
  },
  // Discord OAuth routes — anonymous auth covers the gap (anonymous session exists
  // from boot; these routes are accessible immediately after the bot /link command).
  {
    path: '/auth/discord/init',
    component: DiscordInit,
  },
  {
    path: '/auth/discord/callback',
    component: DiscordCallback,
  },
  // Plan 02-05 — Profile + gamification routes.
  {
    path: '/me',
    component: Me,
    meta: { requiresAuth: true, requiresFullAuth: true, requiresAge: true },
  },
  {
    path: '/me/character',
    component: CharacterSheet,
    meta: { requiresAuth: true, requiresFullAuth: true, requiresAge: true },
  },
  {
    path: '/me/profile',
    component: Profile,
    meta: { requiresAuth: true, requiresFullAuth: true, requiresAge: true },
  },
  {
    path: '/me/badges',
    component: Badges,
    meta: { requiresAuth: true, requiresFullAuth: true, requiresAge: true },
  },
  {
    path: '/u/:uid',
    component: PublicProfile,
    // Public profile is readable by all (incl. anonymous); privacy enforced in component + Rules
  },
  // Plan 02-04 — Progressive consent funnel layers.
  // Layer 0: basic_profile — shown immediately after age gate or anon→email upgrade.
  {
    path: '/consent/layer-0',
    component: Layer0,
    meta: { requiresAuth: true, requiresAge: true },
  },
  // Layer 1: event_participation + gaming_habits — shown before first event RSVP or challenge.
  {
    path: '/consent/layer-1',
    component: Layer1,
    meta: { requiresAuth: true, requiresFullAuth: true, requiresAge: true },
  },
  // Layer 2: health_self_reports — shown before first manual health log or challenge enrollment.
  {
    path: '/consent/layer-2',
    component: Layer2,
    meta: { requiresAuth: true, requiresFullAuth: true, requiresAge: true },
  },
  // Layer 3: wearable_data — shown from /me/wearables when connecting a device.
  {
    path: '/consent/layer-3',
    component: Layer3,
    meta: { requiresAuth: true, requiresFullAuth: true, requiresAge: true },
  },
  // Plan 02-04 — Consent management views (all require full auth + age verification).
  {
    path: '/me/consent',
    component: ConsentSettings,
    meta: { requiresAuth: true, requiresFullAuth: true, requiresAge: true },
  },
  {
    path: '/me/consent/history',
    component: ConsentHistory,
    meta: { requiresAuth: true, requiresFullAuth: true, requiresAge: true },
  },
  {
    path: '/me/consent/dsar',
    component: DataExport,
    meta: { requiresAuth: true, requiresFullAuth: true, requiresAge: true },
  },
  {
    path: '/me/consent/erase',
    component: AccountDeletion,
    meta: { requiresAuth: true, requiresFullAuth: true, requiresAge: true },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard: enforce auth requirements.
router.beforeEach(async (to) => {
  const auth = getAuth();
  const user = auth.currentUser;

  // Not authenticated AND route requires any auth → go to sign-in.
  if (to.meta.requiresAuth && !user) {
    return { path: '/auth/signin' };
  }

  // Authenticated but anonymous AND route requires full (non-anonymous) auth.
  if (to.meta.requiresFullAuth && user?.isAnonymous) {
    return { path: '/auth/signup' };
  }

  // Route requires age verification — check custom claims.
  if (to.meta.requiresAge && user) {
    const idTokenResult = await user.getIdTokenResult();
    if (!idTokenResult.claims['ageVerified']) {
      return { path: '/auth/age-gate' };
    }
  }
});
