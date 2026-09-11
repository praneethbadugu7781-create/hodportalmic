import nodemailer from 'nodemailer';

export interface SendOtpOptions {
  toEmail: string;
  studentName: string;
  rollNumber: string;
  otp: string;
}

export interface SendOtpResult {
  success: boolean;
  messageId?: string;
  isDevFallback?: boolean;
  error?: string;
}

export async function sendOtpEmail({
  toEmail,
  studentName,
  rollNumber,
  otp,
}: SendOtpOptions): Promise<SendOtpResult> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const from = process.env.SMTP_FROM || `"AIML Department - MIC Tech" <${user || 'no-reply@mictech.edu.in'}>`;

  // Fallback mode if SMTP credentials are not yet configured in .env.local
  if (!host || !user || !pass) {
    console.log('\n======================================================');
    console.log(`[DEVELOPER NOTICE: EMAIL OTP SIMULATION]`);
    console.log(`To: ${toEmail} (${studentName} - ${rollNumber})`);
    console.log(`One-Time Password (OTP): ${otp}`);
    console.log(`Expires in: 10 minutes`);
    console.log(`Configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env.local for live email delivery.`);
    console.log('======================================================\n');

    return {
      success: true,
      isDevFallback: true,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px; }
          .title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 600; }
          .content { line-height: 1.6; font-size: 14px; }
          .otp-box { text-align: center; margin: 28px 0; }
          .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #2563eb; background: #f0f7ff; padding: 14px 28px; border-radius: 12px; border: 1px dashed #bfdbfe; display: inline-block; }
          .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">DVR &amp; Dr. HS MIC College of Technology</h1>
            <p class="subtitle">Department of Artificial Intelligence &amp; Machine Learning (AIML)</p>
          </div>
          <div class="content">
            <p>Dear <strong>${studentName}</strong> (<code>${rollNumber}</code>),</p>
            <p>Welcome to the <strong>AIML Department Task &amp; Student Portal</strong>. To activate your student account and complete your security setup, please use the following verification code:</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <p>This verification code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
            <p>After verifying this code, you will be prompted to set your personal portal password.</p>
          </div>
          <div class="footer">
            <p>This is an automated security notice from the AIML Department Management System.<br>If you did not initiate this request, please report it to your HOD immediately.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject: `Your AIML Portal Verification Code: ${otp}`,
      text: `Dear ${studentName} (${rollNumber}), your AIML Portal verification code is: ${otp}. It expires in 10 minutes.`,
      html: htmlContent,
    });

    return {
      success: true,
      messageId: info.messageId,
      isDevFallback: false,
    };
  } catch (error: any) {
    console.error('Failed to send OTP email via SMTP:', error);
    return {
      success: false,
      error: error.message || 'Failed to dispatch verification email',
    };
  }
}

