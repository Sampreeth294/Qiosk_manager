
import { useMemo, useState } from "react";

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  emoji: string;
};

type CartItem = {
  product: Product;
  quantity: number;
};

type PaymentMethod = "Cash" | "UPI" | "Card";
type OrderType = "Dine-in" | "Takeaway";

const products: Product[] = [
  { id: 1, name: "Masala Dosa", category: "South Indian", price: 100, emoji: "🥞" },
  { id: 2, name: "Idli Vada", category: "South Indian", price: 60, emoji: "🍘" },
  { id: 3, name: "Plain Dosa", category: "South Indian", price: 70, emoji: "🫓" },
  { id: 4, name: "Paneer Butter Masala", category: "North Indian", price: 200, emoji: "🍛" },
  { id: 5, name: "Butter Naan", category: "North Indian", price: 40, emoji: "🫓" },
  { id: 6, name: "Veg Fried Rice", category: "Chinese", price: 150, emoji: "🍚" },
  { id: 7, name: "Gobi Manchurian", category: "Chinese", price: 130, emoji: "🥦" },
  { id: 8, name: "Veg Biryani", category: "Rice & Biryani", price: 160, emoji: "🍲" },
  { id: 9, name: "Filter Coffee", category: "Beverages", price: 35, emoji: "☕" },
  { id: 10, name: "Fresh Lime Soda", category: "Beverages", price: 50, emoji: "🍋" },
  { id: 11, name: "Gulab Jamun", category: "Desserts", price: 60, emoji: "🍮" },
  { id: 12, name: "Ice Cream", category: "Desserts", price: 80, emoji: "🍨" },
];

const categories = [
  "All",
  ...Array.from(new Set(products.map((product) => product.category))),
];

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export default function POS() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("Dine-in");
  const [tableNumber, setTableNumber] = useState("1");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("Cash");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(5);
  const [customerName, setCustomerName] = useState("");
  const [receipt, setReceipt] = useState<{
    number: string;
    customer: string;
    items: CartItem[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    payment: PaymentMethod;
    orderType: OrderType;
    tableNumber: string;
  } | null>(null);
  const [message, setMessage] = useState("");

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        category === "All" || product.category === category;
      const matchesSearch = product.name.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  const itemCount = cart.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const subtotal = cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );

  const discountAmount = Math.min(
    subtotal,
    Math.round((subtotal * discount) / 100),
  );

  // Illustrative tax calculation for the demo UI.
  const taxableAmount = subtotal - discountAmount;
  const tax = Math.round((taxableAmount * taxRate) / 100);
  const total = taxableAmount + tax;

  function addItem(product: Product) {
    setCart((previous) => {
      const existing = previous.find(
        (item) => item.product.id === product.id,
      );

      if (existing) {
        return previous.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...previous, { product, quantity: 1 }];
    });

    setMessage("");
    setReceipt(null);
  }

  function changeQuantity(productId: number, change: number) {
    setCart((previous) =>
      previous
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + change }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );

    setMessage("");
    setReceipt(null);
  }

  function checkout() {
    if (cart.length === 0) {
      setMessage("Add at least one item before checkout.");
      return;
    }

    const completedReceipt = {
      number: `DEMO-${Date.now().toString().slice(-6)}`,
      customer: customerName.trim() || "Walk-in Customer",
      items: cart.map((item) => ({
        product: { ...item.product },
        quantity: item.quantity,
      })),
      subtotal,
      discount: discountAmount,
      tax,
      total,
      payment: paymentMethod,
      orderType,
      tableNumber,
    };

    setReceipt(completedReceipt);
    setMessage("Demo sale completed. No real payment was processed.");
    setCart([]);
    setDiscount(0);
    setCustomerName("");
  }

  function printReceipt() {
    if (!receipt) return;

    const receiptWindow = window.open("", "_blank", "width=420,height=700");

    if (!receiptWindow) {
      setMessage("Allow pop-ups in your browser to print the receipt.");
      return;
    }

    const rows = receipt.items
      .map(
        (item) => `
          <tr>
            <td>${item.product.name}</td>
            <td>${item.quantity}</td>
            <td>${money(item.product.price * item.quantity)}</td>
          </tr>
        `,
      )
      .join("");

    receiptWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Receipt ${receipt.number}</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1, p { text-align: center; }
            h1 { font-size: 22px; }
            .muted { color: #6b7280; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { text-align: left; padding: 9px 3px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
            .total { font-size: 18px; font-weight: bold; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <h1>Qiosk Restaurant</h1>
          <p class="muted">Demo receipt — not a tax invoice</p>
          <p>Receipt: ${receipt.number}</p>
          <p>Customer: ${receipt.customer}</p>
          <p>${receipt.orderType}${receipt.orderType === "Dine-in" ? ` · Table ${receipt.tableNumber}` : ""}</p>
          <p>Payment: ${receipt.payment}</p>
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Amount</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p class="right">Subtotal: ${money(receipt.subtotal)}</p>
          <p class="right">Discount: −${money(receipt.discount)}</p>
          <p class="right">Illustrative tax: ${money(receipt.tax)}</p>
          <p class="right total">Total: ${money(receipt.total)}</p>
          <p class="muted">No real payment was processed.</p>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);

    receiptWindow.document.close();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            RESTAURANT OPERATIONS
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Point of Sale
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create orders and prepare a demo receipt.
          </p>
        </div>

        <span className="w-fit rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          Demo mode · No live payments
        </span>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800"
        >
          {message}
        </div>
      )}

      {receipt && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-emerald-800">
                Demo receipt created
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                {receipt.number} · Total {money(receipt.total)}
              </p>
            </div>

            <button
              type="button"
              onClick={printReceipt}
              className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Print Receipt
            </button>
          </div>
        </section>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-3">
        {/* Product selection */}
        <section className="space-y-5 xl:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search menu items..."
                aria-label="Search products"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
              />

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                }}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Reset Filters
              </button>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                    category === item
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addItem(product)}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex h-24 items-center justify-center rounded-xl bg-orange-50 text-5xl">
                  {product.emoji}
                </div>

                <p className="mt-4 text-xs font-medium text-indigo-600">
                  {product.category}
                </p>

                <h2 className="mt-1 font-semibold text-slate-900">
                  {product.name}
                </h2>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">
                    {money(product.price)}
                  </span>
                  <span className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">
                    + Add
                  </span>
                </div>
              </button>
            ))}

            {filteredProducts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500 sm:col-span-2 lg:col-span-3">
                No products match your search.
              </div>
            )}
          </div>
        </section>

        {/* Cart and checkout */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Current Order
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setCart([]);
                setMessage("");
              }}
              disabled={cart.length === 0}
              className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="my-6 rounded-xl bg-slate-50 p-6 text-center">
              <p className="text-3xl">🛒</p>
              <p className="mt-3 text-sm font-medium text-slate-700">
                No items added
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Select a product to begin.
              </p>
            </div>
          ) : (
            <div className="mt-5 max-h-72 space-y-4 overflow-y-auto">
              {cart.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="border-b border-slate-100 pb-4"
                >
                  <div className="flex justify-between gap-3">
                    <p className="text-sm font-medium text-slate-800">
                      {product.name}
                    </p>
                    <p className="shrink-0 text-sm font-semibold text-slate-800">
                      {money(product.price * quantity)}
                    </p>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      {money(product.price)} each
                    </p>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label={`Decrease ${product.name}`}
                        onClick={() => changeQuantity(product.id, -1)}
                        className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50"
                      >
                        −
                      </button>

                      <span className="min-w-4 text-center text-sm font-semibold">
                        {quantity}
                      </span>

                      <button
                        type="button"
                        aria-label={`Increase ${product.name}`}
                        onClick={() => changeQuantity(product.id, 1)}
                        className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
            <div>
              <label
                htmlFor="customer-name"
                className="text-sm font-medium text-slate-700"
              >
                Customer Name
              </label>
              <input
                id="customer-name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Walk-in customer"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700">
                Order Type
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["Dine-in", "Takeaway"] as OrderType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOrderType(type)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${
                      orderType === type
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {orderType === "Dine-in" && (
              <div>
                <label
                  htmlFor="table-number"
                  className="text-sm font-medium text-slate-700"
                >
                  Table
                </label>
                <select
                  id="table-number"
                  value={tableNumber}
                  onChange={(event) => setTableNumber(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  {Array.from({ length: 20 }, (_, index) => (
                    <option key={index + 1} value={String(index + 1)}>
                      Table {index + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label
                htmlFor="discount"
                className="text-sm font-medium text-slate-700"
              >
                Discount (%)
              </label>
              <input
                id="discount"
                type="number"
                min="0"
                max="100"
                step="1"
                value={discount}
                onChange={(event) =>
                  setDiscount(
                    Math.max(
                      0,
                      Math.min(100, Number(event.target.value) || 0),
                    ),
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="tax-rate"
                className="text-sm font-medium text-slate-700"
              >
                Demo Tax Rate (%)
              </label>
              <input
                id="tax-rate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxRate}
                onChange={(event) =>
                  setTaxRate(
                    Math.max(
                      0,
                      Math.min(100, Number(event.target.value) || 0),
                    ),
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700">
                Payment Method
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["Cash", "UPI", "Card"] as PaymentMethod[]).map(
                  (method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-xl border px-2 py-3 text-sm font-medium ${
                        paymentMethod === method
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      {method}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>

              <div className="flex justify-between text-sm text-slate-600">
                <span>Discount</span>
                <span>−{money(discountAmount)}</span>
              </div>

              <div className="flex justify-between text-sm text-slate-600">
                <span>Illustrative tax</span>
                <span>{money(tax)}</span>
              </div>

              <div className="flex justify-between border-t border-slate-100 pt-4 text-lg font-bold text-slate-900">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={checkout}
              disabled={cart.length === 0}
              className="w-full rounded-xl bg-indigo-600 px-4 py-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Complete Demo Sale
            </button>

            <p className="text-center text-xs leading-5 text-slate-500">
              Demo only. No real payment is collected, and the sale is not
              saved to the database.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
