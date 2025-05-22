import { Injectable, EventEmitter } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, tap, catchError, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser = this.currentUserSubject.asObservable();
  public authChanged = new EventEmitter<boolean>();
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
  }
  
  /**
   * Gets the appropriate backend URL based on environment
   * @param endpoint API endpoint path (without leading slash)
   * @returns Full URL to the API endpoint
   */
  private getBackendUrl(endpoint: string): string {
    // For Kubernetes environment, use the service name
    if (environment.production) {
      // Use the Kubernetes service name
      return `http://my-fullstack-app-backend:3000/api/${endpoint}`;
    } else {
      // For local development
      return `${this.apiUrl}/api/${endpoint}`;
    }
  }

  login(username: string, password: string): Observable<User | null> {
    const loginUrl = this.getBackendUrl('login');
    console.log('Logging in at:', loginUrl);
    
    return this.http.post<any>(loginUrl, { username, password }).pipe(
      map(response => {
        // Extract user from response
        const user = response.user;
        
        if (user) {
          // Store user details and token in local storage
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
          this.authChanged.emit(true);
          return user;
        }
        
        return null;
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => new Error(error.error?.message || 'Login failed'));
      })
    );
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.authChanged.emit(false);
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
  
  // Check if the current user has admin rights
  isAdmin(): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser ? currentUser.role === 'admin' : false;
  }
}
