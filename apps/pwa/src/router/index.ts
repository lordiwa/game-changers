import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

// Phase 2 Step 0 ships an empty route table — downstream plans add /me, /events,
// /challenges, /consent, /crisis, etc.
const routes: RouteRecordRaw[] = [];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
