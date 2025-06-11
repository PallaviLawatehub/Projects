import { Routes } from '@angular/router';
import { inject } from '@angular/core';

import { TaskListComponent } from './components/task-list.component';
import { TaskFormComponent } from './components/task-form.component';
import { AboutTaskManagerComponent } from './components/about-task-manager.component';
import { TaskSummaryComponent } from './components/task-summary.component';
import { DashboardComponent } from './components/dashboard.component';
import { LoginComponent } from './components/login.component';
import { TaskListViewComponent } from './components/task-list-view.component';
import { UserManagementComponent } from './components/user-management.component';
import { TaskSettingsComponent } from './components/task-settings.component';
import { AuthService } from './services/auth.service';

// Admin guard function to protect routes
const adminGuard = () => {
  const authService = inject(AuthService);
  if (authService.isAdmin()) {
    return true;
  }
  // Redirect to home page if not admin
  return { path: '/' };
};

export const routes: Routes = [
  { path: '', component: TaskListComponent },
  { path: 'login', component: LoginComponent },
  { path: 'add', component: TaskFormComponent },
  { path: 'about', component: AboutTaskManagerComponent },
  { path: 'summary', component: TaskSummaryComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'list-view', component: TaskListViewComponent },
  { path: 'settings', component: TaskSettingsComponent },
  { 
    path: 'users', 
    component: UserManagementComponent,
    canActivate: [() => adminGuard()]
  },
];
