import { Component, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('PeekPanel');

  constructor(private router: Router) {}

  showNavbar() {
    return this.router.url !== '/login' && this.router.url !== '/overlay';
  }
}
