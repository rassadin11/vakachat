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
      <h2>Добро пожаловать!</h2>
      <p>Спасибо за участие в бета-тестировании! За подтверждение email вам будет начислено 50 рублей.</p>
      <p>Нажмите на кнопку ниже чтобы подтвердить ваш email:</p>
      <a href="${verifyUrl}" style="
        background: #4F46E5;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
        display: inline-block;
      ">
        Подтвердить email
      </a>
      <p>Ссылка действительна 24 часа.</p>
      <p>Если вы не регистрировались — просто проигнорируйте это письмо.</p>
    `,
  });
}