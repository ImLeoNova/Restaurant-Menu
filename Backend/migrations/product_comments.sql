-- Product comments system
-- Run this once on the restaurant database

CREATE TABLE IF NOT EXISTS `product_comments` (
  `comment_ID` int(11) NOT NULL AUTO_INCREMENT,
  `product_ID` int(11) NOT NULL,
  `user_ID` varchar(350) NOT NULL,
  `content` text NOT NULL,
  `rating` tinyint(4) NOT NULL DEFAULT 5,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`comment_ID`),
  KEY `idx_product_comments_product` (`product_ID`),
  KEY `idx_product_comments_user` (`user_ID`),
  CONSTRAINT `fk_product_comments_product`
    FOREIGN KEY (`product_ID`) REFERENCES `products` (`product_ID`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
