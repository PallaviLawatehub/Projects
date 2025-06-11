import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Task, User } from '../services/api.service';

@Component({
  selector: 'app-subtask-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dialog-overlay" *ngIf="visible" (click)="onOverlayClick($event)">
      <div class="dialog-container">
        <div class="dialog-header">
          <h3>Create Subtask for #{{parentTask?.id}}: {{parentTask?.title}}</h3>
          <button class="close-btn" (click)="onClose()">×</button>
        </div>
        
        <div class="dialog-content">
          <div class="form-group">
            <label for="title">Title*</label>
            <input 
              type="text" 
              id="title" 
              [(ngModel)]="subtaskData.title" 
              required
              placeholder="Enter subtask title"
            >
          </div>
          
          <div class="form-group">
            <label for="description">Description*</label>
            <textarea 
              id="description" 
              [(ngModel)]="subtaskData.description" 
              required
              rows="3"
              placeholder="Enter subtask description"
            ></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group half-width">
              <label for="status">Status</label>
              <select id="status" [(ngModel)]="subtaskData.status">
                <option *ngFor="let status of statuses" [value]="status">
                  {{ status | titlecase }}
                </option>
              </select>
            </div>
            
            <div class="form-group half-width">
              <label for="priority">Priority</label>
              <select id="priority" [(ngModel)]="subtaskData.priority">
                <option *ngFor="let priority of priorities" [value]="priority">
                  {{ priority | titlecase }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group half-width">
              <label for="assignee">Assignee</label>
              <select id="assignee" [(ngModel)]="subtaskData.assignee">
                <option value="">Unassigned</option>
                <option *ngFor="let user of users" [value]="user">{{ user }}</option>
              </select>
            </div>
            
            <div class="form-group half-width">
              <label for="dueDate">Due Date</label>
              <input 
                type="date" 
                id="dueDate" 
                [(ngModel)]="subtaskData.dueDate"
              >
            </div>
          </div>
          
          <div class="form-group">
            <label>Relationship</label>
            <div class="relationship-display">
              <div class="parent-task">
                <span class="task-type {{ parentTask?.task_type || 'task' }}">
                  {{ parentTask?.task_type || 'Task' | titlecase }}
                </span>
                <span class="task-id">#{{ parentTask?.id }}</span>
                <span class="task-title">{{ parentTask?.title }}</span>
              </div>
              <div class="relationship-arrow">↓</div>
              <div class="subtask">
                <span class="task-type subtask">Subtask</span>
                <span class="task-title">{{ subtaskData.title || 'New Subtask' }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="dialog-footer">
          <button class="cancel-btn" (click)="onClose()">Cancel</button>
          <button 
            class="save-btn" 
            [disabled]="!isFormValid()" 
            (click)="onSave()"
          >
            Create Subtask
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .dialog-container {
      background-color: white;
      border-radius: 8px;
      width: 500px;
      max-width: 90%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #DFE1E6;
    }
    
    .dialog-header h3 {
      margin: 0;
      font-size: 20px;
      color: #172B4D;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      color: #6B778C;
      cursor: pointer;
    }
    
    .dialog-content {
      padding: 20px;
      overflow-y: auto;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }
    
    .half-width {
      flex: 1;
    }
    
    label {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
      color: #5E6C84;
    }
    
    input, select, textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #DFE1E6;
      border-radius: 4px;
      font-size: 14px;
    }
    
    textarea {
      resize: vertical;
    }
    
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 20px;
      border-top: 1px solid #DFE1E6;
    }
    
    .cancel-btn {
      padding: 8px 16px;
      background-color: white;
      border: 1px solid #DFE1E6;
      border-radius: 4px;
      color: #42526E;
      cursor: pointer;
    }
    
    .save-btn {
      padding: 8px 16px;
      background-color: #0052CC;
      border: none;
      border-radius: 4px;
      color: white;
      cursor: pointer;
    }
    
    .save-btn:hover {
      background-color: #0747A6;
    }
    
    .save-btn:disabled {
      background-color: #C1C7D0;
      cursor: not-allowed;
    }
    
    .relationship-display {
      background-color: #F4F5F7;
      border-radius: 4px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    
    .parent-task, .subtask {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: white;
      padding: 8px 12px;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      width: 100%;
    }
    
    .relationship-arrow {
      font-size: 24px;
      color: #6B778C;
    }
    
    .task-type {
      display: inline-flex;
      align-items: center;
      font-size: 0.8rem;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 500;
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
    
    .task-id {
      color: #6B778C;
      font-size: 0.9rem;
    }
    
    .task-title {
      font-weight: 500;
      color: #172B4D;
      flex: 1;
    }
  `]
})
export class SubtaskDialogComponent implements OnInit, OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() parentTask: Task | null = null;
  
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Task>();
  
  subtaskData: Task = {
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    task_type: 'subtask',
    assignee: '',
    dueDate: ''
  };
  
  statuses = ['pending', 'in_progress', 'blocked', 'completed'];
  priorities = ['low', 'medium', 'high', 'critical'];
  users: string[] = [];
  dbUsers: User[] = [];
  
  constructor(private apiService: ApiService) {}
  
  // Event listener for refreshing users
  private refreshUsersListener: any;

  ngOnInit() {
    this.resetForm();
    this.loadUsers();
    
    // Add event listener for refreshing users
    this.refreshUsersListener = () => {
      console.log('Received refreshUsers event in subtask dialog');
      this.loadUsers();
    };
    window.addEventListener('refreshUsers', this.refreshUsersListener);
  }
  
  // Load users from the database
  loadUsers() {
    console.log('Loading users in subtask dialog component...');
    this.apiService.getUsers().subscribe(
      users => {
        console.log('Users loaded successfully in subtask dialog:', users);
        this.dbUsers = users;
        // Extract user names for the dropdown
        this.users = users.map(user => user.name);
      },
      error => {
        console.error('Error loading users in subtask dialog:', error);
        // Fallback to default users if API fails
        this.users = ['John Doe', 'Jane Smith', 'Alex Johnson', 'Sam Wilson'];
      }
    );
  }
  
  // Add OnChanges to detect when inputs change
  ngOnChanges(changes: SimpleChanges) {
    // Reset the form whenever the task or visibility changes
    if (this.visible) {
      console.log('Subtask dialog visible, parent task:', this.parentTask);
      this.resetForm();
    }
  }
  
  // Clean up when component is destroyed
  ngOnDestroy() {
    // Remove the event listener to prevent memory leaks
    if (this.refreshUsersListener) {
      window.removeEventListener('refreshUsers', this.refreshUsersListener);
    }
  }
  
  resetForm() {
    // Reset to defaults for new subtask
    this.subtaskData = {
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      task_type: 'subtask',
      assignee: '',
      dueDate: '',
      parentId: this.parentTask?.id
    };
    
    // If parent task has an assignee, use the same assignee for the subtask by default
    if (this.parentTask?.assignee) {
      this.subtaskData.assignee = this.parentTask.assignee;
    }
  }
  
  isFormValid(): boolean {
    return !!this.subtaskData.title && !!this.subtaskData.description;
  }
  
  onSave() {
    if (this.isFormValid() && this.parentTask?.id) {
      // Log the current subtask data before saving
      console.log('Current subtask data before save:', this.subtaskData);
      
      // Ensure we're sending a properly formatted task object
      // Make a clean copy to avoid reference issues
      const subtaskToSave: Task = {
        ...this.subtaskData,
        // Ensure strings are trimmed
        title: this.subtaskData.title.trim(),
        description: this.subtaskData.description.trim(),
        // Ensure other fields have proper values
        status: this.subtaskData.status || 'pending',
        priority: this.subtaskData.priority || 'medium',
        task_type: 'subtask', // Always set to subtask
        // Set parent ID
        parentId: this.parentTask.id
      };
      
      console.log('Subtask dialog emitting save with subtask:', subtaskToSave);
      this.save.emit(subtaskToSave);
    }
  }
  
  onClose() {
    this.close.emit();
  }
  
  onOverlayClick(event: MouseEvent) {
    // Close dialog only if the overlay itself was clicked
    if ((event.target as HTMLElement).classList.contains('dialog-overlay')) {
      this.onClose();
    }
  }
}
