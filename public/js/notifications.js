// Check if notifications are supported
if ('serviceWorker' in navigator && 'PushManager' in window) {
  initializeNotifications();
}

async function initializeNotifications() {
  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    
    // Check notification permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted');
    }
  } catch (error) {
    console.error('Error initializing notifications:', error);
  }
}

async function subscribeToNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Request notification permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      alert('Please allow notifications to receive task reminders!');
      return;
    }
    
    // Get VAPID public key
    const response = await fetch('/vapid-public-key');
    const { publicKey } = await response.json();
    
    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
    
    // Send subscription to server
    const subscribeResponse = await fetch('/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    });
    
    const result = await subscribeResponse.json();
    
    if (result.success) {
      alert('✅ Successfully subscribed to notifications!');
      updateNotificationButton(true);
    }
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    alert('Failed to subscribe to notifications');
  }
}

async function unsubscribeFromNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
    }
    
    // Remove subscription from server
    await fetch('/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    alert('✅ Unsubscribed from notifications');
    updateNotificationButton(false);
  } catch (error) {
    console.error('Error unsubscribing:', error);
  }
}

function updateNotificationButton(isSubscribed) {
  const btn = document.getElementById('notification-toggle');
  if (btn) {
    if (isSubscribed) {
      btn.textContent = '🔕 Disable Notifications';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-secondary');
      btn.onclick = unsubscribeFromNotifications;
    } else {
      btn.textContent = '🔔 Enable Notifications';
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
      btn.onclick = subscribeToNotifications;
    }
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Check subscription status on load
window.addEventListener('load', async () => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      updateNotificationButton(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }
});