import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PeekService } from '../../services/peek.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  userName = signal('');
  userEmail = signal('');

  peekCount = signal(0);
  categoryCount = signal(0);

  constructor(
    private router: Router,
    private authService: AuthService,
    private peekService: PeekService,
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

    this.peekService.getPeeks().subscribe({
      next: (peeks) => {
        this.peekCount.set(peeks.length);
      },
    });

    this.peekService.getCategories().subscribe({
      next: (categories) => {
        this.categoryCount.set(categories.length);
      },
    });
  }

  goToPeeks() {
    this.router.navigate(['/peeks']);
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
