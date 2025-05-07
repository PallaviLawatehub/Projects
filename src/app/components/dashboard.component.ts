import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Task } from '../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  tasks: Task[] = [];
  tasksByStatus: { [key: string]: Task[] } = {};
  tasksByPriority: { [key: string]: Task[] } = {};
  tasksByAssignee: { [key: string]: Task[] } = {};
  
  statuses = ['pending', 'in_progress', 'blocked', 'completed'];
  priorities = ['low', 'medium', 'high', 'critical'];
  users = ['John Doe', 'Jane Smith', 'Alex Johnson', 'Sam Wilson'];
  
  totalTasks = 0;
  completedTasks = 0;
  completionRate = 0;
  
  showAddTaskForm = false;
  
  newTask: Task = {
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    assignee: '',
    dueDate: ''  
  };
  
  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit() {
    this.loadTasks();
  }

  loadTasks() {
    console.log('Loading tasks for dashboard...');
    this.apiService.getTasks().subscribe(
      tasks => {
        console.log('Tasks loaded successfully:', tasks);
        this.tasks = tasks;
        this.analyzeTaskData();
      },
      error => {
        console.error('Error loading tasks:', error);
        alert('Failed to load tasks. Please check the console for details.');
      }
    );
  }

  analyzeTaskData() {
    // Reset data
    this.tasksByStatus = {};
    this.tasksByPriority = {};
    this.tasksByAssignee = {};
    
    // Initialize empty arrays for each status, priority, and assignee
    this.statuses.forEach(status => this.tasksByStatus[status] = []);
    this.priorities.forEach(priority => this.tasksByPriority[priority] = []);
    
    // Process tasks
    this.totalTasks = this.tasks.length;
    this.completedTasks = 0;
    
    this.tasks.forEach(task => {
      // Group by status
      if (task.status) {
        if (!this.tasksByStatus[task.status]) {
          this.tasksByStatus[task.status] = [];
        }
        this.tasksByStatus[task.status].push(task);
        
        if (task.status === 'completed') {
          this.completedTasks++;
        }
      }
      
      // Group by priority
      if (task.priority) {
        if (!this.tasksByPriority[task.priority]) {
          this.tasksByPriority[task.priority] = [];
        }
        this.tasksByPriority[task.priority].push(task);
      }
      
      // Group by assignee
      if (task.assignee) {
        if (!this.tasksByAssignee[task.assignee]) {
          this.tasksByAssignee[task.assignee] = [];
        }
        this.tasksByAssignee[task.assignee].push(task);
      }
    });
    
    // Calculate completion rate
    this.completionRate = this.totalTasks > 0 ? Math.round((this.completedTasks / this.totalTasks) * 100) : 0;
  }
  
  navigateToTaskList() {
    this.router.navigate(['/']);
  }
  
  addTask() {
    console.log('Adding task:', this.newTask);
    this.apiService.createTask(this.newTask).subscribe(
      (createdTask) => {
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
        // Reload tasks to update dashboard
        this.loadTasks();
        // Optionally hide the form after successful submission
        this.showAddTaskForm = false;
      },
      error => {
        console.error('Error creating task:', error);
        alert('Failed to create task. Please check the console for details.');
      }
    );
  }
  
  getTaskCountByStatus(status: string): number {
    return this.tasksByStatus[status]?.length || 0;
  }
  
  getTaskCountByPriority(priority: string): number {
    return this.tasksByPriority[priority]?.length || 0;
  }
  
  getStatusPercentage(status: string): number {
    return this.totalTasks > 0 ? Math.round((this.getTaskCountByStatus(status) / this.totalTasks) * 100) : 0;
  }
  
  getPriorityPercentage(priority: string): number {
    return this.totalTasks > 0 ? Math.round((this.getTaskCountByPriority(priority) / this.totalTasks) * 100) : 0;
  }
}
