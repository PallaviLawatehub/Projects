import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../services/api.service';

@Component({
  selector: 'app-tabular-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tabular-task-list">
      <table class="task-table">
        <thead>
          <tr>
            <th class="id-column">ID</th>
            <th class="type-column">Type</th>
            <th class="title-column">Title</th>
            <th class="parent-column">Parent</th>
            <th class="assignee-column">Assignee</th>
            <th class="status-column">Status</th>
            <th class="actions-column">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let task of tasks" 
              [class.selected]="selectedTaskId === task.id"
              (click)="onTaskSelect(task)">
            <td class="id-column">#{{ task.id }}</td>
            <td class="type-column">
              <span class="type-badge {{ task.task_type || 'story' }}">
                <span class="type-icon">{{ getTaskTypeIcon(task.task_type) }}</span>
                {{ task.task_type || 'story' | titlecase }}
              </span>
            </td>
            <td class="title-column">
              <div class="title-text">{{ task.title }}</div>
              <div class="description-text">{{ task.description }}</div>
            </td>
            <td class="parent-column">
              <span class="parent-link" *ngIf="task.parentId">
                <span class="link-icon">🔗</span> #{{ task.parentId }}
              </span>
              <span class="subtasks-count" *ngIf="getSubtasksCount(task.id) > 0">
                <span class="subtask-icon">📎</span> {{ getSubtasksCount(task.id) }}
              </span>
            </td>
            <td class="assignee-column">
              <div class="assignee" *ngIf="task.assignee">
                <span class="avatar">{{ task.assignee.charAt(0) }}</span>
                <span class="name">{{ task.assignee }}</span>
              </div>
              <div class="unassigned" *ngIf="!task.assignee">Unassigned</div>
            </td>
            <td class="status-column">
              <span class="status-badge {{ task.status }}">
                {{ task.status | titlecase }}
              </span>
            </td>
            <td class="actions-column">
              <button class="edit-btn" (click)="onEdit(task); $event.stopPropagation()">
                <span class="edit-icon">✎</span>
              </button>
              <button class="delete-btn" (click)="onDelete(task.id); $event.stopPropagation()">
                <span class="delete-icon">🗑️</span>
              </button>
            </td>
          </tr>
          <tr *ngIf="tasks.length === 0">
            <td colspan="7" class="empty-message">No tasks found matching your criteria</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .tabular-task-list {
      width: 100%;
      overflow-x: auto;
    }
    
    .task-table {
      width: 100%;
      border-collapse: collapse;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      background-color: white;
      border-radius: 8px;
      overflow: hidden;
    }
    
    thead {
      background-color: #F4F5F7;
      color: #42526E;
      font-weight: 500;
    }
    
    th {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #DFE1E6;
      white-space: nowrap;
    }
    
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #F4F5F7;
      vertical-align: middle;
    }
    
    tr:hover {
      background-color: #F8F9FA;
    }
    
    tr.selected {
      background-color: #DEEBFF;
    }
    
    .id-column {
      width: 60px;
      color: #6B778C;
      font-weight: 500;
    }
    
    .type-column {
      width: 120px;
    }
    
    .title-column {
      min-width: 250px;
    }
    
    .parent-column {
      width: 120px;
    }
    
    .assignee-column {
      width: 120px;
    }
    
    .status-column {
      width: 120px;
    }
    
    .actions-column {
      width: 100px;
      text-align: center;
    }
    
    .title-text {
      font-weight: 500;
      color: #172B4D;
      margin-bottom: 4px;
    }
    
    .description-text {
      font-size: 0.85rem;
      color: #5E6C84;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 400px;
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
      white-space: nowrap;
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
    
    .parent-link, .subtasks-count {
      display: block;
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 3px;
      white-space: nowrap;
      margin-bottom: 4px;
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
    
    .assignee {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .avatar {
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
      white-space: nowrap;
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
    
    .edit-btn, .delete-btn {
      padding: 6px;
      border-radius: 3px;
      border: none;
      cursor: pointer;
      margin: 0 2px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
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
    
    .empty-message {
      text-align: center;
      padding: 24px;
      color: #6B778C;
      font-style: italic;
    }
  `]
})
export class TabularTaskListComponent {
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
