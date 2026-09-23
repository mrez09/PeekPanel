import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  userName = signal('');
  userEmail = signal('');

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    console.log('Dashboard ngOnInit jalan');

    this.authService.getMe().subscribe({
      next: (user) => {
        this.userName.set(user.name);
        this.userEmail.set(user.email);
      },
      error: () => {
        localStorage.removeItem('token');
        this.router.navigate(['/login']);
      },
    });
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
