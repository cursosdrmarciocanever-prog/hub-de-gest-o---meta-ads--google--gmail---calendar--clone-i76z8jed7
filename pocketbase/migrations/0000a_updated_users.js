/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('_pb_users_auth_')

    // update collection data
    unmarshal(
      {
        confirmEmailChangeTemplate: {
          body: '\n  <section style="font-family: -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, sans-serif; background: #f6f7f9; color: #111827; margin: 0; padding: 24px;">\n    <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;" >\n      <h1 style="font-size: 18px; margin: 0 0 12px;">Confirme seu novo e-mail</h1>\n      <p style="font-size: 14px; line-height: 1.5; margin: 0 0 16px; color: #374151;">Você solicitou trocar seu e-mail para <strong>{NEW_EMAIL}</strong>. Clique abaixo para confirmar:</p>\n      <p style="display: inline-block; background: #111827; color: #fff !important; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 14px;">\n        <a style="color: #fff !important; text-decoration: none;" href="{RESET_EMAIL_URL}">Confirmar novo e-mail</a></p>\n      <p style="font-size: 12px; color: #6b7280;">Se você não fez essa solicitação, entre em contato com o suporte.</p>\n    </div>\n  </section>',
          subject: 'Confirme seu novo e-mail',
        },
        otp: {
          emailTemplate: {
            body: '\n  <section style="font-family: -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, sans-serif; background: #f6f7f9; color: #111827; margin: 0; padding: 24px;">\n    <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">\n      <h1 style="font-size: 18px; margin: 0 0 12px;">Seu código de acesso</h1>\n      <p style="font-size: 14px; line-height: 1.5; margin: 0 0 16px; color: #374151;">Use o código abaixo para concluir sua autenticação:</p>\n      <p style="font-size: 28px; font-weight: 600; letter-spacing: 6px; text-align: center; padding: 16px 0; color: #111827;">{OTP}</p>\n      <p style="font-size: 12px; color: #6b7280;">Não compartilhe com ninguém.</p>\n    </div>\n  </section>',
            subject: 'Seu código de acesso',
          },
        },
        resetPasswordTemplate: {
          body: '\n  <section style="font-family: -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, sans-serif; background: #f6f7f9; color: #111827; margin: 0; padding: 24px;">\n    <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">\n      <h1 style="font-size: 18px; margin: 0 0 12px;">Redefinição de senha</h1>\n      <p style="font-size: 14px; line-height: 1.5; margin: 0 0 16px; color: #374151;">Recebemos uma solicitação para redefinir sua senha. Clique abaixo para criar uma nova:</p>\n      <p style="display: inline-block; background: #111827; color: #fff !important; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 14px;">\n        <a style="color: #fff !important; text-decoration: none;" href="{RESET_URL}">Redefinir senha</a></p>\n      <p style="font-size: 12px; color: #6b7280;">Se você não solicitou, ignore este e-mail — sua senha continua a mesma.</p>\n    </div>\n  </section>',
          subject: 'Redefina sua senha',
        },
        verificationTemplate: {
          body: '\n  <section style="font-family: -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, sans-serif; background: #f6f7f9; color: #111827; margin: 0; padding: 24px;">\n    <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">\n      <h1 style="font-size: 18px; margin: 0 0 12px;">Bem-vindo(a) ao Skip</h1>\n      <p style="font-size: 14px; line-height: 1.5; margin: 0 0 16px; color: #374151;">Olá, confirme seu e-mail clicando no botão abaixo para começar a usar sua conta.</p>\n      <p style="display: inline-block; background: #111827; color: #fff !important; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 14px;">\n        <a style="color: #fff !important; text-decoration: none;" href="{CONFIRMATION_URL}">Confirmar e-mail</a></p>\n      <p style="font-size: 12px; color: #6b7280;">Se você não criou esta conta, ignore este e-mail.</p>\n    </div>\n  </section>',
          subject: 'Confirme seu cadastro no Skip',
        },
      },
      collection,
    )

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('_pb_users_auth_')

    // update collection data
    unmarshal(
      {
        confirmEmailChangeTemplate: {
          body: '<p>Hello,</p>\n<p>Click on the button below to confirm your new email address.</p>\n<p>\n  <a class="btn" href="{APP_URL}/_/#/auth/confirm-email-change/{TOKEN}" target="_blank" rel="noopener">Confirm new email</a>\n</p>\n<p><i>If you didn\'t ask to change your email address, please ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>',
          subject: 'Confirm your {APP_NAME} new email address',
        },
        otp: {
          emailTemplate: {
            body: "<p>Hello,</p>\n<p>Your one-time password is: <strong>{OTP}</strong></p>\n<p><i>If you didn't ask for the one-time password, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>",
            subject: 'OTP for {APP_NAME}',
          },
        },
        resetPasswordTemplate: {
          body: '<p>Hello,</p>\n<p>Click on the button below to reset your password.</p>\n<p>\n  <a class="btn" href="{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}" target="_blank" rel="noopener">Reset password</a>\n</p>\n<p><i>If you didn\'t ask to reset your password, please ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>',
          subject: 'Reset your {APP_NAME} password',
        },
        verificationTemplate: {
          body: '<p>Hello,</p>\n<p>Thank you for joining us at {APP_NAME}.</p>\n<p>Click on the button below to verify your email address.</p>\n<p>\n  <a class="btn" href="{APP_URL}/_/#/auth/confirm-verification/{TOKEN}" target="_blank" rel="noopener">Verify</a>\n</p>\n<p><i>If you didn\'t recently register, please ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>',
          subject: 'Verify your {APP_NAME} email',
        },
      },
      collection,
    )

    return app.save(collection)
  },
)
