import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
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
    
    // Fix for API URL path construction
    const apiPath = environment.production ? 
      `${this.apiUrl}/tasks` : 
      `${this.apiUrl}/api/tasks`;
      
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
    
    // Fix for API URL path construction
    const apiPath = environment.production ? 
      `${this.apiUrl}/tasks/user/${currentUser.id}` : 
      `${this.apiUrl}/api/tasks/user/${currentUser.id}`;
    
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
    
    // Fix for API URL path construction
    const apiPath = environment.production ? 
      `${this.apiUrl}/tasks` : 
      `${this.apiUrl}/api/tasks`;
    
    // Send the task to the API
    return this.http.post<Task>(apiPath, task);
  }

  // Update task status
  updateTaskStatus(id: number, status: string): Observable<Task> {
    // Fix for API URL path construction
    const apiPath = environment.production ? 
      `${this.apiUrl}/tasks/${id}` : 
      `${this.apiUrl}/api/tasks/${id}`;
    
    // Send a PATCH request to update just the status
    return this.http.patch<Task>(apiPath, {
      status: status as 'pending' | 'in_progress' | 'completed' | 'blocked'
    });
  }

  // Update task
  updateTask(task: Task): Observable<Task> {
    if (!task.id) {
      console.error('Cannot update task: Missing task ID');
      return of({} as Task);
    }
    
    // Format data exactly as expected by the backend
    // The backend expects these specific fields in this format
    const updatedTask = {
      title: task.title?.trim() || '',
      description: task.description?.trim() || '',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      assignee: task.assignee || null,  // Backend expects null for empty assignee
      dueDate: task.dueDate || null,    // Backend expects null for empty dueDate
      userId: task.userId || null       // Backend expects null for empty userId
    };
    
    console.log('Sending task update request:', updatedTask);
    
    // Fix for API URL path construction
    // In production, environment.apiUrl is '/api' and we don't want to double the /api prefix
    const apiPath = environment.production ? 
      `${this.apiUrl}/tasks/${task.id}` : 
      `${this.apiUrl}/api/tasks/${task.id}`;
    
    console.log('Using API path:', apiPath);
    
    // Send a PUT request to update the entire task
    return this.http.put<Task>(apiPath, updatedTask);
  }

  // Delete task
  deleteTask(id: number): Observable<any> {
    // Fix for API URL path construction
    const apiPath = environment.production ? 
      `${this.apiUrl}/tasks/${id}` : 
      `${this.apiUrl}/api/tasks/${id}`;
    
    // Send a DELETE request
    return this.http.delete<any>(apiPath);
  }
  
  // Search tasks
  searchTasks(searchTerm: string): Observable<Task[]> {
    return this.getTasks({ search: searchTerm });
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
