Cart payload for future checkout integration:

- The frontend cart is currently stored in localStorage and exposed through CartService.
- When the backend order endpoint is ready, the payload can be sent as:

{
  "items": [
    {
      "product_id": 12,
      "quantity": 2,
      "unit_price": 120,
      "line_total": 240
    }
  ],
  "subtotal": 240,
  "discount": 0,
  "tax": 0,
  "shipping": 0,
  "grand_total": 240
}

- The cart model already includes placeholder fields for discount, tax, and shipping so the structure can be expanded later without major refactoring.
