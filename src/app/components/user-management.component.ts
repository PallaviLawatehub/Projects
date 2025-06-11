import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, User } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="user-management-container" *ngIf="isAdmin">
      <div class="header">
        <h2>User Management</h2>
        <button class="add-user-btn" (click)="showAddUserForm = true">Add New User</button>
      </div>
      
      <!-- User Creation/Edit Form -->
      <div class="user-form-container" *ngIf="showAddUserForm">
        <div class="form-header">
          <h3>{{ isEditMode ? 'Edit User' : 'Create New User' }}</h3>
          <button class="close-btn" (click)="cancelForm()">×</button>
        </div>
        
        <div class="form-body">
          <div class="form-group">
            <label for="name">Name*</label>
            <input 
              type="text" 
              id="name" 
              [(ngModel)]="newUser.name" 
              required
              placeholder="Enter user's full name"
            >
          </div>
          
          <div class="form-group">
            <label for="email">Email*</label>
            <input 
              type="email" 
              id="email" 
              [(ngModel)]="newUser.email" 
              required
              placeholder="Enter user's email address"
            >
          </div>
          
          <div class="form-group">
            <label for="username">Username{{ isEditMode ? ' (leave blank to keep current)' : '' }}</label>
            <input 
              type="text" 
              id="username" 
              [(ngModel)]="newUser.username" 
              placeholder="{{ isEditMode ? 'Leave blank to keep current username' : 'Enter username (optional)' }}"
            >
            <small class="form-hint">If left blank, username will be generated from email</small>
          </div>
          
          <div class="form-group">
            <label for="password">Password{{ isEditMode ? ' (leave blank to keep current)' : '*' }}</label>
            <input 
              type="password" 
              id="password" 
              [(ngModel)]="newUser.password" 
              [required]="!isEditMode"
              placeholder="{{ isEditMode ? 'Leave blank to keep current password' : 'Enter password' }}"
            >
          </div>
          
          <div class="form-group">
            <label for="role">Role*</label>
            <select id="role" [(ngModel)]="newUser.role" required>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div class="form-actions">
            <button class="cancel-btn" (click)="cancelForm()">Cancel</button>
            <button 
              class="save-btn" 
              [disabled]="!isFormValid()" 
              (click)="isEditMode ? updateUser() : createUser()"
            >
              {{ isEditMode ? 'Update User' : 'Create User' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Users Table -->
      <div class="users-table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users">
              <td>{{ user.id }}</td>
              <td>{{ user.name }}</td>
              <td>{{ user.email }}</td>
              <td>
                <span class="role-badge {{ user.role }}">{{ user.role | titlecase }}</span>
              </td>
              <td>{{ user.created_at | date:'medium' }}</td>
              <td class="actions-cell">
                <button class="edit-btn" (click)="editUser(user)">Edit</button>
                <button class="delete-btn" (click)="deleteUser(user.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div class="empty-table" *ngIf="users.length === 0">
          <p>No users found</p>
        </div>
      </div>
    </div>
    
    <div class="access-denied" *ngIf="!isAdmin">
      <h2>Access Denied</h2>
      <p>You need administrator privileges to access this page.</p>
      <button class="back-btn" routerLink="/">Back to Dashboard</button>
    </div>
  `,
  styles: [`
    .user-management-container {
      padding: 24px;
      background-color: #f9f9f9;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    
    .add-user-btn {
      background-color: #0052CC;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .add-user-btn:hover {
      background-color: #0747A6;
    }
    
    .user-form-container {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      margin-bottom: 24px;
      overflow: hidden;
    }
    
    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background-color: #F4F5F7;
      border-bottom: 1px solid #DFE1E6;
    }
    
    .form-header h3 {
      margin: 0;
      color: #172B4D;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #6B778C;
    }
    
    .form-body {
      padding: 24px;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #5E6C84;
    }
    
    .form-group input,
    .form-group select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #DFE1E6;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #4C9AFF;
      box-shadow: 0 0 0 2px rgba(76, 154, 255, 0.2);
    }
    
    .form-hint {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #6B778C;
    }
    
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }
    
    .cancel-btn {
      background-color: #F4F5F7;
      color: #42526E;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .save-btn {
      background-color: #0052CC;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .save-btn:disabled {
      background-color: #DFE1E6;
      color: #A5ADBA;
      cursor: not-allowed;
    }
    
    .users-table-container {
      overflow-x: auto;
    }
    
    .users-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .users-table th,
    .users-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #DFE1E6;
    }
    
    .users-table th {
      background-color: #F4F5F7;
      color: #5E6C84;
      font-weight: 500;
    }
    
    .users-table tr:hover {
      background-color: #F8F9FA;
    }
    
    .role-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .role-badge.admin {
      background-color: #DEEBFF;
      color: #0052CC;
    }
    
    .role-badge.user {
      background-color: #E3FCEF;
      color: #006644;
    }
    
    .actions-cell {
      display: flex;
      gap: 8px;
    }
    
    .edit-btn {
      background-color: #DEEBFF;
      color: #0052CC;
      border: none;
      padding: 4px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .delete-btn {
      background-color: #FFEBE6;
      color: #DE350B;
      border: none;
      padding: 4px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .empty-table {
      padding: 24px;
      text-align: center;
      color: #6B778C;
      background-color: #F4F5F7;
      border-radius: 4px;
    }
    
    .access-denied {
      padding: 48px 24px;
      text-align: center;
      background-color: #F4F5F7;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .access-denied h2 {
      color: #DE350B;
      margin-bottom: 16px;
    }
    
    .back-btn {
      background-color: #0052CC;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 16px;
      font-weight: 500;
    }
  `]
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  isAdmin = false;
  showAddUserForm = false;
  
  newUser: User = {
    id: 0,
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'user',
    created_at: ''
  };
  
  // For edit mode
  isEditMode = false;
  editingUserId = 0;
  
  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    // Check if current user is admin
    this.isAdmin = this.authService.isAdmin();
    
    if (this.isAdmin) {
      this.loadUsers();
    }
  }
  
  loadUsers(): void {
    this.apiService.getUsers().subscribe(
      users => {
        this.users = users;
        console.log('Loaded users:', users);
      },
      error => {
        console.error('Error loading users:', error);
        alert('Failed to load users. Please check the console for details.');
      }
    );
  }
  
  isFormValid(): boolean {
    // For edit mode, password is optional
    if (this.isEditMode) {
      return !!(
        this.newUser.name &&
        this.newUser.email &&
        this.newUser.role
      );
    }
    
    // For create mode, all fields are required
    return !!(
      this.newUser.name &&
      this.newUser.email &&
      this.newUser.password &&
      this.newUser.role
    );
  }
  
  createUser(): void {
    if (!this.isFormValid()) {
      return;
    }
    
    console.log('Creating user:', this.newUser);
    
    this.apiService.createUser(this.newUser).subscribe(
      response => {
        console.log('User created successfully:', response);
        this.showAddUserForm = false;
        this.loadUsers();
        
        // Reset form
        this.resetForm();
        
        alert('User created successfully!');
      },
      error => {
        console.error('Error creating user:', error);
        alert('Failed to create user. ' + (error.error?.error || 'Please check the console for details.'));
      }
    );
  }
  
  updateUser(): void {
    if (!this.isFormValid()) {
      return;
    }
    
    console.log('Updating user:', this.newUser);
    
    this.apiService.updateUser(this.editingUserId, this.newUser).subscribe(
      response => {
        console.log('User updated successfully:', response);
        this.showAddUserForm = false;
        this.loadUsers();
        
        // Reset form and edit mode
        this.resetForm();
        
        alert('User updated successfully!');
      },
      error => {
        console.error('Error updating user:', error);
        alert('Failed to update user. ' + (error.error?.error || 'Please check the console for details.'));
      }
    );
  }
  
  cancelForm(): void {
    this.showAddUserForm = false;
    this.resetForm();
  }
  
  resetForm(): void {
    this.newUser = {
      id: 0,
      name: '',
      email: '',
      username: '',
      password: '',
      role: 'user',
      created_at: ''
    };
    this.isEditMode = false;
    this.editingUserId = 0;
  }
  
  editUser(user: User): void {
    this.isEditMode = true;
    this.editingUserId = user.id;
    
    // Clone the user object to avoid modifying the original
    this.newUser = {
      ...user,
      password: '' // Don't populate the password field for security
    };
    
    this.showAddUserForm = true;
  }
  
  deleteUser(userId: number): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.apiService.deleteUser(userId).subscribe(
        () => {
          console.log('User deleted successfully');
          this.loadUsers();
          alert('User deleted successfully!');
        },
        error => {
          console.error('Error deleting user:', error);
          alert('Failed to delete user. Please check the console for details.');
        }
      );
    }
  }
}
