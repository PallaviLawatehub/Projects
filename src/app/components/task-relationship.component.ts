import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../services/api.service';

@Component({
  selector: 'app-task-relationship',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="task-relationships">
      <!-- Parent task reference -->
      <div class="parent-link" *ngIf="task?.parentId">
        <span class="link-icon">🔗</span>
        <span>Parent: #{{ task?.parentId }}</span>
      </div>
      
      <!-- Subtask indicator -->
      <div class="subtask-count" *ngIf="hasSubtasks">
        <span class="subtask-icon">📎</span>
        <span>{{ subtaskCount }} Subtask{{ subtaskCount !== 1 ? 's' : '' }}</span>
      </div>
    </div>
  `,
  styles: [`
    .task-relationships {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .parent-link {
      display: inline-flex;
      align-items: center;
      font-size: 0.75rem;
      padding: 2px 6px;
      background-color: #F4F5F7;
      border-radius: 3px;
      color: #42526E;
      border: 1px dashed #DFE1E6;
      width: fit-content;
    }
    
    .subtask-count {
      display: inline-flex;
      align-items: center;
      font-size: 0.75rem;
      padding: 2px 6px;
      background-color: #EAE6FF;
      border-radius: 3px;
      color: #403294;
      border: 1px solid #C0B6F2;
      width: fit-content;
    }
    
    .link-icon, .subtask-icon {
      margin-right: 4px;
    }
  `]
})
export class TaskRelationshipComponent {
  @Input() task: Task | null = null;
  @Input() hasSubtasks = false;
  @Input() subtaskCount = 0;
}
