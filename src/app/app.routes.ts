import { Routes } from '@angular/router';
import { Layout } from './layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      {
        path: '',
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'collections',
        loadComponent: () => import('./collections/collections').then((m) => m.Collections),
      },
      {
        path: 'chat',
        loadComponent: () => import('./chat/chat').then((m) => m.Chat),
      },
    ],
  },
];
