-- Cached AI-generated summaries of product reviews
-- Run this once on the restaurant database

CREATE TABLE IF NOT EXISTS `product_comment_summaries` (
  `product_ID` int(11) NOT NULL,
  `summary` text NOT NULL,
  `positives` text NOT NULL,
  `negatives` text NOT NULL,
  `comment_count` int(11) NOT NULL DEFAULT 0,
  `average_rating` decimal(3,1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_ID`),
  CONSTRAINT `fk_product_comment_summaries_product`
    FOREIGN KEY (`product_ID`) REFERENCES `products` (`product_ID`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
