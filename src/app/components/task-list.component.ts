import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Task, User } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { TaskFilterComponent } from './task-filter.component';
import { TaskDialogComponent } from './task-dialog.component';
import { SubtaskDialogComponent } from './subtask-dialog.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskFilterComponent, TaskDialogComponent, SubtaskDialogComponent],
  template: `
    <div class="task-board">
      <!-- Fixed header section that doesn't scroll -->
      <div class="fixed-header-section">
        <div class="board-header">
          <div class="board-title">
            <h2>Task Board</h2>
            <div *ngIf="currentUser" class="user-info">
              <span class="user-avatar">{{ currentUser.name.charAt(0) }}</span>
              <span class="user-name">{{ currentUser.name }}</span>
              <span class="user-role">{{ currentUser.role | titlecase }}</span>
              <button (click)="logout()" class="logout-btn">Logout</button>
            </div>
          </div>
          <div class="board-actions">           
            <button (click)="openCreateTaskDialog()" class="add-task-btn">Add Task</button>
          </div>
        </div>
        
        <!-- Task Filter Component - Fixed in header section -->
        <div class="filter-section">
          <app-task-filter (filtersChanged)="applyFilters($event)"></app-task-filter>
        </div>
      </div>
      
      <!-- Scrollable content section -->
      <div class="scrollable-content">
        <!-- Kanban Board View -->
        <div class="board-columns" *ngIf="viewMode === 'kanban'">
        <!-- Pending Column -->
        <div class="column pending-column">
          <div class="column-header">
            <h3>Pending</h3>
            <span class="task-count">{{ getTasksByStatus('pending').length }}</span>
          </div>
          <div class="column-content">
            <div class="task-card" *ngFor="let task of getTasksByStatus('pending')" (click)="this.selectedTask = (this.selectedTask && this.selectedTask.id === task.id) ? null : task" [class.selected]="selectedTask && selectedTask.id === task.id">
              <div class="task-card-header">
                <div class="task-id-type">
                  <span class="task-id">#{{ task.id }}</span>
                  <span class="task-type {{ task.task_type || 'story' }}">
                    <span class="type-icon">{{ getTaskTypeIcon(task.task_type) }}</span>
                    {{ task.task_type || 'story' | titlecase }}
                  </span>
                </div>
                <div class="header-right">
                  <span class="priority {{ task.priority }}">{{ task.priority | titlecase }}</span>
                  <button class="card-edit-btn" (click)="openEditTaskDialog(task); $event.stopPropagation()">
                    <span class="edit-icon">✎</span>
                  </button>
                </div>
              </div>
              <h3 class="task-title">{{ task.title }}</h3>
              <p class="task-description">{{ task.description }}</p>
              <div class="task-meta">
                <div class="assignee" *ngIf="task.assignee">
                  <span class="avatar">{{ task.assignee.charAt(0) }}</span>
                  <span class="name">{{ task.assignee }}</span>
                </div>
                <div class="due-date" *ngIf="task.dueDate"
                     [class.overdue]="isTaskOverdue(task)"
                     [class.due-today]="isTaskDueToday(task)"
                     [class.due-soon]="isTaskDueThisWeek(task) && !isTaskDueToday(task)">
                  <span class="due-icon" *ngIf="isTaskOverdue(task)">⚠️</span>
                  <span class="due-icon" *ngIf="isTaskDueToday(task)">⏰</span>
                  <span class="due-icon" *ngIf="isTaskDueThisWeek(task) && !isTaskDueToday(task)">📅</span>
                  Due: {{ task.dueDate | date:'mediumDate' }}
                </div>
              </div>
              <div class="task-actions">
                <select (change)="updateStatus(task.id || 0, $event)" [(ngModel)]="task.status" class="status-select">
                  <option *ngFor="let status of statuses" [value]="status">{{ status | titlecase }}</option>
                </select>
                <button (click)="deleteTask(task.id || 0); $event.stopPropagation()" class="delete-btn">Delete</button>
              </div>
            </div>
            <div class="empty-column" *ngIf="getTasksByStatus('pending').length === 0">
              <p>No pending tasks</p>
            </div>
          </div>
        </div>
        
        <!-- In Progress Column -->
        <div class="column in-progress-column">
          <div class="column-header">
            <h3>In Progress</h3>
            <span class="task-count">{{ getTasksByStatus('in_progress').length }}</span>
          </div>
          <div class="column-content">
            <div class="task-card" *ngFor="let task of getTasksByStatus('in_progress')" (click)="this.selectedTask = (this.selectedTask && this.selectedTask.id === task.id) ? null : task" [class.selected]="selectedTask && selectedTask.id === task.id">
              <div class="task-card-header">
                <div class="task-id-type">
                  <span class="task-id">#{{ task.id }}</span>
                  <span class="task-type {{ task.task_type || 'story' }}">
                    <span class="type-icon">{{ getTaskTypeIcon(task.task_type) }}</span>
                    {{ task.task_type || 'story' | titlecase }}
                  </span>
                </div>
                <div class="header-right">
                  <span class="priority {{ task.priority }}">{{ task.priority | titlecase }}</span>
                  <button class="card-edit-btn" (click)="openEditTaskDialog(task); $event.stopPropagation()">
                    <span class="edit-icon">✎</span>
                  </button>
                </div>
              </div>
              <h3 class="task-title">{{ task.title }}</h3>
              <p class="task-description">{{ task.description }}</p>
              <div class="task-meta">
                <div class="assignee" *ngIf="task.assignee">
                  <span class="avatar">{{ task.assignee.charAt(0) }}</span>
                  <span class="name">{{ task.assignee }}</span>
                </div>
                <div class="due-date" *ngIf="task.dueDate"
                     [class.overdue]="isTaskOverdue(task)"
                     [class.due-today]="isTaskDueToday(task)"
                     [class.due-soon]="isTaskDueThisWeek(task) && !isTaskDueToday(task)">
                  <span class="due-icon" *ngIf="isTaskOverdue(task)">⚠️</span>
                  <span class="due-icon" *ngIf="isTaskDueToday(task)">⏰</span>
                  <span class="due-icon" *ngIf="isTaskDueThisWeek(task) && !isTaskDueToday(task)">📅</span>
                  Due: {{ task.dueDate | date:'mediumDate' }}
                </div>
              </div>
              <div class="task-actions">
                <select (change)="updateStatus(task.id || 0, $event)" [(ngModel)]="task.status" class="status-select">
                  <option *ngFor="let status of statuses" [value]="status">{{ status | titlecase }}</option>
                </select>
                <button (click)="deleteTask(task.id || 0); $event.stopPropagation()" class="delete-btn">Delete</button>
              </div>
            </div>
            <div class="empty-column" *ngIf="getTasksByStatus('in_progress').length === 0">
              <p>No in-progress tasks</p>
            </div>
          </div>
        </div>
        
        <!-- Blocked Column -->
        <div class="column blocked-column">
          <div class="column-header">
            <h3>Blocked</h3>
            <span class="task-count">{{ getTasksByStatus('blocked').length }}</span>
          </div>
          <div class="column-content">
            <div class="task-card" *ngFor="let task of getTasksByStatus('blocked')" (click)="this.selectedTask = (this.selectedTask && this.selectedTask.id === task.id) ? null : task" [class.selected]="selectedTask && selectedTask.id === task.id">
              <div class="task-card-header">
                <div class="task-id-type">
                  <span class="task-id">#{{ task.id }}</span>
                  <span class="task-type {{ task.task_type || 'story' }}">
                    <span class="type-icon">{{ getTaskTypeIcon(task.task_type) }}</span>
                    {{ task.task_type || 'story' | titlecase }}
                  </span>
                </div>
                <div class="header-right">
                  <span class="priority {{ task.priority }}">{{ task.priority | titlecase }}</span>
                  <button class="card-edit-btn" (click)="openEditTaskDialog(task); $event.stopPropagation()">
                    <span class="edit-icon">✎</span>
                  </button>
                </div>
              </div>
              <h3 class="task-title">{{ task.title }}</h3>
              <p class="task-description">{{ task.description }}</p>
              <div class="task-meta">
                <div class="assignee" *ngIf="task.assignee">
                  <span class="avatar">{{ task.assignee.charAt(0) }}</span>
                  <span class="name">{{ task.assignee }}</span>
                </div>
                <div class="due-date" *ngIf="task.dueDate"
                     [class.overdue]="isTaskOverdue(task)"
                     [class.due-today]="isTaskDueToday(task)"
                     [class.due-soon]="isTaskDueThisWeek(task) && !isTaskDueToday(task)">
                  <span class="due-icon" *ngIf="isTaskOverdue(task)">⚠️</span>
                  <span class="due-icon" *ngIf="isTaskDueToday(task)">⏰</span>
                  <span class="due-icon" *ngIf="isTaskDueThisWeek(task) && !isTaskDueToday(task)">📅</span>
                  Due: {{ task.dueDate | date:'mediumDate' }}
                </div>
              </div>
              <div class="task-actions">
                <select (change)="updateStatus(task.id || 0, $event)" [(ngModel)]="task.status" class="status-select">
                  <option *ngFor="let status of statuses" [value]="status">{{ status | titlecase }}</option>
                </select>
                <button (click)="deleteTask(task.id || 0); $event.stopPropagation()" class="delete-btn">Delete</button>
              </div>
            </div>
            <div class="empty-column" *ngIf="getTasksByStatus('blocked').length === 0">
              <p>No blocked tasks</p>
            </div>
          </div>
        </div>
        
        <!-- Completed Column -->
        <div class="column completed-column">
          <div class="column-header">
            <h3>Completed</h3>
            <span class="task-count">{{ getTasksByStatus('completed').length }}</span>
          </div>
          <div class="column-content">
            <div class="task-card" *ngFor="let task of getTasksByStatus('completed')" (click)="this.selectedTask = (this.selectedTask && this.selectedTask.id === task.id) ? null : task" [class.selected]="selectedTask && selectedTask.id === task.id">
              <div class="task-card-header">
                <div class="task-id-type">
                  <span class="task-id">#{{ task.id }}</span>
                  <span class="task-type {{ task.task_type || 'story' }}">
                    <span class="type-icon">{{ getTaskTypeIcon(task.task_type) }}</span>
                    {{ task.task_type || 'story' | titlecase }}
                  </span>
                </div>
                <div class="header-right">
                  <span class="priority {{ task.priority }}">{{ task.priority | titlecase }}</span>
                  <button class="card-edit-btn" (click)="openEditTaskDialog(task); $event.stopPropagation()">
                    <span class="edit-icon">✎</span>
                  </button>
                </div>
              </div>
              <h3 class="task-title">{{ task.title }}</h3>
              <p class="task-description">{{ task.description }}</p>
              <div class="task-meta">
                <div class="assignee" *ngIf="task.assignee">
                  <span class="avatar">{{ task.assignee.charAt(0) }}</span>
                  <span class="name">{{ task.assignee }}</span>
                </div>
                <div class="due-date" *ngIf="task.dueDate"
                     [class.overdue]="isTaskOverdue(task)"
                     [class.due-today]="isTaskDueToday(task)"
                     [class.due-soon]="isTaskDueThisWeek(task) && !isTaskDueToday(task)">
                  <span class="due-icon" *ngIf="isTaskOverdue(task)">⚠️</span>
                  <span class="due-icon" *ngIf="isTaskDueToday(task)">⏰</span>
                  <span class="due-icon" *ngIf="isTaskDueThisWeek(task) && !isTaskDueToday(task)">📅</span>
                  Due: {{ task.dueDate | date:'mediumDate' }}
                </div>
              </div>
              <div class="task-actions">
                <select (change)="updateStatus(task.id || 0, $event)" [(ngModel)]="task.status" class="status-select">
                  <option *ngFor="let status of statuses" [value]="status">{{ status | titlecase }}</option>
                </select>
                <button (click)="deleteTask(task.id || 0); $event.stopPropagation()" class="delete-btn">Delete</button>
              </div>
            </div>
            <div class="empty-column" *ngIf="getTasksByStatus('completed').length === 0">
              <p>No completed tasks</p>
            </div>
          </div>
        </div>
        </div>
      </div>
      
      <!-- Task Dialog Component -->
      <app-task-dialog
        [visible]="showTaskDialog"
        [isEditMode]="isEditMode"
        [task]="selectedTask"
        (close)="closeTaskDialog()"
        (save)="saveTask($event)"
        (createSubtask)="openSubtaskDialog($event)"
      ></app-task-dialog>
      
      <!-- Subtask Dialog Component -->
      <app-subtask-dialog
        [visible]="showSubtaskDialog"
        [parentTask]="parentTask"
        (close)="closeSubtaskDialog()"
        (save)="saveSubtask($event)"
      ></app-subtask-dialog>
    </div>
  `,
  styles: [`
    /* Task Type Styles */
    .task-id-type {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .task-type {
      display: inline-flex;
      align-items: center;
      font-size: 0.8rem;
      padding: 3px 8px;
      border-radius: 3px;
      font-weight: 500;
      margin-left: 4px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    
    .task-type.story {
      background-color: #E3FCEF;
      color: #006644;
    }
    
    .task-type.bug {
      background-color: #FFEBE6;
      color: #DE350B;
    }
    .task-type.task {
      background-color: #DEEBFF;
      color: #0052CC;
    }
    .task-type.epic {
      background-color: #EAE6FF;
      color: #403294;
    }
    .task-type.subtask {
      background-color: #F4F5F7;
      color: #42526E;
    }
    
    .parent-link {
      display: inline-flex;
      align-items: center;
      font-size: 0.75rem;
      margin-left: 8px;
      padding: 2px 6px;
      background-color: #F4F5F7;
      border-radius: 3px;
      color: #42526E;
      border: 1px dashed #DFE1E6;
    }
    
    .link-icon {
      margin-right: 4px;
    }
    
    .subtask-indicator {
      margin-top: 8px;
      padding: 4px 8px;
      background-color: #EAE6FF;
      border-radius: 3px;
      font-size: 0.8rem;
      color: #403294;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .type-icon {
      font-size: 1rem;
    }
    .task-board {
      width: 100%;
      height: calc(100vh - 70px); /* Subtract navbar height */
      margin: 0;
      padding: 0px;
      background-color: #F4F5F7;
      display: flex;
      flex-direction: column;
      overflow: hidden; /* Prevent scrolling on the main container */
    }
    
    .fixed-header-section {
      position: sticky;
      top: 0;
      z-index: 200;
      background-color: #F4F5F7;
    }
    
    .scrollable-content {
      flex: 1;
      overflow-y: auto; /* Enable scrolling for this section only */
      padding-bottom: 20px;
      position: relative; /* Create a positioning context for sticky elements */
    }
    .board-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      background-color: white;
      border-bottom: 1px solid #DFE1E6;
      margin-bottom: 0; /* Remove margin to avoid gap */
      z-index: 150;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .board-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .view-toggle {
      display: flex;
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid #DFE1E6;
    }
    
    .view-toggle-btn {
      padding: 8px 12px;
      background-color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #42526E;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    
    .view-toggle-btn:hover {
      background-color: #F4F5F7;
    }
    
    .view-toggle-btn.active {
      background-color: #DEEBFF;
      color: #0052CC;
    }
    
    .toggle-icon {
      font-size: 16px;
    }
    .board-title {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .board-title h2 {
      margin: 0;
      font-size: 24px;
      color: #172B4D;
    }
    .board-actions {
      display: flex;
      gap: 10px;
    }
    .refresh-btn, .add-task-btn, .my-tasks-btn {
      padding: 8px 16px;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 500;
    }
    .refresh-btn, .my-tasks-btn {
      background-color: #F4F5F7;
      color: #42526E;
      border: 1px solid #DFE1E6;
    }
    .my-tasks-btn.active {
      background-color: #DEEBFF;
      color: #0052CC;
      border-color: #B3D4FF;
    }
    .add-task-btn {
      background-color: #0052CC;
      color: white;
      border: none;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 20px;
    }
    .user-avatar {
      width: 32px;
      height: 32px;
      background-color: #0052CC;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
    }
    .user-role {
      background-color: #DFE1E6;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 12px;
      color: #42526E;
    }
    .logout-btn {
      background: none;
      border: none;
      color: #42526E;
      cursor: pointer;
      text-decoration: underline;
      padding: 0;
    }
    /* Filter section in the fixed header */
    .filter-section {
      padding: 0 20px;
      margin-bottom: 20px;
      background-color: #F4F5F7;
      width: 100%;
    }
    
    .board-columns {
      display: flex;
      gap: 20px;
      padding: 0 20px 20px;
      overflow-x: auto;
      /* Only apply scrollbar styling in development environment */
      scrollbar-width: ${!environment.production ? 'thin' : 'none'};
      scrollbar-color: ${!environment.production ? 'rgba(0, 82, 204, 0.5) #F4F5F7' : 'transparent transparent'};
    }
    
    /* Webkit scrollbar styling for development environment only */
    .board-columns::-webkit-scrollbar {
      height: ${!environment.production ? '8px' : '0'};
    }
    
    .board-columns::-webkit-scrollbar-track {
      background: #F4F5F7;
      border-radius: 4px;
      display: ${!environment.production ? 'block' : 'none'};
    }
    
    .board-columns::-webkit-scrollbar-thumb {
      background-color: rgba(0, 82, 204, 0.5);
      border-radius: 4px;
      border: 2px solid #F4F5F7;
      display: ${!environment.production ? 'block' : 'none'};
    }
    .column {
      flex: 1;
      min-width: 280px;
      background-color: #F4F5F7;
      border-radius: 3px;
    }
    .pending-column {
      border-top: 3px solid #4BADE8;
    }
    .in-progress-column {
      border-top: 3px solid #65BA43;
    }
    .blocked-column {
      border-top: 3px solid #E94F3B;
    }
    .completed-column {
      border-top: 3px solid #65BA43;
    }
    .column-header {
      padding: 12px 16px;
      background-color: #F4F5F7;
      border-bottom: 1px solid #DFE1E6;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0; /* Stick to the top of the scrollable container */
      z-index: 10;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    .column-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      color: #42526E;
    }
    .task-count {
      background-color: #DFE1E6;
      color: #42526E;
      border-radius: 10px;
      padding: 2px 8px;
      font-size: 12px;
    }
    .column-content {
      padding: 12px;
      min-height: 100px;
      max-height: calc(100vh - 240px); /* Limit height to create vertical scrolling */
      overflow-y: auto;
      /* Only apply scrollbar styling in development environment */
      scrollbar-width: ${!environment.production ? 'thin' : 'none'};
      scrollbar-color: ${!environment.production ? 'rgba(0, 82, 204, 0.5) #F4F5F7' : 'transparent transparent'};
    }
    
    /* Webkit scrollbar styling for development environment only */
    .column-content::-webkit-scrollbar {
      width: ${!environment.production ? '8px' : '0'};
    }
    
    .column-content::-webkit-scrollbar-track {
      background: #F4F5F7;
      border-radius: 4px;
      display: ${!environment.production ? 'block' : 'none'};
    }
    
    .column-content::-webkit-scrollbar-thumb {
      background-color: rgba(0, 82, 204, 0.5);
      border-radius: 4px;
      border: 2px solid #F4F5F7;
      display: ${!environment.production ? 'block' : 'none'};
    }
    .task-card {
      background-color: white;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
      margin-bottom: 16px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(.25,.8,.25,1);
      border-left: 3px solid transparent;
      position: relative;
      overflow: hidden;
    }
    .task-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    .task-card.selected {
      border-left: 3px solid #0052CC;
      background-color: #F4F5F7;
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
    }
    .task-card::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 8px;
      height: 100%;
      background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.05));
    }
    .task-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .card-edit-btn {
      background: none;
      border: none;
      color: #0052CC;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    
    .card-edit-btn:hover {
      background-color: rgba(0, 82, 204, 0.1);
      transform: scale(1.1);
    }
    
    .edit-icon {
      font-size: 16px;
    }
    .button-group {
      display: flex;
      gap: 4px;
    }
    .edit-btn {
      background-color: #0052CC;
      color: white;
      border: none;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 3px;
      cursor: pointer;
    }
    .edit-btn:hover {
      background-color: #0747A6;
    }
    .delete-btn {
      background: none;
      border: 1px solid #DFE1E6;
      color: #6B778C;
      cursor: pointer;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 3px;
    }
    .delete-btn:hover {
      background-color: #FFEBE6;
      color: #DE350B;
      border-color: #DE350B;
    }
    .task-id {
      font-size: 12px;
      color: #6B778C;
    }
    .priority {
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .priority.low {
      background-color: #E3FCEF;
      color: #006644;
    }
    .priority.medium {
      background-color: #FFFAE6;
      color: #FF8B00;
    }
    .priority.high {
      background-color: #FFEBE6;
      color: #DE350B;
    }
    .priority.critical {
      background-color: #FFBDAD;
      color: #BF2600;
    }
    .task-title {
      margin: 0 0 8px 0;
      font-size: 16px;
      color: #172B4D;
    }
    .task-description {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #42526E;
    }
    .task-meta {
      display: flex;
      flex-direction: column;
      margin-bottom: 12px;
      font-size: 12px;
      gap: 8px;
    }
    .assignee {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: #EAE6FF;
      padding: 6px 10px;
      border-radius: 4px;
      margin-bottom: 4px;
      width: 100%;
      border-left: 3px solid #5243AA;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
    }
    .assignee:hover {
      background-color: #F0F0FF;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    }
    .avatar {
      width: 30px;
      height: 30px;
      background-color: #5243AA;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 2px 4px rgba(82, 67, 170, 0.3);
    }
    .name {
      font-size: 13px;
      color: #172B4D;
      font-weight: 500;
    }
    .name::before {
      content: 'Assigned to: ';
      color: #6B778C;
      font-weight: normal;
    }
    .due-date {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: #E3FCEF;
      padding: 6px 10px;
      border-radius: 4px;
      width: 100%;
      border-left: 3px solid #00875A;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
      color: #006644;
      font-weight: 500;
    }
    .due-date::before {
      content: '📅';
      font-size: 16px;
    }
    .due-date:hover {
      background-color: #E6FCF2;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    }
    .task-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .status-select {
      flex: 1;
      padding: 6px;
      border: 1px solid #DFE1E6;
      border-radius: 3px;
      font-size: 12px;
    }
    .delete-btn {
      background: none;
      color: white;
      border: none;
      padding: 6px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .pending-column .column-header {
      border-bottom-color: #FF8B00;
    }
    .in-progress-column .column-header {
      border-bottom-color: #0052CC;
    }
    .blocked-column .column-header {
      border-bottom-color: #FF5630;
    }
    .completed-column .column-header {
      border-bottom-color: #36B37E;
    }
  `]
})
export class TaskListComponent implements OnInit, OnDestroy {
  // Properties for task management
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  selectedTask: Task | null = null;
  isEditMode = false;
  showTaskDialog = false;
  showSubtaskDialog = false;
  parentTask: Task | null = null;
  viewMode: 'kanban' | 'list' | 'table' = 'kanban'; // Default to kanban view
  showAddTaskForm = false;
  currentUser: any = null; // Using any type to avoid conflicts between auth and api User interfaces
  users: string[] = []; // Store user names as strings
  userObjects: any[] = []; // Store full user objects
  dbUsers: any[] = []; // For backward compatibility
  showingMyTasks = false;
  private routerSubscription: Subscription | undefined;
  private userSubscription: Subscription | undefined;
  
  // Filter properties
  statusFilter: string = '';
  searchQuery: string = '';
  priorityFilter: string = ''; // New priority filter
  dueFilter: string = ''; // Due date filter
  assigneeFilter: string = ''; // Assignee filter
  currentFilters: any = {
    search: '',
    status: '',
    priority: '',
    assignee: ''
  };
  
  // Task statistics
  taskStats = {
    total: 0,
    pending: 0,
    inProgress: 0,
    blocked: 0,
    completed: 0,
    overdue: 0
  };
  
  // Due date reminder settings
  showDueDateReminders = true;
  reminderThresholdDays = 2; // Show reminders for tasks due within 2 days
  
  // Task statuses and priorities
  statuses = ['pending', 'in_progress', 'blocked', 'completed'];
  priorities = ['low', 'medium', 'high', 'critical'];
  
  // New task template
  newTask: Task = {
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    assignee: '',
    dueDate: ''
  };
  
  constructor(
    private apiService: ApiService,
    public authService: AuthService,
    private router: Router
  ) {}
  
  ngOnInit() {
    // Load users from the database
    this.loadUsers();
    
    // Subscribe to user changes
    this.loadTasks();
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      if (!user) {
        // If not logged in, redirect to login page
        this.router.navigate(['/login']);
      } else {
        // Load tasks when user changes
        this.loadTasks();
      }
    });
    
    // Listen for task added events
    window.addEventListener('taskAdded', () => {
      console.log('Received taskAdded event');
      this.loadTasks();
    });
    
    // Reload tasks when navigating to this component
    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd && this.router.url === '/') {
        console.log('NavigationEnd to /, reloading tasks');
        this.loadTasks();
      }
    });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  // Load users from the database
  loadUsers() {
    console.log('Loading users from database...');
    this.apiService.getUsers().subscribe(
      users => {
        console.log('Users loaded successfully:', users);
        this.dbUsers = users;
        // Extract user names for the dropdown
        this.users = users.map(user => user.name);
        
        // Force refresh of task dialog component if it exists
        this.refreshTaskDialogUsers();
      },
      error => {
        console.error('Error loading users:', error);
        // Fallback to default users if API fails
        this.users = ['John Doe', 'Jane Smith', 'Alex Johnson', 'Sam Wilson'];
      }
    );
  }
  
  // Force refresh of task dialog users
  refreshTaskDialogUsers() {
    // Dispatch a custom event that the task dialog can listen for
    const refreshEvent = new CustomEvent('refreshUsers');
    window.dispatchEvent(refreshEvent);
  }
  
  loadTasks(): void {
    console.log('Loading tasks...', this.showingMyTasks ? 'My Tasks' : 'All Tasks');
    
    // Initialize showingMyTasks if undefined
    if (this.showingMyTasks === undefined) {
      this.showingMyTasks = false;
    }
    
    // Load all tasks with current filters
    console.log('Loading all tasks with filters:', this.currentFilters);
    this.apiService.getTasks(this.currentFilters).subscribe(
      (tasks: Task[]) => {
        console.log('All tasks loaded:', tasks.length);
        this.tasks = tasks;
        
        // If showing my tasks, filter by the current user's name as assignee
        if (this.showingMyTasks && this.currentUser) {
          const currentUser = this.authService.getCurrentUser();
          console.log('Filtering tasks assigned to:', currentUser?.name);
          console.log('Filtering tasks assigned to:', this.currentUser.name);
          // Filter tasks where the assignee exactly matches the current user's name
          this.filteredTasks = this.tasks.filter(task => {
            // Check if the assignee is exactly the current user's name
            // This handles cases like 'John Doe' vs just 'John'
            return task.assignee === currentUser?.name;
          });
          console.log(`Found ${this.filteredTasks.length} tasks assigned to ${this.currentUser.name}`);
        } else {
          this.filteredTasks = [...tasks]; // Set filtered tasks initially
        }
        
        this.applyCurrentFilters(); // Apply any additional filters
      },
      (error: any) => {
        console.error('Error loading tasks:', error);
        alert('Failed to load tasks. Please try again.');
      }
    );
  }
  
  // Apply current filters to the tasks list
  applyCurrentFilters(): void {
    console.log('Applying current filters:', this.currentFilters);
    
    // Start with all tasks
    let filtered: Task[] = [...this.tasks];
    
    // Apply search filter if present
    if (this.currentFilters.search) {
      // Clean the search term - remove # if present for ID searches
      let searchTerm = this.currentFilters.search.toLowerCase().trim();
      // Remove # prefix if searching for task ID
      if (searchTerm.startsWith('#')) {
        searchTerm = searchTerm.substring(1);
      }
      
      // Try to parse as number for ID searches
      const searchTermAsNumber = parseInt(searchTerm);
      const isSearchingById = !isNaN(searchTermAsNumber);
      
      console.log('Search term:', searchTerm, 'Is searching by ID:', isSearchingById, 'Number value:', searchTermAsNumber);
      
      // If searching by exact ID, try to fetch that specific task first
      if (isSearchingById && searchTerm === searchTermAsNumber.toString()) {
        console.log('Attempting direct task ID search for ID:', searchTermAsNumber);
        
        // First check if the task is already in our local array
        const existingTask = this.tasks.find(t => t.id === searchTermAsNumber);
        if (existingTask) {
          console.log('Found task by ID in local array:', existingTask);
          this.filteredTasks = [existingTask];
          this.updateTaskStatistics();
          return;
        }
        
        // If not found locally, try to fetch from API
        this.apiService.getTaskById(searchTermAsNumber).subscribe({
          next: (task) => {
            console.log('Found task by ID from API:', task);
            // Add to tasks array if not already there
            if (!this.tasks.some(t => t.id === task.id)) {
              this.tasks.push(task);
            }
            this.filteredTasks = [task];
            this.updateTaskStatistics();
          },
          error: (error) => {
            console.error('Error fetching task by ID:', error);
            // Continue with normal filtering if direct fetch fails
            this.performNormalFiltering(filtered, searchTerm, searchTermAsNumber, isSearchingById);
          }
        });
        return;
      }
      
      // For non-exact ID searches or text searches, use normal filtering
      this.performNormalFiltering(filtered, searchTerm, searchTermAsNumber, isSearchingById);
    } else {
      // No search term, apply other filters
      this.applyOtherFilters(filtered);
    }
  }
  
  // Helper method to perform normal filtering
  private performNormalFiltering(filtered: Task[], searchTerm: string, searchTermAsNumber: number, isSearchingById: boolean): void {
    filtered = filtered.filter((task: Task) => {
      // Search by task ID - exact match if the search term is a number
      if (isSearchingById && task.id === searchTermAsNumber) {
        console.log('Found task by ID exact match:', task);
        return true;
      }
      
      // Search by task ID as substring
      if (task.id !== undefined && task.id.toString().includes(searchTerm)) {
        console.log('Found task by ID substring match:', task);
        return true;
      }
      
      // Search by title
      if (task.title && task.title.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Search by description
      if (task.description && task.description.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Search by task type
      if (task.task_type && task.task_type.toLowerCase().includes(searchTerm)) {
        console.log('Found task by task type match:', task);
        return true;
      }
      
      return false;
    });
    
    // Update filtered tasks
    this.filteredTasks = filtered;
    console.log('Filtered tasks:', this.filteredTasks.length);
    
    // Update task statistics
    this.updateTaskStatistics();
  }
  
  // Helper method to apply non-search filters
  private applyOtherFilters(filtered: Task[]): void {
    // Apply status filter if present
    if (this.currentFilters.status) {
      filtered = filtered.filter((task: Task) => task.status === this.currentFilters.status);
    }
    
    // Apply priority filter if present
    if (this.currentFilters.priority) {
      filtered = filtered.filter((task: Task) => task.priority === this.currentFilters.priority);
    }
    
    // Apply task type filter if present
    if (this.currentFilters.task_type) {
      filtered = filtered.filter((task: Task) => task.task_type === this.currentFilters.task_type);
    }
    
    // Apply assignee filter if present
    if (this.currentFilters.assignee) {
      filtered = filtered.filter((task: Task) => task.assignee === this.currentFilters.assignee);
    }
    
    // Apply due date filter if present
    if (this.dueFilter) {
      filtered = filtered.filter((task: Task) => {
        switch (this.dueFilter) {
          case 'overdue':
            return this.isTaskOverdue(task);
          case 'today':
            return this.isTaskDueToday(task);
          case 'this_week':
            return this.isTaskDueThisWeek(task);
          default:
            return true;
        }
      });
    }
    
    // Update filtered tasks
    this.filteredTasks = filtered;
    console.log('Filtered tasks:', this.filteredTasks.length);
    
    // Update task statistics
    this.updateTaskStatistics();
  }
  
  // Update task statistics based on all tasks
  updateTaskStatistics(): void {
    // Reset statistics
    this.taskStats = {
      total: this.tasks.length,
      pending: 0,
      inProgress: 0,
      blocked: 0,
      completed: 0,
      overdue: 0
    };
    
    // Count tasks by status
    this.tasks.forEach(task => {
      switch (task.status) {
        case 'pending':
          this.taskStats.pending++;
          break;
        case 'in_progress':
          this.taskStats.inProgress++;
          break;
        case 'blocked':
          this.taskStats.blocked++;
          break;
        case 'completed':
          this.taskStats.completed++;
          break;
      }
      
      // Count overdue tasks (not completed and past due date)
      if (task.status !== 'completed' && this.isTaskOverdue(task)) {
        this.taskStats.overdue++;
      }
    });
    
    console.log('Task statistics updated:', this.taskStats);
  }
  
  // Refresh users from the database
  refreshUsers() {
    console.log('Manually refreshing users...');
    this.loadUsers();
    // Show confirmation to user
    alert('User list refreshed from database');
  }
  
  toggleMyTasks(): void {
    this.showingMyTasks = !this.showingMyTasks;
    console.log('My Tasks toggled:', this.showingMyTasks ? 'ON' : 'OFF');
    
    // Add visual feedback
    if (this.showingMyTasks) {
      alert('Showing only tasks assigned to you');
    }
    
    this.loadTasks();
  }
  
  applyFilters(filters: any) {
    console.log('Applying filters:', filters);
    this.currentFilters = filters;
    this.loadTasks();
  }

  logout(): void {
    this.authService.logout();
    // Navigation to login will happen automatically due to the auth guard
  }

  getTasksByStatus(status: string): Task[] {
    return this.filteredTasks.filter((task: Task) => task.status === status);
  }
  
  getTaskTypeIcon(type: string | undefined): string {
    switch (type) {
      case 'story': return '📝'; // Document icon for story
      case 'bug': return '🐞'; // Bug icon for bug
      case 'epic': return '🏆'; // Trophy icon for epic
      case 'subtask': return '📎'; // Paperclip icon for subtask
      case 'task':
      default: return '✓'; // Checkmark icon for task
    }
  }
  
  // Find a parent task by ID
  getParentTask(parentId: number | undefined): Task | undefined {
    if (!parentId) return undefined;
    return this.tasks.find(task => task.id === parentId);
  }
  
  // Get subtasks for a parent task
  getSubtasks(parentId: number | undefined): Task[] {
    if (!parentId) return [];
    return this.tasks.filter(task => task.parentId === parentId);
  }
  
  // Check if a task has subtasks
  hasSubtasks(taskId: number | undefined): boolean {
    if (!taskId) return false;
    return this.tasks.some(task => task.parentId === taskId);
  }

  // Check if a task is overdue (due date is in the past)  
  isTaskOverdue(task: Task): boolean {
    if (!task.dueDate) return false;
    
  // Check if a task is overdue (due date is in the past)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day for accurate comparison
    
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  }
  
  // Check if a task is due today
  isTaskDueToday(task: Task): boolean {
    if (!task.dueDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    return dueDate.getTime() === today.getTime();
  }
  
  // Check if a task is due within the next week
  isTaskDueThisWeek(task: Task): boolean {
    if (!task.dueDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    return dueDate >= today && dueDate <= nextWeek;
  }
  
  updateStatus(taskId: number, event: Event): void {
    if (!event || !event.target) return;
    
    // Get the new status from the dropdown
    const status = (event.target as HTMLSelectElement).value;
    console.log(`Updating task ${taskId} to status: ${status}`);
    
    // Immediately update the task status in the API
    this.apiService.updateTaskStatus(taskId, status).subscribe(
      (updatedTask: Task) => {
        console.log('Task status updated successfully:', updatedTask);
        
        // Find the task in the current tasks array and update it
        const taskIndex = this.tasks.findIndex((t: Task) => t.id === taskId);
        if (taskIndex !== -1) {
          this.tasks[taskIndex] = updatedTask;
          
          // Also update in filteredTasks if it exists there
          const filteredIndex = this.filteredTasks.findIndex((t: Task) => t.id === taskId);
          if (filteredIndex !== -1) {
            this.filteredTasks[filteredIndex] = updatedTask;
          }
          
          // Reload the tasks to refresh the view
          // This ensures the task appears in the correct column
          this.loadTasks();
        }
      },
      (error: any) => {
        console.error('Error updating task status:', error);
        alert('Failed to update task status. Please try again.');
      }
    );
  }

  addTask(): void {
    console.log('Adding task:', this.newTask);
    this.apiService.createTask(this.newTask).subscribe(
      (createdTask: Task) => {
        console.log('Task created successfully:', createdTask);
        // Reset form
        this.newTask = {
          title: '',
          description: '',
          status: 'pending',
          priority: 'medium',
          assignee: '',
          dueDate: ''
        };
        // Reload tasks to update board
        this.loadTasks();
        // Optionally hide the form after successful submission
        this.showAddTaskForm = false;
      },
      (error: any) => {
        console.error('Error creating task:', error);
        alert('Failed to create task. Please check the console for details.');
      }
    );
  }

  deleteTask(taskId: number): void {
    // Check if the current user is an admin
    if (!this.authService.isAdmin()) {
      alert('Only administrators can delete tasks.');
      return;
    }

    if (confirm('Are you sure you want to delete this task?')) {
      console.log(`Deleting task ${taskId}`);
      this.apiService.deleteTask(taskId).subscribe(
        () => {
          console.log('Task deleted successfully');
          this.loadTasks();
        },
        (error: any) => {
          console.error('Error deleting task:', error);
          alert('Failed to delete task. Please check the console for details.');
        }
      );
    }
  }
  
  // Task dialog methods
  
  openCreateTaskDialog(): void {
    this.isEditMode = false;
    this.selectedTask = null;
    this.showTaskDialog = true;
  }
  
  openEditTaskDialog(task: Task | null): void {
    if (!task) return; // Don't open if no task is selected
    this.isEditMode = true;
    this.selectedTask = task;
    this.showTaskDialog = true;
  }
  closeTaskDialog(): void {
    this.showTaskDialog = false;
  }
  
  // Subtask dialog methods
  openSubtaskDialog(parentTask: Task): void {
    this.parentTask = parentTask;
    this.showSubtaskDialog = true;
    this.showTaskDialog = false; // Close the task dialog
  }
  
  closeSubtaskDialog(): void {
    this.showSubtaskDialog = false;
    this.parentTask = null;
  }
  
  saveSubtask(subtaskData: Task): void {
    console.log('Saving subtask:', subtaskData);
    console.log('Parent task:', this.parentTask);
    
    if (!this.parentTask || !this.parentTask.id) {
      console.error('Cannot create subtask: Missing parent task ID');
      alert('Error: Cannot create subtask without a parent task');
      return;
    }
    
    // Show a loading message
    const loadingMessage = document.createElement('div');
    loadingMessage.textContent = 'Creating subtask...';
    loadingMessage.style.position = 'fixed';
    loadingMessage.style.top = '50%';
    loadingMessage.style.left = '50%';
    loadingMessage.style.transform = 'translate(-50%, -50%)';
    loadingMessage.style.padding = '10px 20px';
    loadingMessage.style.backgroundColor = '#f0f0f0';
    loadingMessage.style.border = '1px solid #ccc';
    loadingMessage.style.borderRadius = '4px';
    loadingMessage.style.zIndex = '9999';
    document.body.appendChild(loadingMessage);
    
    // Prepare the subtask data
    const newSubtask: Task = {
      title: subtaskData.title?.trim() || '',
      description: subtaskData.description?.trim() || '',
      status: subtaskData.status || 'pending',
      priority: subtaskData.priority || 'medium',
      task_type: 'subtask', // Always set to subtask
      assignee: subtaskData.assignee || '',
      dueDate: subtaskData.dueDate || '',
      parentId: this.parentTask.id // Set the parent ID
    };
    
    // Create the subtask via API
    this.apiService.createTask(newSubtask).subscribe({
      next: (createdSubtask: Task) => {
        console.log('Subtask created successfully:', createdSubtask);
        
        // Add the new subtask to our local arrays
        this.tasks.push(createdSubtask);
        this.filteredTasks.push(createdSubtask);
        
        // Update statistics
        this.updateTaskStatistics();
        
        // Remove loading message
        document.body.removeChild(loadingMessage);
        
        // Close the dialog
        this.closeSubtaskDialog();
        
        // Show success message
        alert('Subtask created successfully!');
      },
      error: (error: any) => {
        console.error('Error creating subtask:', error);
        
        // Remove loading message
        document.body.removeChild(loadingMessage);
        
        // Show error message
        alert('Failed to create subtask: ' + (error.message || 'Unknown error'));
      }
    });
  }

  /**
   * Updates an existing task with API call first, then local fallback
   * @param task The task to update
   */
  updateExistingTask(task: Task): void {
    if (!task || !task.id) {
      console.error('Cannot update task: Invalid task or missing ID');
      alert('Cannot update task: Missing task ID');
      return;
    }
    
    console.log('Updating task with ID:', task.id);
    
    // Create a clean copy of the task to avoid reference issues
    const updatedTask: Task = {
      id: task.id,
      title: task.title?.trim() || '',
      description: task.description?.trim() || '',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      task_type: task.task_type || 'story',
      assignee: task.assignee || '',
      dueDate: task.dueDate || ''
    };
    
    // Preserve the userId if it exists
    if (task.userId) {
      updatedTask.userId = task.userId;
    }
    
    // Add created_at if it doesn't exist
    if (!updatedTask.created_at) {
      updatedTask.created_at = new Date().toISOString();
    }
    
    // Show a loading message
    const loadingMessage = document.createElement('div');
    loadingMessage.textContent = 'Updating task...';
    loadingMessage.style.position = 'fixed';
    loadingMessage.style.top = '50%';
    loadingMessage.style.left = '50%';
    loadingMessage.style.transform = 'translate(-50%, -50%)';
    loadingMessage.style.padding = '10px 20px';
    loadingMessage.style.backgroundColor = '#f0f0f0';
    loadingMessage.style.border = '1px solid #ccc';
    loadingMessage.style.borderRadius = '4px';
    loadingMessage.style.zIndex = '9999';
    document.body.appendChild(loadingMessage);
    
    // First try to update via API
    this.apiService.updateTask(updatedTask).subscribe({
      next: (serverUpdatedTask: Task) => {
        console.log('Task updated successfully on server:', serverUpdatedTask);
        
        // Update the task in the local arrays with the server response
        this.updateLocalTaskArrays(serverUpdatedTask);
        
        // Remove loading message
        document.body.removeChild(loadingMessage);
        
        // Close the dialog
        this.closeTaskDialog();
        
        // Show success message
        alert('Task updated successfully on server!');
      },
      error: (error: any) => {
        console.error('Error updating task on server:', error);
        console.log('Falling back to local update...');
        
        // Update locally as fallback
        try {
          // Update the task in the local arrays
          this.updateLocalTaskArrays(updatedTask);
          
          // Remove loading message
          document.body.removeChild(loadingMessage);
          
          // Close the dialog
          this.closeTaskDialog();
          
          // Show success message with warning
          alert('Task updated locally only. Changes will not persist after page refresh.');
          
          console.log('Task updated locally as fallback:', updatedTask);
        } catch (localError) {
          // Remove loading message
          document.body.removeChild(loadingMessage);
          
          // Show error message
          alert('Failed to update task: ' + (localError instanceof Error ? localError.message : 'Unknown error'));
          console.error('Error in local task update:', localError);
        }
      }
    });
  }

  /**
   * Updates task in local arrays without requiring a full reload from the server
   * @param updatedTask The updated task from the API
   */
  updateLocalTaskArrays(updatedTask: Task): void {
    if (!updatedTask || !updatedTask.id) return;
    
    // Find and update in the main tasks array
    const taskIndex = this.tasks.findIndex(t => t.id === updatedTask.id);
    if (taskIndex !== -1) {
      this.tasks[taskIndex] = updatedTask;
    }
    
    // Also update in filteredTasks if it exists there
    const filteredIndex = this.filteredTasks.findIndex(t => t.id === updatedTask.id);
    if (filteredIndex !== -1) {
      this.filteredTasks[filteredIndex] = updatedTask;
    }
    
    // Update task statistics
    this.updateTaskStatistics();
  }

  /**
   * Saves a task (creates new or updates existing) with API call first, then local fallback
   * @param task The task to save
   */
  saveTask(taskData: any): void {
    console.log('Saving task:', taskData, 'isEditMode:', this.isEditMode);
    console.log('Task type from dialog:', taskData.task_type);
    
    if (this.isEditMode && this.selectedTask && this.selectedTask.id) {
      // Ensure the task has the correct ID from the selected task
      taskData.id = this.selectedTask.id;
      
      // Call our update method
      this.updateExistingTask(taskData);
    } else {
      // Show a loading message
      const loadingMessage = document.createElement('div');
      loadingMessage.textContent = 'Creating task...';
      loadingMessage.style.position = 'fixed';
      loadingMessage.style.top = '50%';
      loadingMessage.style.left = '50%';
      loadingMessage.style.transform = 'translate(-50%, -50%)';
      loadingMessage.style.padding = '10px 20px';
      loadingMessage.style.backgroundColor = '#f0f0f0';
      loadingMessage.style.border = '1px solid #ccc';
      loadingMessage.style.borderRadius = '4px';
      loadingMessage.style.zIndex = '9999';
      document.body.appendChild(loadingMessage);
      
      // Prepare the task data
      const newTask: Task = {
        title: taskData.title?.trim() || '',
        description: taskData.description?.trim() || '',
        status: taskData.status || 'pending',
        priority: taskData.priority || 'medium',
        task_type: taskData.task_type || 'story',
        assignee: taskData.assignee || '',
        dueDate: taskData.dueDate || ''
      };
      
      // First try to create via API
      this.apiService.createTask(newTask).subscribe({
        next: (serverCreatedTask: Task) => {
          console.log('Task created successfully on server:', serverCreatedTask);
          
          // Add the new task to our local arrays
          this.tasks.push(serverCreatedTask);
          this.filteredTasks.push(serverCreatedTask);
          
          // Update statistics
          this.updateTaskStatistics();
          
          // Remove loading message
          document.body.removeChild(loadingMessage);
          
          // Close the dialog
          this.closeTaskDialog();
          
          // Show success message
          alert('Task created successfully on server!');
        },
        error: (error: any) => {
          console.error('Error creating task on server:', error);
          console.log('Falling back to local task creation...');
          
          // Create locally as fallback
          try {
            // Create a new task locally
            const createdTask: Task = {
              id: Math.floor(Math.random() * 10000) + 1, // Generate a random ID
              title: newTask.title,
              description: newTask.description,
              status: newTask.status,
              priority: newTask.priority,
              task_type: newTask.task_type,
              assignee: newTask.assignee,
              dueDate: newTask.dueDate,
              created_at: new Date().toISOString()
            };
            
            // Add userId if available
            const currentUser = this.authService.getCurrentUser();
            if (currentUser) {
              createdTask.userId = currentUser.id;
            }
            
            console.log('Task created locally as fallback:', createdTask);
            
            // Add the new task to our local arrays
            this.tasks.push(createdTask);
            this.filteredTasks.push(createdTask);
            
            // Update statistics
            this.updateTaskStatistics();
            
            // Remove loading message
            document.body.removeChild(loadingMessage);
            
            // Close the dialog
            this.closeTaskDialog();
            
            // Show success message with warning
            alert('Task created locally only. Changes will not persist after page refresh.');
          } catch (localError) {
            // Remove loading message
            document.body.removeChild(loadingMessage);
            
            // Show error message
            alert('Failed to create task: ' + (localError instanceof Error ? localError.message : 'Unknown error'));
            console.error('Error in local task creation:', localError);
          }
        }
      });
    }
  }

}
