import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../services/api.service';

@Component({
  selector: 'app-enhanced-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="enhanced-task-list">
      <div class="list-header">
        <div class="header-id">#</div>
        <div class="header-type">Type</div>
        <div class="header-parent">Parent</div>
        <div class="header-title">Title</div>
        <div class="header-assignee">Assignee</div>
        <div class="header-status">Status</div>
        <div class="header-actions">Actions</div>
      </div>
      
      <div class="list-body">
        <div 
          class="task-row" 
          *ngFor="let task of tasks" 
          [class.selected]="selectedTaskId === task.id"
          (click)="onTaskSelect(task)"
        >
          <div class="task-id">#{{ task.id }}</div>
          
          <div class="task-type">
            <span class="type-badge {{ task.task_type || 'story' }}">
              <span class="type-icon">{{ getTaskTypeIcon(task.task_type) }}</span>
              {{ task.task_type || 'story' | titlecase }}
            </span>
          </div>
          
          <div class="task-parent">
            <span class="parent-link" *ngIf="task.parentId">
              <span class="link-icon">🔗</span> #{{ task.parentId }}
            </span>
            <span class="subtasks-count" *ngIf="getSubtasksCount(task.id) > 0">
              <span class="subtask-icon">📎</span> {{ getSubtasksCount(task.id) }}
            </span>
          </div>
          
          <div class="task-title">
            <div class="title-text">{{ task.title }}</div>
            <div class="task-description">{{ task.description }}</div>
          </div>
          
          <div class="task-assignee">
            <div class="assignee-avatar" *ngIf="task.assignee">
              {{ task.assignee.charAt(0) }}
            </div>
            <div class="assignee-name" *ngIf="task.assignee">
              {{ task.assignee }}
            </div>
            <div class="unassigned" *ngIf="!task.assignee">
              Unassigned
            </div>
          </div>
          
          <div class="task-status">
            <span class="status-badge {{ task.status }}">
              {{ task.status | titlecase }}
            </span>
          </div>
          
          <div class="task-actions">
            <button class="edit-btn" (click)="onEdit(task); $event.stopPropagation()">
              <span class="edit-icon">✎</span> Edit
            </button>
            <button class="delete-btn" (click)="onDelete(task.id); $event.stopPropagation()">
              <span class="delete-icon">🗑️</span>
            </button>
          </div>
        </div>
        
        <div class="empty-list" *ngIf="tasks.length === 0">
          <p>No tasks found matching your criteria</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .enhanced-task-list {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      background-color: white;
    }
    
    .list-header {
      display: grid;
      grid-template-columns: 60px 120px 120px 1fr 120px 120px 120px;
      background-color: #F4F5F7;
      padding: 12px 16px;
      font-weight: 500;
      color: #42526E;
      border-bottom: 1px solid #DFE1E6;
    }
    
    .list-body {
      max-height: 600px;
      overflow-y: auto;
    }
    
    .task-row {
      display: grid;
      grid-template-columns: 60px 120px 120px 1fr 120px 120px 120px;
      padding: 12px 16px;
      border-bottom: 1px solid #F4F5F7;
      align-items: center;
      transition: background-color 0.2s;
      cursor: pointer;
    }
    
    .task-row:hover {
      background-color: #F8F9FA;
    }
    
    .task-row.selected {
      background-color: #DEEBFF;
    }
    
    .task-id {
      color: #6B778C;
      font-weight: 500;
    }
    
    .task-type {
      display: flex;
      align-items: center;
    }
    
    .type-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;
      padding: 4px 8px;
      border-radius: 3px;
      font-weight: 500;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    
    .type-badge.story {
      background-color: #E3FCEF;
      color: #006644;
    }
    
    .type-badge.bug {
      background-color: #FFEBE6;
      color: #DE350B;
    }
    
    .type-badge.task {
      background-color: #DEEBFF;
      color: #0052CC;
    }
    
    .type-badge.epic {
      background-color: #EAE6FF;
      color: #403294;
    }
    
    .type-badge.subtask {
      background-color: #F4F5F7;
      color: #42526E;
    }
    
    .task-parent {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .parent-link, .subtasks-count {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 3px;
      white-space: nowrap;
    }
    
    .parent-link {
      background-color: #F4F5F7;
      color: #42526E;
      border: 1px dashed #DFE1E6;
    }
    
    .subtasks-count {
      background-color: #EAE6FF;
      color: #403294;
      border: 1px solid #C0B6F2;
    }
    
    .task-title {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .title-text {
      font-weight: 500;
      color: #172B4D;
    }
    
    .task-description {
      font-size: 0.85rem;
      color: #5E6C84;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 400px;
    }
    
    .task-assignee {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .assignee-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: #0052CC;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
    }
    
    .assignee-name {
      font-size: 0.9rem;
      color: #42526E;
    }
    
    .unassigned {
      font-size: 0.9rem;
      color: #6B778C;
      font-style: italic;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    
    .status-badge.pending {
      background-color: #FFEBE6;
      color: #DE350B;
    }
    
    .status-badge.in_progress {
      background-color: #DEEBFF;
      color: #0052CC;
    }
    
    .status-badge.blocked {
      background-color: #FFF0B3;
      color: #FF8B00;
    }
    
    .status-badge.completed {
      background-color: #E3FCEF;
      color: #006644;
    }
    
    .task-actions {
      display: flex;
      gap: 8px;
    }
    
    .edit-btn, .delete-btn {
      padding: 4px 8px;
      border-radius: 3px;
      border: none;
      cursor: pointer;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .edit-btn {
      background-color: #F4F5F7;
      color: #42526E;
    }
    
    .delete-btn {
      background-color: #FFEBE6;
      color: #DE350B;
    }
    
    .edit-btn:hover {
      background-color: #EBECF0;
    }
    
    .delete-btn:hover {
      background-color: #FFBDAD;
    }
    
    .empty-list {
      padding: 24px;
      text-align: center;
      color: #6B778C;
    }
  `]
})
export class EnhancedTaskListComponent {
  @Input() tasks: Task[] = [];
  @Input() selectedTaskId: number | undefined;
  
  @Output() taskSelect = new EventEmitter<Task>();
  @Output() taskEdit = new EventEmitter<Task>();
  @Output() taskDelete = new EventEmitter<number>();
  
  getSubtasksCount(taskId: number | undefined): number {
    if (!taskId) return 0;
    return this.tasks.filter(task => task.parentId === taskId).length;
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
  
  onTaskSelect(task: Task): void {
    this.taskSelect.emit(task);
  }
  
  onEdit(task: Task): void {
    this.taskEdit.emit(task);
  }
  
  onDelete(taskId: number | undefined): void {
    if (taskId) {
      this.taskDelete.emit(taskId);
    }
  }
}
