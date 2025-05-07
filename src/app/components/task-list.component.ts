import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Task, User } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { TaskFilterComponent } from './task-filter.component';
import { TaskDialogComponent } from './task-dialog.component';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskFilterComponent, TaskDialogComponent],
  template: `
    <div class="task-board">
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
          <button (click)="loadTasks()" class="refresh-btn">Refresh Tasks</button>
          <button (click)="refreshUsers()" class="refresh-btn">Refresh Users</button>
          <button (click)="toggleMyTasks()" class="my-tasks-btn" [class.active]="showingMyTasks">
            {{ showingMyTasks ? 'Show All Tasks' : 'My Tasks' }}
          </button>
          <button (click)="openCreateTaskDialog()" class="add-task-btn">Add Task</button>
        </div>
      </div>
      
      <!-- Task Filter Component -->
      <app-task-filter (filtersChanged)="applyFilters($event)"></app-task-filter>
      
      <div class="board-columns">
        <!-- Pending Column -->
        <div class="column pending-column">
          <div class="column-header">
            <h3>Pending</h3>
            <span class="task-count">{{ getTasksByStatus('pending').length }}</span>
          </div>
          <div class="column-content">
            <div class="task-card" *ngFor="let task of getTasksByStatus('pending')" (click)="this.selectedTask = (this.selectedTask && this.selectedTask.id === task.id) ? null : task" [class.selected]="selectedTask && selectedTask.id === task.id">
              <div class="task-card-header">
                <span class="task-id">#{{ task.id }}</span>
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
                <div class="due-date" *ngIf="task.dueDate">
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
                <span class="task-id">#{{ task.id }}</span>
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
                <div class="due-date" *ngIf="task.dueDate">
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
                <span class="task-id">#{{ task.id }}</span>
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
                <div class="due-date" *ngIf="task.dueDate">
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
                <span class="task-id">#{{ task.id }}</span>
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
                <div class="due-date" *ngIf="task.dueDate">
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
      
      <!-- Task Dialog Component -->
      <app-task-dialog
        [visible]="showTaskDialog"
        [isEditMode]="isEditMode"
        [task]="selectedTask"
        (close)="closeTaskDialog()"
        (save)="saveTask($event)"
      ></app-task-dialog>
    </div>
  `,
  styles: [`
    .task-board {
      width: 100%;
      min-height: calc(100vh - 70px); /* Subtract navbar height */
      margin: 0;
      padding: 0px;
      background-color: #F4F5F7;
    }
    .board-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      background-color: white;
      border-bottom: 1px solid #DFE1E6;
      margin-bottom: 20px;
      position: sticky;
      top: 50px; /* Position below the main navbar */
      z-index: 150;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
    .board-columns {
      display: flex;
      gap: 20px;
      padding: 0 20px 20px;
      overflow-x: auto;
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
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  private routerSubscription: Subscription | undefined;
  private userSubscription: Subscription | undefined;
  
  statuses = ['pending', 'in_progress', 'blocked', 'completed'];
  priorities = ['low', 'medium', 'high', 'critical'];
  users: string[] = [];
  dbUsers: User[] = [];
  
  showAddTaskForm = false;
  showingMyTasks = false;
  currentUser: any = null;
  
  // Task dialog properties
  showTaskDialog = false;
  isEditMode = false;
  selectedTask: Task | null = null;
  
  // Current filters
  currentFilters: any = {
    search: '',
    status: '',
    priority: '',
    assignee: ''
  };
  
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
    private authService: AuthService,
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
    
    if (this.showingMyTasks) {
      // Load only tasks for the current user
      console.log('Loading my tasks with filters:', this.currentFilters);
      this.apiService.getUserTasks(this.currentFilters).subscribe(
        (tasks: Task[]) => {
          console.log('User tasks loaded:', tasks.length);
          this.tasks = tasks;
          this.filteredTasks = [...tasks]; // Set filtered tasks initially
          this.applyCurrentFilters(); // Apply any additional filters
        },
        (error: any) => {
          console.error('Error loading user tasks:', error);
          alert('Failed to load your tasks. Please try again.');
        }
      );
    } else {
      // Load all tasks with current filters
      console.log('Loading all tasks with filters:', this.currentFilters);
      this.apiService.getTasks(this.currentFilters).subscribe(
        (tasks: Task[]) => {
          console.log('All tasks loaded:', tasks.length);
          this.tasks = tasks;
          this.filteredTasks = [...tasks]; // Set filtered tasks initially
          this.applyCurrentFilters(); // Apply any additional filters
        },
        (error: any) => {
          console.error('Error loading tasks:', error);
          alert('Failed to load tasks. Please try again.');
        }
      );
    }
  }
  
  // Apply current filters to the tasks list
  applyCurrentFilters(): void {
    console.log('Applying current filters:', this.currentFilters);
    
    // Start with all tasks
    let filtered: Task[] = [...this.tasks];
    
    // Apply search filter if present
    if (this.currentFilters.search) {
      const searchTerm = this.currentFilters.search.toLowerCase();
      filtered = filtered.filter((task: Task) => 
        task.title.toLowerCase().includes(searchTerm) || 
        (task.description && task.description.toLowerCase().includes(searchTerm))
      );
    }
    
    // Apply status filter if present
    if (this.currentFilters.status) {
      filtered = filtered.filter((task: Task) => task.status === this.currentFilters.status);
    }
    
    // Apply priority filter if present
    if (this.currentFilters.priority) {
      filtered = filtered.filter((task: Task) => task.priority === this.currentFilters.priority);
    }
    
    // Apply assignee filter if present
    if (this.currentFilters.assignee) {
      filtered = filtered.filter((task: Task) => task.assignee === this.currentFilters.assignee);
    }
    
    // Update filtered tasks
    this.filteredTasks = filtered;
    console.log('Filtered tasks:', this.filteredTasks.length);
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
      alert('Showing only tasks assigned to you or created by you');
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
  
  saveTask(task: Task): void {
    if (this.isEditMode && task.id) {
      // Update existing task
      this.apiService.updateTask(task).subscribe(
        (updatedTask: Task) => {
          console.log('Task updated successfully:', updatedTask);
          this.loadTasks();
          this.closeTaskDialog();
        },
        (error: any) => {
          console.error('Error updating task:', error);
          alert('Failed to update task. Please check the console for details.');
        }
      );
    } else {
      // Create new task
      this.apiService.createTask(task).subscribe(
        (createdTask: Task) => {
          console.log('Task created successfully:', createdTask);
          this.loadTasks();
          this.closeTaskDialog();
        },
        (error: any) => {
          console.error('Error creating task:', error);
          alert('Failed to create task. Please check the console for details.');
        }
      );
    }
  }
}
