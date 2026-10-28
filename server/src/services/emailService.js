const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.email.uk-london-1.oci.oraclecloud.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Ask by urspace.com <ask@urspace.com>';
const APP_URL = (process.env.APP_URL || 'https://ask.urspace.com').replace(/\/+$/, '');

let transporter = null;

function getTransporter() {
  if (!transporter && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return transporter;
}

/**
 * Locate the logo file for CID inline attachment
 */
function getLogoAttachment() {
  const possiblePaths = [
    path.resolve(__dirname, '../../../client/dist/askbuurspace.jpg'),
    path.resolve(__dirname, '../../../client/public/askbuurspace.jpg'),
    path.resolve(__dirname, '../../askbuurspace.jpg'),
    path.resolve(process.cwd(), 'client/dist/askbuurspace.jpg'),
    path.resolve(process.cwd(), 'client/public/askbuurspace.jpg'),
    path.resolve(process.cwd(), '../client/dist/askbuurspace.jpg'),
    path.resolve(process.cwd(), '../client/public/askbuurspace.jpg'),
    path.resolve(process.cwd(), 'askbuurspace.jpg'),
    path.resolve(process.cwd(), '../askbuurspace.jpg'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return {
        filename: 'askbuurspace.jpg',
        path: p,
        cid: 'asklogo'
      };
    }
  }
  return null;
}

/**
 * Send password reset email with secure 1-hour link
 */
async function sendPasswordResetEmail(toEmail, rawToken) {
  const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const logoAttachment = getLogoAttachment();
  const logoSrc = logoAttachment ? 'cid:asklogo' : `${APP_URL}/askbuurspace.jpg`;

  const subject = 'Reset your password — Ask by urspace.com';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #0f172a; padding: 28px 32px; text-align: center; }
        .header img { height: auto; max-height: 95px; width: auto; max-width: 320px; display: block; margin: 0 auto; border-radius: 8px; }
        .content { padding: 32px; }
        .button { display: inline-block; background-color: #3b82f6; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; margin: 24px 0; text-align: center; }
        .button:hover { background-color: #2563eb; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 32px; font-size: 12px; color: #64748b; line-height: 1.6; text-align: center; }
        .footer a { color: #2563eb; text-decoration: none; font-weight: 500; }
        .url-box { background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 12px; word-break: break-all; color: #475569; margin-top: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <a href="https://ask.urspace.com" target="_blank" style="text-decoration: none; display: inline-block;">
            <img src="${logoSrc}" alt="Ask by urspace.com" style="height: auto; max-height: 95px; width: auto; max-width: 320px; display: block; margin: 0 auto; border-radius: 8px;" />
          </a>
        </div>
        <div class="content">
          <h2 style="font-size: 18px; margin-top: 0; color: #0f172a;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>We received a request to reset the password associated with your account (<strong>${toEmail}</strong>).</p>
          <p>Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button" target="_blank">Reset Password &rarr;</a>
          </div>

          <p style="font-size: 13px; color: #64748b;">If you didn't request a password reset, you can safely ignore this email. Your current password will remain unchanged.</p>
          
          <div class="url-box">
            If the button above doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0 0 6px; font-weight: 600; color: #334155; font-size: 13px;">
            Ask by urspace.com &bull; <a href="https://ask.urspace.com" target="_blank">ask.urspace.com</a>
          </p>
          <p style="margin: 0 0 8px; color: #64748b;">
            Questions or support? Reach us at <a href="mailto:ask@urspace.com">ask@urspace.com</a>
          </p>
          <p style="margin: 0; color: #94a3b8; font-size: 11px;">
            &copy; ${new Date().getFullYear()} Ask by urspace.com. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello,\n\nWe received a request to reset the password for your account (${toEmail}).\n\nReset your password here (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.\n\nAsk by urspace.com — https://ask.urspace.com\nSupport: ask@urspace.com`;

  const transport = getTransporter();
  if (!transport) {
    console.log('[EmailService] SMTP credentials not configured. Logging reset link to console:');
    console.log(`[EmailService] To: ${toEmail} | Reset Link: ${resetUrl}`);
    return { success: true, simulated: true };
  }

  const attachments = logoAttachment ? [logoAttachment] : [];

  try {
    const info = await transport.sendMail({
      from: EMAIL_FROM,
      to: toEmail,
      subject,
      text,
      html,
      attachments
    });
    console.log(`[EmailService] Password reset sent to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EmailService] Failed to send password reset email:', err);
    console.log(`[EmailService Fallback] Reset URL for ${toEmail}: ${resetUrl}`);
    return { success: false, error: err.message };
  }
}

/**
 * Send notification email to survey creator when a response is received
 */
async function sendResponseNotificationEmail({ toEmail, surveyTitle, surveyId, submittedAt, answersSummary }) {
  const analysisUrl = `${APP_URL}/surveys/${encodeURIComponent(surveyId)}/analysis`;
  const logoAttachment = getLogoAttachment();
  const logoSrc = logoAttachment ? 'cid:asklogo' : `${APP_URL}/askbuurspace.jpg`;

  const subject = `New response received: ${surveyTitle}`;
  const formattedDate = new Date(submittedAt || Date.now()).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  let answersListHtml = '';
  if (Array.isArray(answersSummary) && answersSummary.length > 0) {
    answersListHtml = `
      <div style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #f8fafc; padding: 10px 16px; font-weight: 600; font-size: 13px; color: #475569; border-bottom: 1px solid #e2e8f0;">
          Response Highlights
        </div>
        <div style="padding: 12px 16px; font-size: 14px;">
          ${answersSummary.slice(0, 8).map((a, idx) => `
            <div style="margin-bottom: ${idx === answersSummary.length - 1 ? '0' : '12px'};">
              <strong style="color: #0f172a; font-size: 13px; display: block;">${idx + 1}. ${escapeHtml(a.question_text || 'Question')}</strong>
              <span style="color: #2563eb; background: #eff6ff; display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 13px; margin-top: 4px;">
                ${escapeHtml(formatAnswerVal(a.value))}
              </span>
            </div>
          `).join('')}
          ${answersSummary.length > 8 ? `<p style="margin: 8px 0 0; font-size: 12px; color: #64748b;">+ ${answersSummary.length - 8} more questions answered</p>` : ''}
        </div>
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #0f172a; padding: 28px 32px; text-align: center; }
        .header img { height: auto; max-height: 95px; width: auto; max-width: 320px; display: block; margin: 0 auto; border-radius: 8px; }
        .content { padding: 28px 32px; }
        .badge { display: inline-block; background-color: #dbeafe; color: #1e40af; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 9999px; margin-bottom: 12px; }
        .button { display: inline-block; background-color: #3b82f6; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 13px 26px; border-radius: 8px; font-size: 14px; margin: 20px 0; text-align: center; }
        .button:hover { background-color: #2563eb; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 12px; color: #64748b; line-height: 1.6; text-align: center; }
        .footer a { color: #2563eb; text-decoration: none; font-weight: 500; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <a href="https://ask.urspace.com" target="_blank" style="text-decoration: none; display: inline-block;">
            <img src="${logoSrc}" alt="Ask by urspace.com" style="height: auto; max-height: 95px; width: auto; max-width: 320px; display: block; margin: 0 auto; border-radius: 8px;" />
          </a>
        </div>
        <div class="content">
          <span class="badge">New Submission</span>
          <h2 style="margin: 0 0 8px; font-size: 20px; color: #0f172a;">${escapeHtml(surveyTitle)}</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0 0 16px;">Submitted on ${formattedDate}</p>
          
          <p>Great news! A respondent has completed your survey.</p>

          ${answersListHtml}

          <div style="text-align: center; margin: 24px 0 12px;">
            <a href="${analysisUrl}" class="button" target="_blank">View Survey Analysis & Responses &rarr;</a>
          </div>

          <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
            You are receiving this email because you enabled response notifications for this survey. You can toggle notifications off at any time in your Survey Settings.
          </p>
        </div>
        <div class="footer">
          <p style="margin: 0 0 6px; font-weight: 600; color: #334155; font-size: 13px;">
            Ask by urspace.com &bull; <a href="https://ask.urspace.com" target="_blank">ask.urspace.com</a>
          </p>
          <p style="margin: 0 0 8px; color: #64748b;">
            Questions or support? Reach us at <a href="mailto:ask@urspace.com">ask@urspace.com</a>
          </p>
          <p style="margin: 0; color: #94a3b8; font-size: 11px;">
            &copy; ${new Date().getFullYear()} Ask by urspace.com. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `New response received for "${surveyTitle}" on ${formattedDate}.\n\nView analysis and responses:\n${analysisUrl}\n\nAsk by urspace.com — https://ask.urspace.com\nSupport: ask@urspace.com`;

  const transport = getTransporter();
  if (!transport) {
    console.log(`[EmailService] (Simulated) New response notification for survey "${surveyTitle}" to ${toEmail}`);
    return { success: true, simulated: true };
  }

  const attachments = logoAttachment ? [logoAttachment] : [];

  try {
    const info = await transport.sendMail({
      from: EMAIL_FROM,
      to: toEmail,
      subject,
      text,
      html,
      attachments
    });
    console.log(`[EmailService] Response notification sent to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EmailService] Failed to send response notification:', err);
    return { success: false, error: err.message };
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatAnswerVal(val) {
  if (val === undefined || val === null) return '-';
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.join(', ');
      return String(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

module.exports = {
  sendPasswordResetEmail,
  sendResponseNotificationEmail,
  getTransporter
};
