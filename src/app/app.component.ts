import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <nav class="navbar" *ngIf="!isLoginPage">
      <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Task Board</a>
      <a routerLink="/list-view" routerLinkActive="active">List View</a>
      <a routerLink="/settings" routerLinkActive="active">Settings</a>
      <a routerLink="/about" routerLinkActive="active">About</a>
      <a *ngIf="isAdmin" routerLink="/users" routerLinkActive="active" class="admin-link">User Management</a>
    </nav>
    <div class="container" [ngClass]="{'login-container': isLoginPage}">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .navbar {
      display: flex;
      justify-content: center;
      gap: 24px;
      background: linear-gradient(90deg, #ffb347, #ffcc33);
      padding: 5px 0;
      position: sticky;
      top: 0;
      z-index: 200; /* Higher than other sticky elements */
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .login-container {
      margin: 0;
      padding: 0;
      max-width: 100%;
    }
    .navbar a {
      color: #fff;
      font-weight: 500;
      text-decoration: none;
      font-size: 1.1rem;
      padding: 8px 20px;
      border-radius: 20px;
      transition: background 0.2s;
    }
    .navbar a.active, .navbar a:hover {
      background: #ffb347;
    }
    .navbar a.admin-link {
      background-color: #ff8c00;
      color: white;
    }
    .navbar a.admin-link.active, .navbar a.admin-link:hover {
      background-color: #e67e00;
    }
    .container {
            margin: 0 30px;
    }
    h1 {
      text-align: center;
      color: #333;
    }
  `]
})
export class AppComponent implements OnInit {
  isAdmin = false;
  isLoginPage = false;
  
  constructor(private authService: AuthService, private router: Router) {}
  
  ngOnInit() {
    this.isAdmin = this.authService.isAdmin();
    
    // Check if current route is login page
    this.checkIfLoginPage(this.router.url);
    
    // Subscribe to route changes to check if login page
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.checkIfLoginPage(event.url);
    });
    
    // Subscribe to auth changes to update the navigation
    this.authService.authChanged.subscribe(() => {
      this.isAdmin = this.authService.isAdmin();
    });
  }
  
  /**
   * Checks if the current route is the login page
   * @param url Current router URL
   */
  private checkIfLoginPage(url: string): void {
    this.isLoginPage = url.includes('/login');
  }
}
