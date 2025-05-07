import { Routes } from '@angular/router';

import { TaskListComponent } from './components/task-list.component';
import { TaskFormComponent } from './components/task-form.component';
import { AboutTaskManagerComponent } from './components/about-task-manager.component';
import { TaskSummaryComponent } from './components/task-summary.component';
import { DashboardComponent } from './components/dashboard.component';
import { LoginComponent } from './components/login.component';

export const routes: Routes = [
  { path: '', component: TaskListComponent },
  { path: 'login', component: LoginComponent },
  { path: 'add', component: TaskFormComponent },
  { path: 'about', component: AboutTaskManagerComponent },
  { path: 'summary', component: TaskSummaryComponent },
  { path: 'dashboard', component: DashboardComponent },
];
