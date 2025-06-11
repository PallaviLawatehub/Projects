import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../services/api.service';

@Component({
  selector: 'app-task-card-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="task-card-header">
      <div class="task-id-type">
        <span class="task-id">#{{ task?.id }}</span>
        <span class="task-type {{ task?.task_type || 'story' }}">
          <span class="type-icon">{{ getTaskTypeIcon(task?.task_type) }}</span>
          {{ task?.task_type || 'story' | titlecase }}
        </span>
        <span class="parent-badge" *ngIf="task?.parentId">
          <span class="link-icon">🔗</span> #{{ task?.parentId }}
        </span>
      </div>
      <div class="header-right">
        <span class="priority {{ task?.priority }}">{{ task?.priority | titlecase }}</span>
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .task-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .task-id-type {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .task-id {
      color: #6B778C;
      font-weight: 500;
    }
    
    .task-type {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;
      padding: 3px 8px;
      border-radius: 3px;
      font-weight: 500;
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
    
    .parent-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 3px;
      background-color: #F4F5F7;
      color: #42526E;
      border: 1px dashed #DFE1E6;
    }
    
    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .priority {
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 500;
    }
    
    .priority.low {
      background-color: #F4F5F7;
      color: #42526E;
    }
    
    .priority.medium {
      background-color: #FFF0B3;
      color: #FF8B00;
    }
    
    .priority.high {
      background-color: #FFEBE6;
      color: #DE350B;
    }
    
    .priority.critical {
      background-color: #FF5630;
      color: white;
    }
    
    .type-icon, .link-icon {
      font-size: 1rem;
    }
  `]
})
export class TaskCardHeaderComponent {
  @Input() task: Task | null = null;
  
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
}
