import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: 'appearance', component: () => import('pages/AppearancePage.vue') },
      { path: 'solve', component: () => import('pages/SolvePage.vue') },
      { path: 'generate', component: () => import('pages/GeneratePage.vue') },
      { path: '', redirect: 'generate' },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
