export interface CartItem {
  partId: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface CartState {
  items: CartItem[];
  vehicleId?: string;
}
