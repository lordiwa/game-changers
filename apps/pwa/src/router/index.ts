import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { getAuth } from 'firebase/auth';

// Lazy-load auth views so the router chunk is split from the main bundle.
const Boot = () => import('../views/auth/Boot.vue');
const SignIn = () => import('../views/auth/SignIn.vue');
const SignUp = () => import('../views/auth/SignUp.vue');
const PasswordReset = () => import('../views/auth/PasswordReset.vue');
const AgeGate = () => import('../views/auth/AgeGate.vue');
const DiscordInit = () => import('../views/auth/DiscordInit.vue');
const DiscordCallback = () => import('../views/auth/DiscordCallback.vue');

// Route meta type extension.
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;   // requires any auth (anon is ok unless requiresFullAuth)
    requiresFullAuth?: boolean; // requires non-anonymous user
    requiresAge?: boolean;    // requires ageVerified custom claim
  }
}

const routes: RouteRecordRaw[] = [
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
  // Plan 05 will add /me — placeholder redirect so age gate and discord callback work now.
  {
    path: '/me',
    redirect: '/',
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
