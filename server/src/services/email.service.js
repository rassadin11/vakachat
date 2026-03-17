// services/email.service.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(to, token) {
  const verifyUrl = `${process.env.APP_URL}/api/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"vakachat" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Подтвердите ваш email',
    html: `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="color-scheme" content="light" />
      <meta name="supported-color-schemes" content="light" />
    </head>
    <body style="margin:0; padding:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:40px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#1a1a1a; border:1px solid #282828; border-radius:12px;">

              <!-- Logo -->
              <tr>
                <td style="padding:32px 32px 0; text-align:center;">
                  <span style="font-size:22px; font-weight:800; color:#f0f0f0; letter-spacing:-0.3px;">vakachat<span style="color:#10b981;">.</span></span>
                </td>
              </tr>

              <!-- Divider -->
              <tr>
                <td style="padding:24px 32px 0;">
                  <div style="height:1px; background:linear-gradient(90deg, transparent, #282828 20%, #282828 80%, transparent);"></div>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding:28px 32px 0;">
                  <h1 style="margin:0 0 12px; font-size:20px; font-weight:700; color:#f0f0f0; line-height:1.3;">
                    Добро пожаловать!
                  </h1>
                  <p style="margin:0 0 20px; font-size:14px; color:#888888; line-height:1.6;">
                    Спасибо за участие в бета&#8209;тестировании! Подтверждение email пока, что необязательно.
                  </p>
                  <p style="margin:0 0 24px; font-size:14px; color:#888888; line-height:1.6;">
                    Но можете нажать на кнопку ниже, чтобы подтвердить ваш&nbsp;email:
                  </p>
                </td>
              </tr>

              <!-- CTA Button -->
              <tr>
                <td align="center" style="padding:0 32px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background-color:#10b981; border-radius:8px;">
                        <a href="${verifyUrl}" target="_blank" style="
                          display:inline-block;
                          padding:14px 36px;
                          font-size:14px;
                          font-weight:600;
                          color:#ffffff;
                          text-decoration:none;
                          letter-spacing:0.2px;
                        ">Подтвердить email</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Fallback link -->
              <tr>
                <td style="padding:20px 32px 0; text-align:center;">
                  <p style="margin:0; font-size:11px; color:#555555; line-height:1.5; word-break:break-all;">
                    Не работает кнопка? Скопируйте ссылку:<br/>
                    <a href="${verifyUrl}" style="color:#10b981; text-decoration:underline;">${verifyUrl}</a>
                  </p>
                </td>
              </tr>

              <!-- Expiry notice -->
              <tr>
                <td style="padding:24px 32px 0;">
                  <div style="height:1px; background:linear-gradient(90deg, transparent, #282828 20%, #282828 80%, transparent);"></div>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 32px 28px;">
                  <p style="margin:0 0 4px; font-size:12px; color:#555555; line-height:1.5; text-align:center;">
                    Ссылка действительна 24 часа.
                  </p>
                  <p style="margin:0; font-size:12px; color:#555555; line-height:1.5; text-align:center;">
                    Если вы не регистрировались — просто проигнорируйте это письмо.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,
  });
}