import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

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
  
  // Mock users for demo purposes
  private users: User[] = [
    { id: 1, username: 'johndoe', email: 'john@example.com', name: 'John Doe', role: 'admin' },
    { id: 2, username: 'janesmith', email: 'jane@example.com', name: 'Jane Smith', role: 'user' },
    { id: 3, username: 'alexjohnson', email: 'alex@example.com', name: 'Alex Johnson', role: 'user' },
    { id: 4, username: 'samwilson', email: 'sam@example.com', name: 'Sam Wilson', role: 'user' }
  ];

  constructor() {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
  }

  login(username: string, password: string): Observable<User | null> {
    // In a real app, this would make an HTTP request to a backend API
    const user = this.users.find(u => u.username === username);
    
    // Mock authentication - in a real app, you'd verify the password
    if (user) {
      // Simulate API delay
      return of(user).pipe(
        delay(500),
        tap(user => {
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        })
      );
    }
    
    return of(null).pipe(delay(500));
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
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
