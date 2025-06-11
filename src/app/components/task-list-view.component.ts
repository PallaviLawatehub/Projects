import { Component, OnInit, ViewChild, AfterViewInit, inject, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Task } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { TaskFilterComponent } from './task-filter.component';
import { TaskTypeDisplayComponent } from './task-type-display.component';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-task-list-view',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskFilterComponent, TaskTypeDisplayComponent],
  template: `
    <div class="task-list-view">
      <!-- Header section -->
      <div class="list-header">
        <h2>Task List View</h2>
        <div class="list-actions">
          <div class="export-dropdown">
            <button class="export-btn">Export Tasks</button>
            <div class="export-dropdown-content">
              <button (click)="exportTasks('json')" class="export-option">Export as JSON</button>
              <button (click)="exportTasks('csv')" class="export-option">Export as CSV</button>
            </div>
          </div>
          <button (click)="toggleImportPanel()" class="import-btn">Import Tasks</button>
          <button (click)="loadTasks()" class="refresh-btn">Refresh</button>
          <button (click)="toggleMyTasks()" class="my-tasks-btn" [class.active]="showingMyTasks">
            {{ showingMyTasks ? 'Show All Tasks' : 'My Tasks' }}
          </button>
        </div>
      </div>

      <!-- Import panel (hidden by default) -->
      <div class="import-panel" *ngIf="showImportPanel">
        <h3>Import Tasks</h3>
        <textarea [(ngModel)]="importData" placeholder="Paste JSON data here..." rows="5" class="import-textarea"></textarea>
        <div class="import-actions">
          <button (click)="importTasks()" class="confirm-import-btn">Import</button>
          <button (click)="toggleImportPanel()" class="cancel-btn">Cancel</button>
        </div>
      </div>

      <!-- Filter section -->
      <div class="filter-section">
        <app-task-filter (filtersChanged)="applyFilters($event)"></app-task-filter>
      </div>

      <!-- Tasks table -->
      <div class="tasks-table-container">
        <table class="tasks-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Description</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Task Type</th>
              <th>Assignee</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let task of filteredTasks" 
                [class.overdue]="isTaskOverdue(task)" 
                [class.due-today]="isTaskDueToday(task)"
                [class.highlighted-task]="currentFilters.taskId && task.id !== undefined && task.id.toString() === currentFilters.taskId.toString()">
              <td>{{ task.id }}</td>
              <td>{{ task.title }}</td>
              <td class="description-cell">{{ task.description }}</td>
              <td>
                <span class="status-badge {{ task.status }}">{{ task.status | titlecase }}</span>
              </td>
              <td>
                <span class="priority-badge {{ task.priority }}">{{ task.priority | titlecase }}</span>
              </td>
              <td>
                <app-task-type-display [taskType]="task.task_type" [parentId]="task.parentId"></app-task-type-display>
              </td>
              <td>{{ task.assignee }}</td>
              <td>{{ task.dueDate | date:'mediumDate' }}</td>
            </tr>
          </tbody>
        </table>
        <div class="empty-table" *ngIf="filteredTasks.length === 0">
          <p>No tasks found</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .task-list-view {
      padding: 20px;
      background-color: #f9f9f9;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .list-actions {
      display: flex;
      gap: 10px;
    }

    .export-dropdown {
      position: relative;
      display: inline-block;
    }

    .export-dropdown-content {
      display: none;
      position: absolute;
      background-color: #f9f9f9;
      min-width: 160px;
      box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
      z-index: 1;
      border-radius: 4px;
      overflow: hidden;
    }

    .export-dropdown:hover .export-dropdown-content {
      display: block;
    }

    .export-option {
      color: black;
      padding: 12px 16px;
      text-decoration: none;
      display: block;
      background-color: white;
      border: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .export-option:hover {
      background-color: #f1f1f1;
    }

    .export-btn, .import-btn, .refresh-btn, .my-tasks-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s;
    }

    .export-btn {
      background-color: #4caf50;
      color: white;
    }

    .import-btn {
      background-color: #2196f3;
      color: white;
    }

    .refresh-btn {
      background-color: #ff9800;
      color: white;
    }

    .my-tasks-btn {
      background-color: #9c27b0;
      color: white;
    }

    .my-tasks-btn.active {
      background-color: #7b1fa2;
    }

    .import-panel {
      background-color: #fff;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .import-textarea {
      width: 100%;
      padding: 10px;
      margin: 10px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      resize: vertical;
    }

    .import-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    .confirm-import-btn {
      background-color: #2196f3;
      color: white;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .cancel-btn {
      background-color: #f44336;
      color: white;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .tasks-table-container {
      overflow-x: auto;
    }

    .tasks-table {
      width: 100%;
      border-collapse: collapse;
      background-color: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .tasks-table th, .tasks-table td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }

    .tasks-table th {
      background-color: #f2f2f2;
      font-weight: 600;
    }

    .tasks-table tr:hover {
      background-color: #f5f5f5;
    }

    .description-cell {
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-badge, .priority-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      display: inline-block;
    }

    .status-badge.pending {
      background-color: #ffecb3;
      color: #ff8f00;
    }

    .status-badge.in_progress {
      background-color: #bbdefb;
      color: #1976d2;
    }

    .status-badge.completed {
      background-color: #c8e6c9;
      color: #388e3c;
    }

    .status-badge.blocked {
      background-color: #ffcdd2;
      color: #d32f2f;
    }

    .priority-badge.low {
      background-color: #e0f7fa;
      color: #00838f;
    }

    .priority-badge.medium {
      background-color: #e1f5fe;
      color: #0277bd;
    }

    .priority-badge.high {
      background-color: #fff9c4;
      color: #fbc02d;
    }

    .priority-badge.critical {
      background-color: #ffebee;
      color: #c62828;
    }

    .actions-cell {
      white-space: nowrap;
    }

    .edit-btn, .delete-btn {
      padding: 6px 12px;
      margin-right: 5px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .edit-btn {
      background-color: #2196f3;
      color: white;
    }

    .delete-btn {
      background-color: #f44336;
      color: white;
    }

    .empty-table {
      padding: 20px;
      text-align: center;
      background-color: white;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    tr.overdue {
      background-color: #ffebee;
    }

    tr.due-today {
      background-color: #fff8e1;
    }
    
    tr.highlighted-task {
      background-color: #E3FCEF; /* Light green background */
      font-weight: 600;
      animation: highlight-pulse 2s ease-in-out 3;
    }
    
    @keyframes highlight-pulse {
      0% { box-shadow: 0 0 0 0 rgba(54, 179, 126, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(54, 179, 126, 0); }
      100% { box-shadow: 0 0 0 0 rgba(54, 179, 126, 0); }
    }
  `]
})
export class TaskListViewComponent implements OnInit {
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  showingMyTasks = false;
  currentFilters: any = {};
  showImportPanel = false;
  importData = '';

  // Reference to the filter component to set filters programmatically
  @ViewChild(TaskFilterComponent) filterComponent!: TaskFilterComponent;
  
  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check for query parameters (status filter or taskId from dashboard)
    this.route.queryParams.subscribe(params => {
      // Reset current filters
      this.currentFilters = {};
      
      // If we have a status parameter, store it for when the filter component is ready
      if (params['status']) {
        console.log('Received status filter from URL:', params['status']);
        this.currentFilters.status = params['status'];
      }
      
      // If we have a taskId parameter, store it for filtering
      if (params['taskId']) {
        console.log('Received task ID filter from URL:', params['taskId']);
        this.currentFilters.taskId = params['taskId'];
      }
    });
    
    // Load tasks
    this.loadTasks();
    
    // Set a timeout to ensure the filter component is available
    setTimeout(() => {
      this.updateFilterComponentFromQueryParams();
    }, 500); // Give it some time to initialize
  }

  loadTasks(): void {
    console.log('Loading tasks...', this.showingMyTasks ? 'My Tasks' : 'All Tasks');
    
    // Initialize showingMyTasks if undefined
    if (this.showingMyTasks === undefined) {
      this.showingMyTasks = false;
    }
    
    // Check for URL parameters again to ensure we preserve them on refresh
    this.route.queryParams.subscribe(params => {
      // If we have a status parameter, preserve it
      if (params['status'] && !this.currentFilters.status) {
        console.log('Preserving status filter from URL:', params['status']);
        this.currentFilters.status = params['status'];
      }
      
      // If we have a taskId parameter, preserve it
      if (params['taskId'] && !this.currentFilters.taskId) {
        console.log('Preserving task ID filter from URL:', params['taskId']);
        this.currentFilters.taskId = params['taskId'];
      }
    }).unsubscribe(); // Unsubscribe immediately to avoid memory leaks
    
    // Load all tasks with current filters
    console.log('Loading all tasks with filters:', this.currentFilters);
    
    this.apiService.getTasks().subscribe(
      tasks => {
        console.log('All tasks loaded successfully:', tasks.length);
        this.tasks = tasks;
        this.filteredTasks = [...tasks]; // Initialize filtered tasks
        this.applyCurrentFilters(); // Apply any filters
        this.updateFilterComponentFromQueryParams();
      },
      error => {
        console.error('Error loading all tasks:', error);
        alert('Failed to load tasks. Please check the console for details.');
      }
    );
  }
  
  /**
   * Updates the filter component with values from URL query parameters
   * This is called after tasks are loaded to ensure the filter component is ready
   */
  private updateFilterComponentFromQueryParams(): void {
    console.log('Attempting to update filter component from query params');
    
    // If filter component is not available yet, retry after a delay
    if (!this.filterComponent) {
      console.log('Filter component not available yet, retrying in 300ms');
      setTimeout(() => this.updateFilterComponentFromQueryParams(), 300);
      return;
    }
    
    // Flag to track if we need to trigger filter change event
    let filtersUpdated = false;
    
    // Apply status filter if present in URL params
    if (this.currentFilters && this.currentFilters.status) {
      console.log('Setting filter component status to:', this.currentFilters.status);
      this.filterComponent.statusFilter = this.currentFilters.status;
      filtersUpdated = true;
    }
    
    // Apply priority filter if present
    if (this.currentFilters && this.currentFilters.priority) {
      console.log('Setting filter component priority to:', this.currentFilters.priority);
      this.filterComponent.priorityFilter = this.currentFilters.priority;
      filtersUpdated = true;
    }
    
    // Apply assignee filter if present
    if (this.currentFilters && this.currentFilters.assignee) {
      console.log('Setting filter component assignee to:', this.currentFilters.assignee);
      this.filterComponent.assigneeFilter = this.currentFilters.assignee;
      filtersUpdated = true;
    }
    
    // Apply task type filter if present
    if (this.currentFilters && this.currentFilters.task_type) {
      console.log('Setting filter component task type to:', this.currentFilters.task_type);
      this.filterComponent.taskTypeFilter = this.currentFilters.task_type;
      filtersUpdated = true;
    }
    
    // Apply search filter if present
    if (this.currentFilters && this.currentFilters.search) {
      console.log('Setting filter component search to:', this.currentFilters.search);
      this.filterComponent.searchTerm = this.currentFilters.search;
      filtersUpdated = true;
    }
    
    // Trigger filter change event if any filters were updated
    if (filtersUpdated) {
      console.log('Triggering filter change event');
      this.filterComponent.onFilterChange();
      
      // Apply the filters to the task list
      this.applyCurrentFilters();
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

  applyFilters(filters: any): void {
    console.log('Applying filters from filter component:', filters);
    
    // Preserve taskId filter if it exists (from URL parameters)
    const taskId = this.currentFilters.taskId;
    
    // Update current filters with new filters from the filter component
    this.currentFilters = filters;
    
    // Restore taskId filter if it was present
    if (taskId) {
      this.currentFilters.taskId = taskId;
    }
    
    // Update URL parameters to reflect the current filters
    this.updateUrlWithFilters();
    
    // Apply filters to the current tasks without reloading from API
    this.applyCurrentFilters();
  }
  
  /**
   * Updates the URL with the current filters to maintain state
   * This allows for bookmarking and sharing filtered views
   */
  private updateUrlWithFilters(): void {
    // Create query params object from current filters
    const queryParams: any = {};
    
    // Only add non-empty filters to the URL
    if (this.currentFilters.status) queryParams.status = this.currentFilters.status;
    if (this.currentFilters.priority) queryParams.priority = this.currentFilters.priority;
    if (this.currentFilters.assignee) queryParams.assignee = this.currentFilters.assignee;
    if (this.currentFilters.task_type) queryParams.task_type = this.currentFilters.task_type;
    if (this.currentFilters.taskId) queryParams.taskId = this.currentFilters.taskId;
    // Don't include search in URL as it's typically temporary
    
    // Update URL without reloading the page
    this.route.queryParams.pipe().subscribe(() => {
      // Use Router to update the URL
      import('@angular/router').then(router => {
        const injector = inject(Injector);
        const routerService = injector.get(router.Router);
        
        // Update URL with new query params, preserving the current route
        routerService.navigate([], {
          relativeTo: this.route,
          queryParams: queryParams,
          // Preserve any existing query params not explicitly overwritten
          queryParamsHandling: 'merge'
        });
      });
    }).unsubscribe();
  }

  applyCurrentFilters(): void {
    console.log('Applying current filters:', this.currentFilters);
    
    // Start with all tasks
    let filtered = [...this.tasks];
    
    // Apply taskId filter if present (highest priority filter)
    if (this.currentFilters.taskId) {
      const taskId = this.currentFilters.taskId.toString();
      filtered = filtered.filter((task: Task) => 
        task.id !== undefined && task.id.toString() === taskId
      );
      
      // If we found the task by ID, highlight it visually
      if (filtered.length === 1) {
        console.log(`Found task with ID ${taskId}:`, filtered[0]);
        // We'll add a visual highlight in the HTML template
      } else if (filtered.length === 0) {
        console.log(`No task found with ID ${taskId}`);
      }
    } else {
      // Apply search filter if present
      if (this.currentFilters.search) {
        const searchTerm = this.currentFilters.search.toLowerCase();
        filtered = filtered.filter((task: Task) => 
          // Search by task ID (convert to string for comparison)
          (task.id !== undefined && task.id.toString().includes(searchTerm)) ||
          // Search by title
          task.title.toLowerCase().includes(searchTerm) || 
          // Search by description
          (task.description && task.description.toLowerCase().includes(searchTerm)) ||
          // Search by task type
          (task.task_type && task.task_type.toLowerCase().includes(searchTerm)) ||
          // Search by assignee
          (task.assignee && task.assignee.toLowerCase().includes(searchTerm))
        );
      }
      
      // Apply status filter if present
      if (this.currentFilters.status) {
        filtered = filtered.filter((task: Task) => task.status === this.currentFilters.status);
      }
      
      // Apply priority filter if present
      if (this.currentFilters.priority) {
        filtered = filtered.filter((task: Task) => task.priority === this.currentFilters.priority);
      }
      
      // Apply assignee filter if present
      if (this.currentFilters.assignee) {
        filtered = filtered.filter((task: Task) => task.assignee === this.currentFilters.assignee);
      }
      
      // Apply task type filter if present
      if (this.currentFilters.task_type) {
        filtered = filtered.filter((task: Task) => task.task_type === this.currentFilters.task_type);
      }
      
      // Apply my tasks filter if enabled
      if (this.showingMyTasks) {
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.name) {
          filtered = filtered.filter((task: Task) => task.assignee === currentUser.name);
        }
      }
    }
    
    // Update filtered tasks
    this.filteredTasks = filtered;
    console.log('Filtered tasks:', this.filteredTasks.length);
  }

  exportTasks(format: 'json' | 'csv' = 'json'): void {
    try {
      let blob: Blob;
      let fileName: string;
      
      if (format === 'json') {
        // Create a JSON string of the tasks
        const tasksJson = JSON.stringify(this.filteredTasks, null, 2);
        
        // Create a blob with the JSON data
        blob = new Blob([tasksJson], { type: 'application/json' });
        fileName = `tasks-export-${new Date().toISOString().slice(0, 10)}.json`;
      } else {
        // Create CSV content
        const csvContent = this.convertTasksToCSV(this.filteredTasks);
        
        // Create a blob with the CSV data
        blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        fileName = `tasks-export-${new Date().toISOString().slice(0, 10)}.csv`;
      }
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a link element
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      
      // Append the link to the body
      document.body.appendChild(a);
      
      // Click the link to trigger the download
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log(`Tasks exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error(`Error exporting tasks as ${format}:`, error);
      alert(`Failed to export tasks as ${format.toUpperCase()}. Please try again.`);
    }
  }

  toggleImportPanel(): void {
    this.showImportPanel = !this.showImportPanel;
    if (!this.showImportPanel) {
      this.importData = ''; // Clear the import data when closing the panel
    }
  }

  importTasks(): void {
    if (!this.importData.trim()) {
      alert('Please paste valid JSON data to import.');
      return;
    }
    
    try {
      // Parse the JSON data
      const tasksData = JSON.parse(this.importData);
      
      if (!Array.isArray(tasksData)) {
        throw new Error('Imported data is not an array of tasks.');
      }
      
      // Validate each task
      const validTasks = tasksData.filter(task => {
        return task && typeof task === 'object' && 
               typeof task.title === 'string' && 
               typeof task.description === 'string';
      });
      
      if (validTasks.length === 0) {
        throw new Error('No valid tasks found in the imported data.');
      }
      
      // Confirm import
      if (confirm(`Import ${validTasks.length} tasks?`)) {
        // For each task, create it via the API
        let importedCount = 0;
        let failedCount = 0;
        
        const importPromises = validTasks.map(task => {
          // Create a new task object with required fields
          const newTask: Task = {
            title: task.title,
            description: task.description,
            status: task.status || 'pending',
            priority: task.priority || 'medium',
            assignee: task.assignee || '',
            dueDate: task.dueDate || ''
          };
          
          // Return a promise for this task creation
          return new Promise<void>((resolve) => {
            this.apiService.createTask(newTask).subscribe({
              next: () => {
                importedCount++;
                resolve();
              },
              error: (error) => {
                console.error('Error importing task:', error, newTask);
                failedCount++;
                resolve();
              }
            });
          });
        });
        
        // Wait for all imports to complete
        Promise.all(importPromises).then(() => {
          alert(`Import complete: ${importedCount} tasks imported, ${failedCount} failed.`);
          this.toggleImportPanel();
          this.loadTasks(); // Refresh the task list
        });
      }
    } catch (error) {
      console.error('Error parsing import data:', error);
      alert(`Failed to import tasks: ${error instanceof Error ? error.message : 'Invalid JSON format'}`);
    }
  }

  editTask(task: Task): void {
    // Navigate to the task edit page or open a dialog
    // This would typically be implemented with a router or dialog service
    alert('Edit functionality would open a dialog or navigate to edit page for task #' + task.id);
  }

  deleteTask(taskId: number): void {
    // Check if the current user is an admin
    if (!this.isAdmin()) {
      alert('Only administrators can delete tasks.');
      return;
    }

    if (confirm('Are you sure you want to delete this task?')) {
      console.log(`Deleting task ${taskId}`);
      this.apiService.deleteTask(taskId).subscribe(
        () => {
          console.log('Task deleted successfully');
          this.loadTasks();
        },
        (error: any) => {
          console.error('Error deleting task:', error);
          alert('Failed to delete task. Please check the console for details.');
        }
      );
    }
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isTaskOverdue(task: Task): boolean {
    if (!task.dueDate) return false;
    
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    return dueDate < today;
  }

  isTaskDueToday(task: Task): boolean {
    if (!task.dueDate) return false;
    
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    
    return dueDate.getDate() === today.getDate() &&
           dueDate.getMonth() === today.getMonth() &&
           dueDate.getFullYear() === today.getFullYear();
  }
  
  /**
   * Converts an array of tasks to CSV format
   * @param tasks The tasks to convert
   * @returns CSV formatted string
   */
  private convertTasksToCSV(tasks: Task[]): string {
    if (tasks.length === 0) {
      return 'id,title,description,status,priority,task_type,assignee,dueDate';
    }
    
    // Create header row
    const headers = ['id', 'title', 'description', 'status', 'priority', 'task_type', 'assignee', 'dueDate'];
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    tasks.forEach(task => {
      const row = [
        task.id?.toString() || '',
        this.escapeCSVField(task.title || ''),
        this.escapeCSVField(task.description || ''),
        task.status || '',
        task.priority || '',
        task.task_type || '',
        this.escapeCSVField(task.assignee || ''),
        task.dueDate || ''
      ];
      csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
  }
  
  /**
   * Escapes special characters in CSV fields
   * @param field Field value to escape
   * @returns Escaped field value
   */
  private escapeCSVField(field: string): string {
    // If the field contains commas, quotes, or newlines, wrap it in quotes
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      // Replace any quotes with double quotes (CSV standard for escaping quotes)
      return `"${field.replace(/"/g, '""')}"`;  
    }
    return field;
  }
}
