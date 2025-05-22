import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Task } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

// We'll use Chart.js via CDN, so we need to declare the Chart global variable
declare var Chart: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('statusPieChart') statusPieChartRef!: ElementRef;
  @ViewChild('priorityBarChart') priorityBarChartRef!: ElementRef;
  
  // Chart instances
  private statusPieChart: any;
  private priorityBarChart: any;
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  tasksByStatus: { [key: string]: Task[] } = {};
  tasksByPriority: { [key: string]: Task[] } = {};
  tasksByAssignee: { [key: string]: Task[] } = {};
  
  // My Tasks toggle
  showingMyTasks = false;
  currentUser: any = null;
  
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
  
  constructor(private apiService: ApiService, private router: Router, private authService: AuthService) {
    // Get current user
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit() {
    this.loadTasks();
    
    // Add Chart.js script to the document
    this.loadChartJsScript();
  }
  
  ngAfterViewInit() {
    // We'll initialize charts after view init and when Chart.js is loaded
    this.initChartsWhenReady();
  }

  loadTasks() {
    console.log('Loading tasks for dashboard...', this.showingMyTasks ? 'My Tasks' : 'All Tasks');
    this.apiService.getTasks().subscribe(
      tasks => {
        console.log('Tasks loaded successfully:', tasks.length);
        this.tasks = tasks;
        
        // If showing my tasks, filter by the current user's name as assignee
        if (this.showingMyTasks && this.currentUser) {
          console.log('Filtering tasks assigned to:', this.currentUser.name);
          this.filteredTasks = this.tasks.filter(task => task.assignee === this.currentUser.name);
          console.log(`Found ${this.filteredTasks.length} tasks assigned to ${this.currentUser.name}`);
        } else {
          this.filteredTasks = [...tasks]; // Set filtered tasks initially
        }
        
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
    
    // Use filtered tasks instead of all tasks
    const tasksToAnalyze = this.filteredTasks;
    
    // Process tasks
    this.totalTasks = tasksToAnalyze.length;
    this.completedTasks = 0;
    
    tasksToAnalyze.forEach(task => {
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
    
    // Update charts if they exist
    this.updateCharts();
  }
  
  /**
   * Navigate to task list view with optional status filter
   * @param status Optional status to filter by
   */
  navigateToTaskList(status?: string) {
    if (status) {
      // Navigate with query params to set the status filter
      this.router.navigate(['/list-view'], { queryParams: { status } });
    } else {
      // Navigate to task list without filters
      this.router.navigate(['/list-view']);
    }
  }
  
  /**
   * Navigate to task list view with task ID filter
   * @param taskId The ID of the task to filter by
   */
  navigateToTaskById(taskId: number | undefined) {
    if (taskId !== undefined) {
      console.log('Navigating to task with ID:', taskId);
      // Navigate with query params to set the task ID filter
      this.router.navigate(['/list-view'], { queryParams: { taskId } });
    }
  }
  
  toggleMyTasks(): void {
    this.showingMyTasks = !this.showingMyTasks;
    console.log('My Tasks toggled:', this.showingMyTasks ? 'ON' : 'OFF');
    
    // Add visual feedback
    if (this.showingMyTasks) {
      alert('Showing only tasks assigned to you');
    }
    
    this.loadTasks();
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
  
  /**
   * Loads Chart.js script from CDN
   */
  private loadChartJsScript() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.async = true;
    script.id = 'chartjs-script';
    document.head.appendChild(script);
  }
  
  /**
   * Initializes charts when Chart.js is loaded
   */
  private initChartsWhenReady() {
    const checkInterval = setInterval(() => {
      if (typeof Chart !== 'undefined' && 
          this.statusPieChartRef?.nativeElement && 
          this.priorityBarChartRef?.nativeElement) {
        clearInterval(checkInterval);
        this.initCharts();
      }
    }, 100);
    
    // Safety timeout after 5 seconds
    setTimeout(() => clearInterval(checkInterval), 5000);
  }
  
  /**
   * Initialize charts
   */
  private initCharts() {
    this.initStatusPieChart();
    this.initPriorityBarChart();
  }
  
  /**
   * Initialize status pie chart
   */
  private initStatusPieChart() {
    const ctx = this.statusPieChartRef.nativeElement.getContext('2d');
    
    // Get data for the chart
    const labels = this.statuses;
    const data = labels.map(status => this.getTaskCountByStatus(status));
    
    // Define colors for each status
    const backgroundColors = [
      '#FF8B00', // pending
      '#0052CC', // in_progress
      '#DE350B', // blocked
      '#36B37E'  // completed
    ];
    
    this.statusPieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels.map(s => s.replace('_', ' ')).map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              padding: 20,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  /**
   * Initialize priority bar chart
   */
  private initPriorityBarChart() {
    const ctx = this.priorityBarChartRef.nativeElement.getContext('2d');
    
    // Get data for the chart
    const labels = this.priorities;
    const data = labels.map(priority => this.getTaskCountByPriority(priority));
    
    // Define colors for each priority
    const backgroundColors = [
      '#00B8D9', // low
      '#0052CC', // medium
      '#FF8B00', // high
      '#DE350B'  // critical
    ];
    
    this.priorityBarChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.map(p => p.charAt(0).toUpperCase() + p.slice(1)),
        datasets: [{
          label: 'Tasks by Priority',
          data: data,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                const label = context.dataset.label || '';
                const value = context.raw || 0;
                return `${label}: ${value}`;
              }
            }
          }
        }
      }
    });
  }
  
  /**
   * Update charts with new data
   */
  private updateCharts() {
    if (this.statusPieChart) {
      const data = this.statuses.map(status => this.getTaskCountByStatus(status));
      this.statusPieChart.data.datasets[0].data = data;
      this.statusPieChart.update();
    }
    
    if (this.priorityBarChart) {
      const data = this.priorities.map(priority => this.getTaskCountByPriority(priority));
      this.priorityBarChart.data.datasets[0].data = data;
      this.priorityBarChart.update();
    }
  }
}
