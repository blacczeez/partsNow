-- Repair orders where customer acceptance updated orders.price_review_status
-- but order_items stayed awaiting_customer (customer RLS cannot UPDATE order_items).

UPDATE order_items oi
SET price_review_status = 'customer_approved'
FROM orders o
WHERE oi.order_id = o.id
  AND o.price_review_status = 'resolved'
  AND oi.price_review_status = 'awaiting_customer';
