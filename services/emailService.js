import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Function to send OTP email
export async function sendOTPEmail(email, otp) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Notes App <onboarding@resend.dev>', // You can change this later
      to: email,
      subject: 'Password Reset OTP - Notes App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested to reset your password. Use the OTP below to proceed:</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; margin: 20px 0;">
            <h1 style="margin: 0; color: #d33; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Notes App Team</p>
        </div>
      `
    });

    if (error) {
      console.error('❌ Error sending OTP email:', error);
      return false;
    }

    console.log(`✅ OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    return false;
  }
}

// Function to send password changed confirmation
export async function sendPasswordChangedEmail(email) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Notes App <onboarding@resend.dev>',
      to: email,
      subject: 'Password Changed - Notes App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Changed Successfully</h2>
          <p>Your password has been changed successfully.</p>
          <p>If you didn't make this change, please contact us immediately.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Notes App Team</p>
        </div>
      `
    });

    if (error) {
      console.error('❌ Error sending password changed email:', error);
      return false;
    }

    console.log(`✅ Password changed email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending password changed email:', error);
    return false;
  }
}