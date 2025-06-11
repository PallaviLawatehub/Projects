import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../services/api.service';

@Component({
  selector: 'app-task-hierarchy-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="hierarchy-container" *ngIf="showIndicator">
      <!-- Parent task reference -->
      <div class="parent-reference" *ngIf="task?.parentId">
        <span class="link-icon">🔗</span>
        <span class="reference-text">Parent: #{{ task?.parentId }}</span>
      </div>
      
      <!-- Subtasks count -->
      <div class="subtasks-count" *ngIf="subtasksCount > 0">
        <span class="subtask-icon">📎</span>
        <span class="count-text">{{ subtasksCount }} Subtask{{ subtasksCount !== 1 ? 's' : '' }}</span>
      </div>
    </div>
  `,
  styles: [`
    .hierarchy-container {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .parent-reference, .subtasks-count {
      display: inline-flex;
      align-items: center;
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 3px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .parent-reference {
      background-color: #F4F5F7;
      color: #42526E;
      border: 1px dashed #DFE1E6;
    }
    
    .subtasks-count {
      background-color: #EAE6FF;
      color: #403294;
      border: 1px solid #C0B6F2;
    }
    
    .link-icon, .subtask-icon {
      margin-right: 4px;
    }
    
    .reference-text, .count-text {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class TaskHierarchyIndicatorComponent implements OnChanges {
  @Input() task: Task | null = null;
  @Input() subtasksCount = 0;
  
  showIndicator = false;
  
  ngOnChanges(changes: SimpleChanges): void {
    // Show the indicator if the task has a parent or has subtasks
    this.showIndicator = !!(this.task?.parentId || this.subtasksCount > 0);
  }
}
