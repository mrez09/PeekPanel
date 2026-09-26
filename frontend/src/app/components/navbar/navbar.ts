import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { isTauri } from '@tauri-apps/api/core';

declare global {
  interface Window {
    documentPictureInPicture?: any;
  }
}

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  constructor(private router: Router) {}

  async openOverlay() {
    // =========================
    // Tauri Desktop
    // =========================
    if (isTauri()) {
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

      return;
    }

    // =========================
    // Browser - Document PiP
    // =========================
    if (window.documentPictureInPicture) {
      const existing = window.documentPictureInPicture.window;

      if (existing) {
        existing.focus();
        return;
      }

      try {
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: 420,
          height: 600,
        });

        pipWindow.document.title = 'Peek Panel';

        pipWindow.document.body.style.margin = '0';
        pipWindow.document.body.style.width = '100%';
        pipWindow.document.body.style.height = '100vh';
        pipWindow.document.body.style.overflow = 'hidden';

        const iframe = pipWindow.document.createElement('iframe');

        iframe.src = `${window.location.origin}/overlay`;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = '0';
        iframe.style.display = 'block';

        pipWindow.document.body.appendChild(iframe);

        pipWindow.addEventListener('pagehide', () => {
          console.log('PeekPanel browser overlay ditutup');
        });

        console.log('PeekPanel browser overlay berhasil dibuka');
      } catch (error) {
        console.error('Gagal membuka Document PiP:', error);
      }

      return;
    }

    // =========================
    // Browser fallback
    // =========================
    window.open('/overlay', 'peekpanel-overlay', 'width=420,height=600,resizable=yes');
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
