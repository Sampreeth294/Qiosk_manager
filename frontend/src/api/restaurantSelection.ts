const STORAGE_KEY = "qiosk-selected-restaurant";

type RestaurantOption = {
  id: number;
  is_active?: boolean;
};

export function getSelectedRestaurantId(): number | null {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored || !/^\d+$/.test(stored)) return null;
  const parsed = Number(stored);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function chooseRestaurantId(
  restaurants: RestaurantOption[],
  currentId?: number | null,
): number | null {
  const active = restaurants.filter((restaurant) => restaurant.is_active !== false);
  const preferredId = getSelectedRestaurantId();
  if (preferredId && active.some((restaurant) => restaurant.id === preferredId)) {
    return preferredId;
  }
  if (currentId && active.some((restaurant) => restaurant.id === currentId)) {
    return currentId;
  }
  return active[0]?.id ?? null;
}

export function storeSelectedRestaurantId(restaurantId: number): void {
  window.localStorage.setItem(STORAGE_KEY, String(restaurantId));
}
