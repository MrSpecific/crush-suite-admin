// Copied from crush-suite/shared_types/vinoshipper.webhook.types.ts — keep in sync.

type OrderId = string;
type CustomerId = string;
type ResourceUrl = string;
export type WebhookEvent =
  | "CREATED"
  | "UPDATED"
  | "CANCELLED"
  | "APPROVED"
  | "SHIPMENT_STATUS_UPDATED"
  | "TRACKING_NUMBER_ADDED";

/**
 * Webhook response. Either on the Customer or Order.
 * Sent on create, update, cancellation
 */
export type VinoshipperWebhookResponse = {
  identifier: OrderId | CustomerId;
  subject: Subject;
  event: WebhookEvent;
  href: ResourceUrl;
};

export type VinoshipperGetRegisteredWebhook = {
  id: string;
  subject: Subject;
  url: string;
  description: string;
  createdAt: string;
};

export type VinoshipperRegisterWebhook = {
  subject: Subject;
  url: string;
  description: string;
};

type Subject = "ORDER" | "CUSTOMER";
