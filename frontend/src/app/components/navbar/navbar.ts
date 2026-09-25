import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { isTauri } from '@tauri-apps/api/core';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  constructor(private router: Router) {}

  async openOverlay() {
    if (!isTauri()) {
      window.open('/overlay', 'peekpanel-overlay', 'width=420,height=600,resizable=yes');

      return;
    }

    const existing = await WebviewWindow.getByLabel('overlay');

    if (existing) {
      await existing.show();
      await existing.setFocus();
      return;
    }

    const overlay = new WebviewWindow('overlay', {
      url: '/overlay',
      title: 'Peek Panel',
      width: 420,
      height: 600,
      resizable: true,
      alwaysOnTop: true,
    });

    overlay.once('tauri://created', () => {
      console.log('PeekPanel overlay berhasil dibuka');
    });

    overlay.once('tauri://error', (error) => {
      console.error('Gagal membuka overlay:', error);
    });
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
