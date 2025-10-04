import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔑 Generating VAPID keys...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID Keys Generated!\n');
console.log('Public Key:');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key:');
console.log(vapidKeys.privateKey);
console.log('\n' + '='.repeat(60));

// Check if .env exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if VAPID keys already exist
  if (envContent.includes('VAPID_PUBLIC_KEY')) {
    console.log('\n⚠️  VAPID keys already exist in .env file');
    console.log('Do you want to replace them? (This will break existing subscriptions)');
    console.log('\nTo manually update, add these to your .env file:');
    console.log(`\nVAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
    console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
    console.log(`VAPID_EMAIL=mailto:your-email@example.com`);
  } else {
    // Add VAPID keys to existing .env
    envContent += `\n\n# VAPID Keys for Push Notifications\n`;
    envContent += `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}\n`;
    envContent += `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n`;
    envContent += `VAPID_EMAIL=mailto:your-email@example.com\n`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ VAPID keys added to .env file!');
    console.log('⚠️  Don\'t forget to update VAPID_EMAIL with your actual email');
  }
} else {
  // Create new .env file
  const envContent = `# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_EMAIL=mailto:your-email@example.com

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/notesApp

# Session
SESSION_SECRET=mysecretkey
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ Created .env file with VAPID keys!');
  console.log('⚠️  Don\'t forget to update VAPID_EMAIL and other settings');
}

console.log('\n' + '='.repeat(60));
console.log('\n📝 Next steps:');
console.log('1. Update VAPID_EMAIL in .env with your contact email');
console.log('2. Make sure .env is in your .gitignore');
console.log('3. Restart your server');
console.log('4. Test notifications!\n');