import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-task-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-container">
      <h2>Task Management Settings</h2>
      
      <div class="settings-section">
        <h3>Completed Tasks Retention</h3>
        <p class="description">
          Completed tasks will be automatically deleted after the specified retention period.
          This helps keep your task list clean and focused on current work.
        </p>
        
        <div class="form-group">
          <label for="retentionValue">Retention Period</label>
          <div class="input-with-unit">
            <input 
              type="number" 
              id="retentionValue" 
              [(ngModel)]="retentionValue" 
              min="1" 
              [max]="timeUnit === 'days' ? 365 : 1440"
              class="form-control"
            >
            <select 
              id="timeUnit" 
              [(ngModel)]="timeUnit" 
              class="time-unit-select"
            >
              <option value="days">Days</option>
              <option value="minutes">Minutes</option>
            </select>
            <button 
              class="save-btn" 
              [disabled]="!isFormValid() || isSaving" 
              (click)="saveSettings()"
            >
              {{ isSaving ? 'Saving...' : 'Save' }}
            </button>
          </div>
          <small class="form-hint">
            {{ timeUnit === 'days' ? 'Set between 1-365 days' : 'Set between 1-1440 minutes (up to 24 hours)' }}
            <span class="testing-note" *ngIf="timeUnit === 'minutes'">Minutes are for testing purposes only</span>
          </small>
        </div>
        
        <div class="alert alert-success" *ngIf="successMessage">
          {{ successMessage }}
        </div>
        
        <div class="alert alert-danger" *ngIf="errorMessage">
          {{ errorMessage }}
        </div>
      </div>
      
      <div class="settings-section" *ngIf="isAdmin">
        <h3>Manual Cleanup</h3>
        <p class="description">
          Manually trigger cleanup of completed tasks that are older than the specified retention period.
        </p>
        
        <button 
          class="cleanup-btn" 
          [disabled]="isRunningCleanup" 
          (click)="runManualCleanup()"
        >
          {{ isRunningCleanup ? 'Running Cleanup...' : 'Run Cleanup Now' }}
        </button>
        
        <div class="alert alert-success" *ngIf="cleanupSuccessMessage">
          {{ cleanupSuccessMessage }}
        </div>
        
        <div class="alert alert-danger" *ngIf="cleanupErrorMessage">
          {{ cleanupErrorMessage }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
      background-color: #f9f9f9;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    h2 {
      color: #172B4D;
      margin-top: 0;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #DFE1E6;
    }
    
    .settings-section {
      margin-bottom: 32px;
    }
    
    h3 {
      color: #172B4D;
      margin-top: 0;
      margin-bottom: 16px;
    }
    
    .description {
      color: #5E6C84;
      margin-bottom: 16px;
    }
    
    .form-group {
      margin-bottom: 24px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #5E6C84;
    }
    
    .input-with-unit {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    
    .time-unit-select {
      padding: 8px 12px;
      border: 1px solid #DFE1E6;
      border-radius: 4px;
      font-size: 14px;
      min-width: 100px;
    }
    
    .form-control {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #DFE1E6;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .form-control:focus {
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
    
    .testing-note {
      display: inline-block;
      margin-left: 8px;
      color: #FF5630;
      font-style: italic;
    }
    
    .save-btn, .cleanup-btn {
      background-color: #0052CC;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .save-btn:hover, .cleanup-btn:hover {
      background-color: #0747A6;
    }
    
    .save-btn:disabled, .cleanup-btn:disabled {
      background-color: #DFE1E6;
      color: #A5ADBA;
      cursor: not-allowed;
    }
    
    .cleanup-btn {
      background-color: #FF5630;
    }
    
    .cleanup-btn:hover {
      background-color: #DE350B;
    }
    
    .alert {
      padding: 12px;
      border-radius: 4px;
      margin-top: 16px;
    }
    
    .alert-success {
      background-color: #E3FCEF;
      color: #006644;
      border: 1px solid #ABF5D1;
    }
    
    .alert-danger {
      background-color: #FFEBE6;
      color: #BF2600;
      border: 1px solid #FF8F73;
    }
  `]
})
export class TaskSettingsComponent implements OnInit {
  retentionValue: number = 30;
  timeUnit: 'days' | 'minutes' = 'days';
  isSaving: boolean = false;
  isRunningCleanup: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  cleanupSuccessMessage: string = '';
  cleanupErrorMessage: string = '';
  isAdmin: boolean = false;
  
  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    // Check if user is admin
    this.isAdmin = this.authService.isAdmin();
    
    // Load current settings
    this.loadSettings();
  }
  
  loadSettings(): void {
    // In a real app, this would load from backend
    // For now, we'll just use localStorage
    const savedRetentionValue = localStorage.getItem('taskRetentionValue');
    const savedTimeUnit = localStorage.getItem('taskRetentionUnit');
    
    if (savedRetentionValue) {
      this.retentionValue = parseInt(savedRetentionValue);
    }
    
    if (savedTimeUnit && (savedTimeUnit === 'days' || savedTimeUnit === 'minutes')) {
      this.timeUnit = savedTimeUnit;
    }
  }
  
  isFormValid(): boolean {
    if (this.timeUnit === 'days') {
      return this.retentionValue >= 1 && this.retentionValue <= 365;
    } else {
      // For minutes, allow up to 1440 minutes (24 hours)
      return this.retentionValue >= 1 && this.retentionValue <= 1440;
    }
  }
  
  saveSettings(): void {
    if (!this.isFormValid()) {
      return;
    }
    
    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';
    
    // Save to localStorage
    localStorage.setItem('taskRetentionValue', this.retentionValue.toString());
    localStorage.setItem('taskRetentionUnit', this.timeUnit);
    
    // Simulate API call
    setTimeout(() => {
      this.isSaving = false;
      this.successMessage = `Settings saved successfully! Completed tasks will be deleted after ${this.retentionValue} ${this.timeUnit}.`;
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    }, 500);
  }
  
  runManualCleanup(): void {
    if (!this.isAdmin) {
      this.cleanupErrorMessage = 'Only administrators can run manual cleanup';
      return;
    }
    
    this.isRunningCleanup = true;
    this.cleanupSuccessMessage = '';
    this.cleanupErrorMessage = '';
    
    this.apiService.cleanupCompletedTasks(this.retentionValue, this.timeUnit).subscribe(
      response => {
        this.isRunningCleanup = false;
        this.cleanupSuccessMessage = response.message || 'Cleanup completed successfully!';
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.cleanupSuccessMessage = '';
        }, 3000);
      },
      error => {
        this.isRunningCleanup = false;
        this.cleanupErrorMessage = 'Error running cleanup: ' + (error.error?.error || 'Unknown error');
        console.error('Cleanup error:', error);
      }
    );
  }
}
