import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'FormFlow Studio — Visual Angular Form Builder',
    loadComponent: () =>
      import('./features/dashboard/dashboard.page').then((module) => module.DashboardPage),
  },
  {
    path: 'templates',
    title: 'Templates — FormFlow Studio',
    loadComponent: () =>
      import('./features/templates/templates.page').then((module) => module.TemplatesPage),
  },
  {
    path: 'builder/:id',
    title: 'Builder — FormFlow Studio',
    loadComponent: () =>
      import('./features/builder/builder.page').then((module) => module.BuilderPage),
  },
  { path: '**', redirectTo: '' },
];
