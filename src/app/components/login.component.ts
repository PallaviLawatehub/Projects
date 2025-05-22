import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h2>Task Manager Login</h2>
        
        <div class="alert alert-danger" *ngIf="errorMessage">
          {{ errorMessage }}
        </div>
        
        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label for="username">Username</label>
            <input 
              type="text" 
              id="username" 
              name="username" 
              [(ngModel)]="username" 
              required 
              class="form-control"
              placeholder="Enter username"
            >
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              [(ngModel)]="password" 
              required 
              class="form-control"
              placeholder="Enter password"
            >
          </div>
          
          <div class="form-actions">
            <button 
              type="submit" 
              [disabled]="!loginForm.form.valid || isLoading" 
              class="login-btn"
            >
              {{ isLoading ? 'Logging in...' : 'Login' }}
            </button>
          </div>
          
          <div class="demo-accounts">
            <p>Demo Accounts:</p>
            <ul>
              <li><strong>Admin:</strong> johndoe (password: password123)</li>
              <li><strong>User:</strong> janesmith (password: password123)</li>
              <li><strong>User:</strong> alexjohnson (password: password123)</li>
              <li><strong>User:</strong> samwilson (password: password123)</li>
            </ul>
            <p class="note">Note: Use the exact credentials shown above</p>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
    }
    
    .login-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      padding: 32px;
      width: 100%;
      max-width: 400px;
    }
    
    h2 {
      color: #172B4D;
      margin-top: 0;
      margin-bottom: 24px;
      text-align: center;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: #5E6C84;
    }
    
    .form-control {
      width: 100%;
      padding: 10px;
      border: 1px solid #DFE1E6;
      border-radius: 4px;
      font-size: 16px;
    }
    
    .form-control:focus {
      outline: none;
      border-color: #4C9AFF;
      box-shadow: 0 0 0 2px rgba(76, 154, 255, 0.2);
    }
    
    .form-actions {
      margin-top: 24px;
    }
    
    .login-btn {
      width: 100%;
      padding: 12px;
      background-color: #0052CC;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .login-btn:hover {
      background-color: #0747A6;
    }
    
    .login-btn:disabled {
      background-color: #DFE1E6;
      color: #5E6C84;
      cursor: not-allowed;
    }
    
    .alert {
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    
    .alert-danger {
      background-color: #FFEBE6;
      color: #BF2600;
      border: 1px solid #FF8F73;
    }
    
    .demo-accounts {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #DFE1E6;
      font-size: 14px;
      color: #5E6C84;
    }
    
    .demo-accounts p {
      margin: 8px 0;
    }
    
    .demo-accounts ul {
      padding-left: 20px;
      margin: 8px 0;
    }
    
    .note {
      font-style: italic;
      font-size: 12px;
    }
  `]
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.authService.login(this.username, this.password).subscribe(
      user => {
        this.isLoading = false;
        if (user) {
          // Navigate to dashboard on successful login
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = 'Invalid username or password';
        }
      },
      error => {
        this.isLoading = false;
        this.errorMessage = 'An error occurred during login. Please try again.';
        console.error('Login error:', error);
      }
    );
  }
}
