import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Task } from '../services/api.service';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="task-form">
      <h2>Add New Task</h2>
      <form (ngSubmit)="onSubmit()" #taskForm="ngForm">
        <div class="form-group">
          <label for="title">Title:</label>
          <input
            type="text"
            id="title"
            name="title"
            [(ngModel)]="task.title"
            required
            class="form-control"
            placeholder="Task title"
          >
        </div>
        
        <div class="form-group">
          <label for="description">Description:</label>
          <textarea
            id="description"
            name="description"
            [(ngModel)]="task.description"
            required
            class="form-control"
            placeholder="Task description"
          ></textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group half-width">
            <label for="assignee">Assignee:</label>
            <select
              id="assignee"
              name="assignee"
              [(ngModel)]="task.assignee"
              class="form-control"
            >
              <option value="">Unassigned</option>
              @for (user of users; track user) {
                <option [value]="user">{{ user }}</option>
              }
            </select>
          </div>
          
          <div class="form-group half-width">
            <label for="priority">Priority:</label>
            <select
              id="priority"
              name="priority"
              [(ngModel)]="task.priority"
              required
              class="form-control"
            >
              @for (priority of priorities; track priority) {
                <option [value]="priority">{{ priority | titlecase }}</option>
              }
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group half-width">
            <label for="status">Status:</label>
            <select
              id="status"
              name="status"
              [(ngModel)]="task.status"
              required
              class="form-control"
            >
              @for (status of statuses; track status) {
                <option [value]="status">{{ status | titlecase }}</option>
              }
            </select>
          </div>
          
          <div class="form-group half-width">
            <label for="dueDate">Due Date:</label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              [(ngModel)]="task.dueDate"
              class="form-control"
            >
          </div>
        </div>
        
        <button type="submit" [disabled]="!taskForm.form.valid" class="submit-btn">Add Task</button>
      </form>
    </div>
  `,
  styles: [`
    .task-form {
      max-width: 600px;
      margin: 0 auto;
      padding: 24px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    }
    h2 {
      color: #172B4D;
      margin-bottom: 20px;
      font-size: 1.5rem;
    }
    .form-group {
      margin-bottom: 18px;
    }
    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 18px;
    }
    .half-width {
      flex: 1;
      margin-bottom: 0;
    }
    label {
      display: block;
      margin-bottom: 6px;
      color: #5E6C84;
      font-weight: 500;
      font-size: 0.9rem;
    }
    .form-control {
      width: 100%;
      padding: 10px;
      border: 1px solid #DFE1E6;
      border-radius: 4px;
      box-sizing: border-box;
      font-size: 1rem;
      transition: border-color 0.2s;
    }
    .form-control:focus {
      outline: none;
      border-color: #4C9AFF;
      box-shadow: 0 0 0 2px rgba(76,154,255,0.2);
    }
    textarea {
      min-height: 120px;
      resize: vertical;
    }
    .submit-btn {
      background: #0052CC;
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 500;
      transition: background 0.2s;
      margin-top: 8px;
    }
    .submit-btn:hover {
      background: #0747A6;
    }
    .submit-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    select.form-control {
      appearance: none;
      background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23172B4D' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 16px;
      padding-right: 32px;
    }
  `]
})
export class TaskFormComponent {
  task: Task = {
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    assignee: '',
    dueDate: ''
  };

  priorities = ['low', 'medium', 'high', 'critical'];
  statuses = ['pending', 'in_progress', 'completed', 'blocked'];
  users = ['John Doe', 'Jane Smith', 'Alex Johnson', 'Sam Wilson'];

  constructor(private apiService: ApiService, private router: Router) {}

  onSubmit() {
    console.log('Submitting task:', this.task);
    this.apiService.createTask(this.task).subscribe(
      (createdTask) => {
        console.log('Task created successfully:', createdTask);
        // Reset form
        this.task = {
          title: '',
          description: ''
        };
        // Emit event to refresh task list
        window.dispatchEvent(new CustomEvent('taskAdded'));
        // Navigate to the task list
        console.log('Navigating to task list...');
        this.router.navigate(['/']);
      },
      error => {
        console.error('Error creating task:', error);
        alert('Failed to create task. Please check the console for details.');
      }
    );
  }
}
