import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <nav class="navbar">
      <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
      <a routerLink="/" routerLinkActive="active">Task Board</a>
      <a routerLink="/list-view" routerLinkActive="active">List View</a>
      <a routerLink="/about" routerLinkActive="active">About</a>
    </nav>
    <div class="container">
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
    .container {
            margin: 0 30px;
    }
    h1 {
      text-align: center;
      color: #333;
    }
  `]
})
export class AppComponent {}
