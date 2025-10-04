import webpush from 'web-push';
import User from '../models/User.js';
import Note from '../models/Note.js';

// Use environment variables for VAPID keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

// Validate that keys are set
if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  console.error('❌ VAPID keys are not set in environment variables!');
  console.error('Run: npx web-push generate-vapid-keys');
  console.error('Then add them to your .env file');
}

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Function to send notification
export async function sendNotification(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log('✅ Notification sent successfully');
  } catch (error) {
    console.error('❌ Error sending notification:', error);
  }
}

// Function to check and send due date reminders
export async function checkDueDateReminders() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find notes due today or tomorrow
    const dueNotes = await Note.find({
      dueDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).populate('userId');
    
    for (const note of dueNotes) {
      if (note.userId.pushSubscription) {
        const payload = {
          title: '⏰ Task Reminder',
          body: `"${note.title}" is due today!`,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: {
            noteId: note._id,
            url: '/notes'
          }
        };
        
        await sendNotification(note.userId.pushSubscription, payload);
      }
    }
    
    console.log(`✅ Checked ${dueNotes.length} due notes`);
  } catch (error) {
    console.error('❌ Error checking reminders:', error);
  }
}

// Run reminder check every hour
export function startReminderScheduler() {
  // Check immediately on startup
  checkDueDateReminders();
  
  // Then check every hour
  setInterval(checkDueDateReminders, 60 * 60 * 1000);
  
  console.log('✅ Reminder scheduler started');
}