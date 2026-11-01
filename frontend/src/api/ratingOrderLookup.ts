const STORAGE_KEY = "qiosk-rating-orders";
const MAX_SAVED_ORDERS = 50;

type SavedRatingOrder = {
  displayOrderNumber: string;
  orderNumber: string;
};

function isSavedRatingOrder(value: unknown): value is SavedRatingOrder {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.displayOrderNumber === "string" &&
    /^[A-Z]-\d{2}$/.test(record.displayOrderNumber) &&
    typeof record.orderNumber === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      record.orderNumber,
    )
  );
}

function readSavedOrders(): SavedRatingOrder[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isSavedRatingOrder) : [];
  } catch (error) {
    console.warn("Unable to read saved rating order references.", error);
    return [];
  }
}

export function rememberRatingOrder(
  displayOrderNumber: string | null,
  orderNumber: string,
) {
  if (!displayOrderNumber || !isSavedRatingOrder({ displayOrderNumber, orderNumber })) {
    return;
  }

  const savedOrders = readSavedOrders().filter(
    (saved) => saved.displayOrderNumber !== displayOrderNumber,
  );
  savedOrders.push({ displayOrderNumber, orderNumber });

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(savedOrders.slice(-MAX_SAVED_ORDERS)),
    );
  } catch (error) {
    console.warn("Unable to save the rating reference for this order.", error);
  }
}

export function resolveRatingOrderNumber(input: string): string | null {
  const value = input.trim();
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return value;
  }

  const displayOrderNumber = value.replace(/^#/, "").toUpperCase();
  if (!/^[A-Z]-\d{2}$/.test(displayOrderNumber)) return null;

  return (
    readSavedOrders().find(
      (saved) => saved.displayOrderNumber === displayOrderNumber,
    )?.orderNumber ?? null
  );
}
