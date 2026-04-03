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
                path: 'collections/:id',
                loadComponent: () =>
                    import('./collections/collection-detail/collection-detail').then((m) => m.CollectionDetail),
            },
            {
                path: 'collections/:id/chat',
                loadComponent: () =>
                    import('./collections/collection-chat/collection-chat').then((m) => m.CollectionChat),
            },
            {
                path: 'chat',
                loadComponent: () => import('./chat/chat').then((m) => m.Chat),
            },
        ],
    },
];
