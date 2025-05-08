import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, User } from '../services/api.service';

@Component({
  selector: 'app-task-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="filter-container">
      <div class="search-box">
        <input 
          type="text" 
          [(ngModel)]="searchTerm" 
          (input)="onSearchChange()"
          placeholder="Search tasks..." 
          class="search-input"
        >
        <button *ngIf="searchTerm" (click)="clearSearch()" class="clear-btn">×</button>
      </div>
      
      <div class="filter-options">
        <div class="filter-group">
          <label>Status:</label>
          <select [(ngModel)]="statusFilter" (change)="onFilterChange()">
            <option value="">All</option>
            <option *ngFor="let status of statuses" [value]="status">
              {{ status | titlecase }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Priority:</label>
          <select [(ngModel)]="priorityFilter" (change)="onFilterChange()">
            <option value="">All</option>
            <option *ngFor="let priority of priorities" [value]="priority">
              {{ priority | titlecase }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Assignee:</label>
          <select [(ngModel)]="assigneeFilter" (change)="onFilterChange()">
            <option value="">All</option>
            <option *ngFor="let user of users" [value]="user">{{ user }}</option>
          </select>
        </div>
        
        <div class="filter-group">
          <button 
            (click)="clearFilters()" 
            class="clear-filters-btn"
            [disabled]="!hasActiveFilters()"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .filter-container {
      background-color: #FFFAE6; /* Yellow background */
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      width: 95%;
      /* Removed position:sticky from here as it's handled by the parent container */
    }
    
    .search-box {
      position: relative;
      margin-bottom: 16px;
    }
    
    .search-input {
      width: 99%;
      padding: 10px 0px 10px 12px;
      border: 1px solid #DFE1E6;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .clear-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #5E6C84;
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
    }
    
    .filter-options {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .filter-group {
      display: flex;
      flex-direction: column;
      min-width: 150px;
    }
    
    .filter-group label {
      font-size: 12px;
      color: #5E6C84;
      margin-bottom: 4px;
    }
    
    .filter-group select {
      padding: 8px;
      border: 1px solid #DFE1E6;
      border-radius: 4px;
      background-color: white;
    }
    
    .clear-filters-btn {
      margin-top: 20px;
      padding: 8px 16px;
      background-color: #DEEBFF;
      color: #0052CC;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .clear-filters-btn:hover {
      background-color: #B3D4FF;
    }
    
    .clear-filters-btn:disabled {
      background-color: #F4F5F7;
      color: #A5ADBA;
      cursor: not-allowed;
    }
    
    @media (max-width: 768px) {
      .filter-options {
        flex-direction: column;
        gap: 12px;
      }
      
      .filter-group {
        width: 100%;
      }
    }
  `]
})
export class TaskFilterComponent implements OnInit, OnDestroy {
  @Output() filtersChanged = new EventEmitter<any>();
  
  searchTerm: string = '';
  statusFilter: string = '';
  priorityFilter: string = '';
  assigneeFilter: string = '';
  
  statuses = ['pending', 'in_progress', 'blocked', 'completed'];
  priorities = ['low', 'medium', 'high', 'critical'];
  users: string[] = [];
  dbUsers: User[] = [];
  
  // Event listener for refreshing users
  private refreshUsersListener: any;
  
  constructor(private apiService: ApiService) {}
  
  ngOnInit() {
    // Load users from the database
    this.loadUsers();
    
    // Add event listener for refreshing users
    this.refreshUsersListener = () => {
      console.log('Received refreshUsers event in filter component');
      this.loadUsers();
    };
    window.addEventListener('refreshUsers', this.refreshUsersListener);
  }
  
  ngOnDestroy() {
    // Remove the event listener to prevent memory leaks
    if (this.refreshUsersListener) {
      window.removeEventListener('refreshUsers', this.refreshUsersListener);
    }
  }
  
  // Load users from the database
  loadUsers() {
    console.log('Loading users in filter component...');
    this.apiService.getUsers().subscribe(
      users => {
        console.log('Users loaded successfully in filter:', users);
        this.dbUsers = users;
        // Extract user names for the dropdown
        this.users = users.map(user => user.name);
        
        // Reset assignee filter if the selected user no longer exists
        if (this.assigneeFilter && !this.users.includes(this.assigneeFilter)) {
          this.assigneeFilter = '';
          this.emitFilters();
        }
      },
      error => {
        console.error('Error loading users in filter:', error);
        // Fallback to default users if API fails
        this.users = ['John Doe', 'Jane Smith', 'Alex Johnson', 'Sam Wilson'];
      }
    );
  }
  
  onSearchChange(): void {
    this.emitFilters();
  }
  
  onFilterChange(): void {
    this.emitFilters();
  }
  
  clearSearch(): void {
    this.searchTerm = '';
    this.emitFilters();
  }
  
  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.priorityFilter = '';
    this.assigneeFilter = '';
    this.emitFilters();
  }
  
  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.statusFilter || this.priorityFilter || this.assigneeFilter);
  }
  
  private emitFilters(): void {
    this.filtersChanged.emit({
      search: this.searchTerm,
      status: this.statusFilter,
      priority: this.priorityFilter,
      assignee: this.assigneeFilter
    });
  }
}
