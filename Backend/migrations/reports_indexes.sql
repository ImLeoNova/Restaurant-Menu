-- Composite indexes to speed up analytics range queries.
-- Safe to run multiple times (IF NOT EXISTS not supported for indexes in older MySQL,
-- so we use a procedure-style guard via information_schema check in schema ensure,
-- or simply run once during deploy).

-- orders(created_at, status)
ALTER TABLE `orders`
  ADD INDEX `idx_orders_created_status` (`created_at`, `status`);

-- order_items(order_ID, product_ID) — already has separate indexes; composite helps JOINs
ALTER TABLE `order_items`
  ADD INDEX `idx_order_items_order_product` (`order_ID`, `product_ID`);

-- restaurantusers(created_at) for new-user trends
ALTER TABLE `restaurantusers`
  ADD INDEX `idx_users_created_at` (`created_at`);

-- product_comments(created_at) for rating trends
ALTER TABLE `product_comments`
  ADD INDEX `idx_comments_created_at` (`created_at`);

-- payment_intents(created_at)
ALTER TABLE `payment_intents`
  ADD INDEX `idx_payment_intents_created_at` (`created_at`);
