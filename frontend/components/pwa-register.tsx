'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .catch((error) => {
            console.error('Error al registrar el Service Worker:', error);
          });
      });
    }
  }, []);

  return null;
}
