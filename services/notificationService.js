import webpush from 'web-push';
import Note from '../models/Note.js';

// Use environment variables for VAPID keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

// Validate that keys are set
if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('VAPID keys are not set in environment variables!');
  }
  // Don't exit in production, just log and continue
}

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:amalbenny851@gmail.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Function to send notification
export async function sendNotification(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
     if (process.env.NODE_ENV !== 'production') {
      console.log('Notification sent successfully');
    }
  } catch (error) {
        if (error.statusCode !== 410 && error.statusCode !== 404) { // 410 = gone, 404 = not found
      console.error('Error sending notification:', error.message);
    }
  }
}

// Function to check and send due date reminders
export async function checkDueDateReminders() {
  try {
    // Define today's start
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Define 2 days ahead
    const upcoming = new Date(today);
    upcoming.setDate(today.getDate() + 2);

    // Find notes due today or tomorrow
    const dueNotes = await Note.find({
      dueDate: {
        $gte: today,
        $lt: upcoming
      }
    }).populate('userId');

    let sentCount = 0;

    for (const note of dueNotes) {
      if (note.userId && note.userId.pushSubscription) {
        const payload = {
          title: 'Task Reminder',
          body: `"${note.title}" is due soon!`,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: {
            noteId: note._id,
            url: '/notes'
          }
        };

        await sendNotification(note.userId.pushSubscription, payload);
        sentCount++;
      }
    }

     if (process.env.NODE_ENV !== 'production' && sentCount > 0) {
      console.log(`Sent ${sentCount} reminder notifications`);
    }
  } catch (error) {
    console.error('Error checking reminders:', error.message);
  }
}

// Run reminder check every hour
export function startReminderScheduler() {
  // Check immediately on startup
  checkDueDateReminders();

  // Then check every hour
  setInterval(checkDueDateReminders, 60 * 60 * 1000);

   if (process.env.NODE_ENV !== 'production') {
    console.log('Reminder scheduler started');
  }
}
