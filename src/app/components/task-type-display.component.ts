import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-task-type-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="task-type-container">
      <span class="task-type {{ taskType || 'story' }}">
        <span class="type-icon">{{ getTaskTypeIcon(taskType) }}</span>
        {{ taskType || 'story' | titlecase }}
      </span>
      
      <span class="parent-indicator" *ngIf="parentId">
        <span class="link-icon">🔗</span>
        Parent: #{{ parentId }}
      </span>
      
      <span class="subtasks-indicator" *ngIf="subtasksCount > 0">
        <span class="subtask-icon">📎</span>
        {{ subtasksCount }} Subtask{{ subtasksCount !== 1 ? 's' : '' }}
      </span>
    </div>
  `,
  styles: [`
    .task-type-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 8px 0;
    }
    
    .task-type {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;
      padding: 4px 10px;
      border-radius: 3px;
      font-weight: 500;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      margin-right: 8px;
      transition: transform 0.2s;
    }
    
    .task-type:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
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
    
    .parent-indicator, .subtasks-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 3px;
    }
    
    .parent-indicator {
      background-color: #F4F5F7;
      color: #42526E;
      border: 1px dashed #DFE1E6;
    }
    
    .subtasks-indicator {
      background-color: #EAE6FF;
      color: #403294;
      border: 1px solid #C0B6F2;
    }
  `]
})
export class TaskTypeDisplayComponent {
  @Input() taskType: string | undefined;
  @Input() parentId: number | undefined;
  @Input() subtasksCount = 0;
  
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
