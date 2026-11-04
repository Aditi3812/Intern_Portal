import Notification from '../models/Notification.model.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';

const emailSender = { send: sendEmail };

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));

/**
 * Creates an in-app notification and optionally dispatches an email notification.
 * An email delivery failure will NEVER throw or interrupt the caller.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} type
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string|mongoose.Types.ObjectId} [options.requestId]
 * @param {boolean} [options.email]
 * @returns {Promise<Object|null>}
 */
export const notify = async (
  userId,
  type,
  { title, message, requestId = null, email = false } = {}
) => {
  let notification = null;

  try {
    notification = await Notification.create({
      userId,
      type,
      title,
      message,
      requestId: requestId || null,
      isRead: false,
      readAt: null,
    });
  } catch (dbErr) {
    console.error(
      `[notification.service] Failed to persist in-app notification for user ${userId}:`,
      dbErr.message
    );
  }

  if (email) {
    try {
      const recipient = await User.findById(userId).select('email fullName');
      if (recipient && recipient.email) {
        const safeTitle = escapeHtml(title || 'Notification');
        const safeName = escapeHtml(recipient.fullName || 'there');
        const safeMessage = escapeHtml(message || '');

        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="margin-bottom: 20px; border-bottom: 2px solid #4f46e5; padding-bottom: 12px;">
              <span style="font-size: 20px; font-weight: 700; color: #4f46e5;">UPTOSKILL</span>
              <span style="font-size: 14px; color: #64748b; margin-left: 8px;">Intern Portal</span>
            </div>
            <h2 style="color: #0f172a; font-size: 18px; margin-top: 0; margin-bottom: 16px;">${safeTitle}</h2>
            <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 12px;">Hello ${safeName},</p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">${safeMessage}</p>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the UPTOSKILL Intern Portal. Please do not reply directly to this email.</p>
            </div>
          </div>
        `;

        await emailSender.send({
          to: recipient.email,
          subject: `[UPTOSKILL] ${title}`,
          html,
        });
      } else {
        console.warn(
          `[notification.service] User ${userId} has no valid email address; skipping email dispatch.`
        );
      }
    } catch (mailErr) {
      // An email failure must never fail the request. Catch it and log it.
      console.error(
        `[notification.service] Email notification failed for user ${userId}:`,
        mailErr.message
      );
    }
  }

  return notification;
};

export { emailSender };

export default { notify };
