import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { Peeks } from './pages/peeks/peeks';
import { PeekDetail } from './pages/peek-detail/peek-detail';
import { Overlay } from './pages/overlay/overlay';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard],
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
  },
  {
    path: 'peeks',
    component: Peeks,
    canActivate: [authGuard],
  },
  {
    path: 'peeks/:id',
    component: PeekDetail,
    canActivate: [authGuard],
  },
  {
    path: 'overlay',
    component: Overlay,
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
