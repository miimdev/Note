'use client';

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function showLocalNotification(title: string, body: string, url = '/reminders'): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration?.showNotification) {
      await registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { url },
        dir: 'rtl',
        lang: 'fa',
      });
      return;
    }
    new Notification(title, { body, icon: '/icons/icon-192.png', dir: 'rtl', lang: 'fa' });
  }
}
