import nodemailer from "nodemailer";

export async function sendVerificationEmail(email: string, name: string, code: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "Taskchi <noreply@taskchi.tj>",
    to: email,
    subject: "Подтверждение email — Taskchi",
    html: `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <tr>
          <td style="background:#14A800;padding:28px 40px;text-align:center">
            <span style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px">🎯 Taskchi</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px">
            <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111">Привет, ${name}!</h2>
            <p style="margin:0 0 4px;color:#777;font-size:13px">Салом, ${name}!</p>
            <p style="margin:16px 0 28px;color:#555;line-height:1.6">
              Для активации аккаунта Taskchi введите код подтверждения:<br>
              <span style="color:#888;font-size:13px">Барои фаъол кардани ҳисоб, рамзи тасдиқро ворид кунед:</span>
            </p>
            <div style="background:#f0faf0;border:2px solid #14A800;border-radius:14px;padding:28px;text-align:center;margin:0 0 28px">
              <div style="font-size:48px;font-weight:900;letter-spacing:12px;color:#14A800;font-family:monospace">${code}</div>
            </div>
            <p style="margin:0;color:#888;font-size:13px;line-height:1.6">
              Код действителен <strong>24 часа</strong> · Рамз <strong>24 соат</strong> эътибор дорад<br>
              Если вы не регистрировались — проигнорируйте это письмо.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center">
            <p style="margin:0;color:#aaa;font-size:12px">© 2025 Taskchi · Душанбе, Тоҷикистон</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `Taskchi — Код подтверждения: ${code}\n\nКод действителен 24 часа.`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "Taskchi <noreply@taskchi.tj>",
    to: email,
    subject: "Сброс пароля — Taskchi",
    html: `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <!-- Header -->
        <tr>
          <td style="background:#14A800;padding:28px 40px;text-align:center">
            <span style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px">🎯 Taskchi</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111">Сброс пароля</h2>
            <p style="margin:0 0 24px;color:#555;line-height:1.6">
              Мы получили запрос на сброс пароля для вашего аккаунта Taskchi.<br>
              Нажмите кнопку ниже, чтобы создать новый пароль.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px">
              <tr>
                <td style="background:#14A800;border-radius:10px">
                  <a href="${resetUrl}" style="display:block;padding:14px 32px;color:#fff;text-decoration:none;font-weight:700;font-size:15px">
                    Сбросить пароль
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;color:#888;font-size:13px;line-height:1.5">
              Ссылка действительна <strong>1 час</strong>. Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.
            </p>
            <p style="margin:0;color:#bbb;font-size:12px;word-break:break-all">${resetUrl}</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center">
            <p style="margin:0;color:#aaa;font-size:12px">© 2025 Taskchi · Душанбе, Таджикистан</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `Сброс пароля Taskchi\n\nДля создания нового пароля перейдите по ссылке:\n${resetUrl}\n\nСсылка действительна 1 час.`,
  });
}
