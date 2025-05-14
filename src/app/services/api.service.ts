import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  created_at?: string;
}

export interface Task {
  id?: number;
  title: string;
  description: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  dueDate?: string;
  created_at?: string;
  userId?: number; // Owner of the task
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) { }
  
  /**
   * Gets the appropriate backend URL based on environment
   * @param endpoint API endpoint path (without leading slash)
   * @returns Full URL to the API endpoint
   */
  private getBackendUrl(endpoint: string): string {
    // For Kubernetes environment, use the service name
    if (environment.production) {
      // Use the Kubernetes service name from our memory
      return `http://my-fullstack-app-backend:3000/api/${endpoint}`;
    } else {
      // For local development
      return `${this.apiUrl}/api/${endpoint}`;
    }
  }

  // Get all tasks with optional filters
  getTasks(filters?: { search?: string, status?: string, priority?: string, assignee?: string }): Observable<Task[]> {
    // Make a real API call with filters as query parameters
    let params = new HttpParams();
    
    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.priority) params = params.set('priority', filters.priority);
      if (filters.assignee) params = params.set('assignee', filters.assignee);
    }
    
    // Use the correct backend URL
    const apiPath = this.getBackendUrl('tasks');
    console.log('Getting tasks from:', apiPath);
      
    return this.http.get<Task[]>(apiPath, { params });
  }

  // Get user's tasks with optional filters
  getUserTasks(filters?: { search?: string, status?: string, priority?: string, assignee?: string }): Observable<Task[]> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('No current user found. Please log in first.');
      return of([]);
    }
    
    console.log('Getting tasks for user:', currentUser, 'with filters:', filters);
    
    // Create params with user name
    let params = new HttpParams().set('name', currentUser.name || '');
    
    // Add filters if provided
    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.priority) params = params.set('priority', filters.priority);
      // No need to add assignee filter for user tasks
    }
    
    // Use the correct backend URL
    const apiPath = this.getBackendUrl(`tasks/user/${currentUser.id}`);
    console.log('Getting user tasks from:', apiPath);
    
    // Get tasks for the current user from the API with filters
    return this.http.get<Task[]>(apiPath, { params })
      .pipe(
        map(tasks => {
          console.log(`Received ${tasks.length} tasks for user ${currentUser.name} (ID: ${currentUser.id})`);
          return tasks;
        })
      );
  }
  
  // Create a new task
  createTask(task: Task): Observable<Task> {
    // Assign current user ID if available
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      task.userId = currentUser.id;
    }
    
    // Use the correct backend URL
    const apiPath = this.getBackendUrl('tasks');
    console.log('Creating task at:', apiPath, 'with data:', JSON.stringify(task));
    
    // Send the task to the API
    return this.http.post<Task>(apiPath, task);
  }

  // Update task status
  updateTaskStatus(id: number, status: string): Observable<Task> {
    // Use the correct backend URL
    const apiPath = this.getBackendUrl(`tasks/${id}`);
    console.log('Updating task status at:', apiPath, 'with status:', status);
    
    // Send a PATCH request to update just the status
    return this.http.patch<Task>(apiPath, {
      status: status as 'pending' | 'in_progress' | 'completed' | 'blocked'
    });
  }

  // Simple direct update task method that uses a specific endpoint
  updateTaskDirect(task: Task): Observable<Task> {
    if (!task.id) {
      console.error('Cannot update task: Missing task ID');
      return throwError(() => new Error('Task ID is required for updates'));
    }
    
    console.log('Updating task directly with ID:', task.id);
    
    // Create a clean copy with all necessary fields including userId
    const taskData: Task = {
      id: task.id,
      title: task.title?.trim() || '',
      description: task.description?.trim() || '',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      assignee: task.assignee || '',
      dueDate: task.dueDate || ''
    };
    
    // If userId exists, include it
    if (task.userId) {
      taskData.userId = task.userId;
    }
    
    // Use the correct backend URL
    const directUrl = this.getBackendUrl(`tasks/${task.id}`);
    
    console.log('Sending direct update to:', directUrl);
    console.log('With data:', JSON.stringify(taskData));
    
    // Make a direct HTTP request
    return this.http.put<Task>(directUrl, taskData)
      .pipe(
        map(response => {
          console.log('Direct update successful:', response);
          return response;
        }),
        catchError(error => {
          console.error('Direct update failed:', error);
          
          // Try with POST as fallback
          console.log('Trying POST as fallback...');
          return this.http.post<Task>(directUrl, taskData)
            .pipe(
              map(response => {
                console.log('POST fallback successful:', response);
                return response;
              }),
              catchError(postError => {
                console.error('POST fallback also failed:', postError);
                return throwError(() => new Error('Failed to update task: ' + (error.message || 'Unknown error')));
              })
            );
        })
      );
  }
  
  // Original update task method with multiple endpoint attempts
  updateTask(task: Task): Observable<Task> {
    // Call the direct method first
    return this.updateTaskDirect(task)
      .pipe(
        catchError(directError => {
          console.error('Direct update method failed, trying fallback methods:', directError);
          
          // If direct method fails, try the original implementation
          if (!task.id) {
            return throwError(() => new Error('Task ID is required for updates'));
          }
          
          console.log('Falling back to original update method for task ID:', task.id);
          
          // Format data exactly as expected by the backend
          const updatedTask = {
            id: task.id,
            title: task.title?.trim() || '',
            description: task.description?.trim() || '',
            status: task.status || 'pending',
            priority: task.priority || 'medium',
            assignee: task.assignee || '',
            dueDate: task.dueDate || '',
            userId: task.userId || null
          };
          
          // Try multiple API endpoint formats
          const apiPath1 = `${this.apiUrl}/api/tasks/${task.id}`;
          const apiPath2 = `${this.apiUrl}/tasks/${task.id}`;
          
          console.log('Trying fallback endpoint 1:', apiPath1);
          
          return this.http.put<Task>(apiPath1, updatedTask)
            .pipe(
              catchError(error1 => {
                console.error('Fallback endpoint 1 failed:', error1);
                console.log('Trying fallback endpoint 2:', apiPath2);
                
                return this.http.put<Task>(apiPath2, updatedTask)
                  .pipe(
                    catchError(error2 => {
                      console.error('Fallback endpoint 2 also failed:', error2);
                      return throwError(() => new Error('All update methods failed'));
                    })
                  );
              })
            );
        })
      );
  }

  // Delete task
  deleteTask(id: number): Observable<any> {
    // Use the correct backend URL
    const apiPath = this.getBackendUrl(`tasks/${id}`);
    console.log('Deleting task at:', apiPath);
    
    // Send a DELETE request
    return this.http.delete<any>(apiPath);
  }
  
  // Search tasks
  searchTasks(searchTerm: string): Observable<Task[]> {
    return this.getTasks({ search: searchTerm });
  }
  
  // Get task by ID
  getTaskById(id: number): Observable<Task> {
    // Use the correct backend URL
    const apiPath = this.getBackendUrl(`tasks/${id}`);
    console.log('Getting task by ID from:', apiPath);
    
    return this.http.get<Task>(apiPath).pipe(
      catchError(error => {
        console.error(`Error getting task with ID ${id}:`, error);
        return throwError(() => new Error(`Task with ID ${id} not found`));
      })
    );
  }
  
  // Get all users
  getUsers(): Observable<User[]> {
    // Fix for API URL path construction
    const apiPath = environment.production ? 
      `${this.apiUrl}/users` : 
      `${this.apiUrl}/api/users`;
    
    return this.http.get<User[]>(apiPath);
  }
  
  // Get user by ID
  getUser(id: number): Observable<User> {
    // Fix for API URL path construction
    const apiPath = environment.production ? 
      `${this.apiUrl}/users/${id}` : 
      `${this.apiUrl}/api/users/${id}`;
    
    return this.http.get<User>(apiPath);
  }
}
