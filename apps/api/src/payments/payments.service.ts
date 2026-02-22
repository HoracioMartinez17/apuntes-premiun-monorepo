import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Purchase, PurchaseStatus, PaymentMethod } from "./purchase.entity";
import { UsersService } from "../users/users.service";
import { EmailService } from "../email/email.service";
import Stripe from "stripe";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(
    @InjectRepository(Purchase)
    private purchaseRepository: Repository<Purchase>,
    private usersService: UsersService,
    private emailService: EmailService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2023-10-16",
    });
  }

  async createCheckoutSession(email: string, priceId: string) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card", "paypal"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      customer_email: email,
      metadata: {
        email,
      },
      // Habilitar Google Pay
      payment_method_options: {
        card: {
          request_three_d_secure: "automatic",
        },
      },
      // Configuración para mostrar Google Pay
      ui_mode: "hosted",
    });

    // Crear registro de compra pendiente
    await this.purchaseRepository.save({
      stripeSessionId: session.id,
      amount: session.amount_total! / 100,
      currency: session.currency!,
      customerEmail: email,
      status: PurchaseStatus.PENDING,
    });

    return { sessionId: session.id, url: session.url };
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("Stripe webhook secret not configured");
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw err;
    }

    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "payment_intent.succeeded":
        this.logger.log("Payment succeeded");
        break;
      case "payment_intent.payment_failed":
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        this.logger.warn(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const email = session.customer_email || session.metadata?.email;

    if (!email) {
      this.logger.error("No email found in checkout session");
      return;
    }

    this.logger.log(`Processing completed checkout for ${email}`);

    // Determinar método de pago
    let paymentMethod: PaymentMethod = PaymentMethod.CARD;
    if (session.payment_method_types?.includes("paypal")) {
      paymentMethod = PaymentMethod.PAYPAL;
    }

    // Buscar o crear usuario
    let user = await this.usersService.findByEmail(email);

    if (!user) {
      const tempPassword = Math.random().toString(36).slice(-8);
      user = await this.usersService.create(email, tempPassword);
      this.logger.log(`Created new user: ${email}`);
    }

    // Dar acceso al usuario
    await this.usersService.updateAccess(user.id, true);
    this.logger.log(`Granted access to user: ${email}`);
    // Generar token de acceso único (magic link)
    const accessToken = await this.usersService.generateAccessToken(user.id);
    this.logger.log(`Generated access token for user: ${email}`);

    // Enviar email con enlace mágico
    try {
      await this.emailService.sendMagicLinkEmail(email, accessToken.token, user.name);
      this.logger.log(`Magic link email sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send magic link email to ${email}:`, error);
      // No lanzamos error aquí porque el pago ya se procesó correctamente
    }

    //
    // Actualizar registro de compra
    const purchase = await this.purchaseRepository.findOne({
      where: { stripeSessionId: session.id },
    });

    if (purchase) {
      purchase.status = PurchaseStatus.COMPLETED;
      purchase.completedAt = new Date();
      purchase.user = user;
      purchase.stripePaymentIntentId = session.payment_intent as string;
      purchase.paymentMethod = paymentMethod;
      purchase.customerName = session.customer_details?.name || null;
      await this.purchaseRepository.save(purchase);
      this.logger.log(`Updated purchase record: ${purchase.id}`);
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    this.logger.error(`Payment failed: ${paymentIntent.id}`);

    const purchase = await this.purchaseRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (purchase) {
      purchase.status = PurchaseStatus.FAILED;
      await this.purchaseRepository.save(purchase);
    }
  }

  async findAll(): Promise<Purchase[]> {
    return this.purchaseRepository.find({
      relations: ["user"],
      order: { createdAt: "DESC" },
    });
  }

  async findByUser(userId: string): Promise<Purchase[]> {
    return this.purchaseRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: "DESC" },
    });
  }

  async getStats() {
    const purchases = await this.purchaseRepository.find();

    const total = purchases
      .filter((p) => p.status === PurchaseStatus.COMPLETED)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const byMethod = purchases
      .filter((p) => p.status === PurchaseStatus.COMPLETED)
      .reduce(
        (acc, p) => {
          const method = p.paymentMethod || "unknown";
          acc[method] = (acc[method] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

    return {
      totalSales: purchases.filter((p) => p.status === PurchaseStatus.COMPLETED).length,
      totalRevenue: total,
      byPaymentMethod: byMethod,
      pendingPurchases: purchases.filter((p) => p.status === PurchaseStatus.PENDING)
        .length,
      failedPurchases: purchases.filter((p) => p.status === PurchaseStatus.FAILED).length,
    };
  }
}
