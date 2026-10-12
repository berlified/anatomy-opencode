// The truth first: every number the figure shows comes from this model.
// Mirrors pocketsflow.com: products, checkout, Merchant-of-Record tax,
// email automations, audience, analytics, MCP/AI operation.

export interface Product {
  id: string;
  name: string;
  kind: string;
  price: number;
}

export const PRODUCTS: Product[] = [
  { id: "presets", name: "Presets Vol. 3", kind: "digital", price: 29 },
  { id: "ebook", name: "Film Ebook", kind: "digital", price: 19 },
  { id: "course", name: "Darkroom Course", kind: "course", price: 89 },
  { id: "circle", name: "Producer Circle", kind: "membership", price: 12 },
];

export type PayMethod = "card" | "wallet" | "crypto";

export const PAY_LABEL: Record<PayMethod, string> = {
  card: "Card",
  wallet: "Wallet",
  crypto: "Crypto",
};

/** Itemized transaction cost: ~$5.00 on $100, ~$47.30 on $1,000. */
export function feeFor(amount: number): number {
  return amount * 0.047 + 0.3;
}

export const DISCOUNT_CODE = "LAUNCH20";
export const DISCOUNT_PCT = 0.2;
export const UPSELL_PRICE = 9;

export interface OrderInput {
  product: Product;
  method: PayMethod;
  discount: boolean;
  upsell: boolean;
}

export interface PricedOrder extends OrderInput {
  subtotal: number;
  discountAmt: number;
  upsellAmt: number;
  total: number;
  fee: number;
  net: number;
  taxNote: string;
}

export function priceOrder(o: OrderInput): PricedOrder {
  const subtotal = o.product.price;
  const discountAmt = o.discount ? subtotal * DISCOUNT_PCT : 0;
  const upsellAmt = o.upsell ? UPSELL_PRICE : 0;
  const total = subtotal - discountAmt + upsellAmt;
  const fee = feeFor(total);
  return {
    ...o,
    subtotal,
    discountAmt,
    upsellAmt,
    total,
    fee,
    net: total - fee,
    taxNote: "VAT/GST collected + remitted as Merchant of Record",
  };
}

export const money = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

export const WEBHOOK_EVENTS = [
  "order.completed",
  "order.refunded",
  "customer.created",
  "product.created",
  "customer.subscription.created",
  "invoice.payment_succeeded",
] as const;

export const MCP_TOOLS = [
  "create_product",
  "create_discount",
  "create_checkout_session",
  "list_orders",
  "create_refund",
  "send_post",
] as const;

export const STATIONS = [
  {
    id: 0,
    key: "shelf",
    title: "Product shelf",
    means: "Create a product: name it, price it, upload the files.",
  },
  {
    id: 1,
    key: "ai",
    title: "AI console (MCP)",
    means: "Your AI runs the store over MCP: products, discounts, checkout, refunds.",
  },
  {
    id: 2,
    key: "checkout",
    title: "Checkout bridge",
    means: "Hosted checkout: cards, wallets, crypto, discount codes, one-click upsells.",
  },
  {
    id: 3,
    key: "mor",
    title: "Merchant-of-Record press",
    means: "Tax calculated, collected and remitted; invoice issued; fraud + disputes absorbed.",
  },
  {
    id: 4,
    key: "deliver",
    title: "Delivery + email fan",
    means: "Files delivered instantly; purchase triggers the thank-you automation.",
  },
  {
    id: 5,
    key: "ledger",
    title: "Ledger tower",
    means: "Revenue, orders, MRR and conversion land in one dashboard + webhooks fire.",
  },
] as const;
