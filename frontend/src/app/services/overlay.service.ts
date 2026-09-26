import { Injectable } from '@angular/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { isTauri } from '@tauri-apps/api/core';

declare global {
  interface Window {
    documentPictureInPicture?: any;
  }
}

@Injectable({
  providedIn: 'root',
})
export class OverlayService {
  async openOverlay(playlistId?: number, peekId?: number) {
    const params = new URLSearchParams();

    if (playlistId !== undefined) {
      params.set('playlistId', playlistId.toString());
    }

    if (peekId !== undefined) {
      params.set('peekId', peekId.toString());
    }

    const query = params.toString();
    //const overlayUrl = query ? `/overlay?${query}` : '/overlay';
    const overlayUrl =
      playlistId !== undefined && peekId !== undefined
        ? `/playlists/${playlistId}/peek/${peekId}`
        : `/overlay`;

    if (isTauri()) {
      const existing = await WebviewWindow.getByLabel('overlay');

      if (existing) {
        await existing.show();
        await existing.setFocus();
        return;
      }

      const overlay = new WebviewWindow('overlay', {
        url: `${window.location.origin}${overlayUrl}`,
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

        iframe.src = `${window.location.origin}${overlayUrl}`;
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

    window.open(overlayUrl, 'peekpanel-overlay', 'width=420,height=600,resizable=yes');
  }
}
