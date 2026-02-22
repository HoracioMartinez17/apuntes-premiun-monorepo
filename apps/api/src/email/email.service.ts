import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get("EMAIL_HOST"),
      port: this.configService.get("EMAIL_PORT"),
      secure: this.configService.get("EMAIL_SECURE") === "true",
      auth: {
        user: this.configService.get("EMAIL_USER"),
        pass: this.configService.get("EMAIL_PASSWORD"),
      },
    });
  }

  async sendMagicLinkEmail(email: string, token: string, userName?: string) {
    const frontendUrl = this.configService.get("FRONTEND_URL");
    const magicLink = `${frontendUrl}/acceso?token=${token}`;

    const mailOptions = {
      from: {
        name: "Apuntes Premium",
        address: this.configService.get("EMAIL_FROM"),
      },
      to: email,
      subject: "🎉 ¡Bienvenido! Accede a tus apuntes premium",
      html: this.getMagicLinkTemplate(magicLink, userName || email),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Magic link email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}:`, error);
      return false;
    }
  }

  async sendAccessTokenRenewalEmail(email: string, token: string, userName?: string) {
    const frontendUrl = this.configService.get("FRONTEND_URL");
    const magicLink = `${frontendUrl}/acceso?token=${token}`;

    const mailOptions = {
      from: {
        name: "Apuntes Premium",
        address: this.configService.get("EMAIL_FROM"),
      },
      to: email,
      subject: "🔑 Tu nuevo token de acceso - Apuntes Premium",
      html: this.getAccessTokenRenewalTemplate(magicLink, userName || email),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Access token renewal email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send renewal email to ${email}:`, error);
      return false;
    }
  }

  private getMagicLinkTemplate(magicLink: string, userName: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acceso a Apuntes Premium</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🎉 ¡Bienvenido a Apuntes Premium!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                Hola <strong>${userName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                ¡Tu pago ha sido procesado exitosamente! 🚀
              </p>
              
              <p style="margin: 0 0 30px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                Ahora tienes acceso completo a todos los apuntes premium. Haz clic en el botón de abajo para empezar a aprender:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center; padding: 20px 0;">
                    <a href="${magicLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                      🔑 Acceder a mis apuntes
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 20px; color: #71717a; font-size: 14px; line-height: 1.6; padding: 20px; background-color: #f4f4f5; border-radius: 8px; border-left: 4px solid #667eea;">
                <strong>💡 Nota importante:</strong><br>
                Este enlace es personal y único para ti. Con él puedes acceder directamente sin necesidad de crear contraseña. Guárdalo en un lugar seguro.
              </p>

              <p style="margin: 20px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 10px 0 0; color: #667eea; font-size: 14px; word-break: break-all;">
                ${magicLink}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f4f4f5; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0 0 10px; color: #71717a; font-size: 14px;">
                ¿Tienes preguntas? Estamos aquí para ayudarte.
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} Apuntes Premium. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private getAccessTokenRenewalTemplate(magicLink: string, userName: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Token de Acceso Renovado</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🔑 Token de Acceso Renovado
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                Hola <strong>${userName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                Se ha generado un nuevo token de acceso para tu cuenta. 🔄
              </p>
              
              <p style="margin: 0 0 30px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                Utiliza el siguiente enlace para acceder directamente a tus apuntes premium:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center; padding: 20px 0;">
                    <a href="${magicLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.4);">
                      🔓 Acceder ahora
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 20px; color: #71717a; font-size: 14px; line-height: 1.6; padding: 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <strong>⚠️ Importante:</strong><br>
                Este es tu nuevo enlace de acceso personal. Si tenías un token anterior, este lo ha reemplazado. Guarda este enlace en un lugar seguro.
              </p>

              <div style="margin: 30px 0; padding: 20px; background-color: #f4f4f5; border-radius: 8px; border-left: 4px solid #10b981;">
                <p style="margin: 0 0 10px; color: #3f3f46; font-size: 14px; line-height: 1.6;">
                  <strong>✨ Características de tu acceso:</strong>
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #71717a; font-size: 14px; line-height: 1.8;">
                  <li>Acceso directo sin contraseña</li>
                  <li>Válido por 1 año</li>
                  <li>Acceso a todos los apuntes premium</li>
                  <li>Contenido actualizado regularmente</li>
                </ul>
              </div>

              <p style="margin: 20px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 10px 0 0; color: #10b981; font-size: 14px; word-break: break-all;">
                ${magicLink}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f4f4f5; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0 0 10px; color: #71717a; font-size: 14px;">
                Si no solicitaste este cambio, por favor contacta al administrador.
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} Apuntes Premium. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  // Método para testing (opcional)
  async sendTestEmail(email: string) {
    const mailOptions = {
      from: this.configService.get("EMAIL_FROM"),
      to: email,
      subject: "Test Email from Apuntes Premium",
      text: "If you receive this, email service is working correctly!",
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Test email sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send test email:`, error);
      return false;
    }
  }
}
