CREATE TABLE IF NOT EXISTS `otp_verifications` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `phone_number` VARCHAR(20) NOT NULL,
  `otp_hash` VARCHAR(128) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `attempts` INT NOT NULL DEFAULT 0,
  `max_attempts` INT NOT NULL DEFAULT 5,
  `is_used` TINYINT(1) NOT NULL DEFAULT 0,
  `verification_token` VARCHAR(128) DEFAULT NULL,
  `token_expires_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_otp_phone` (`phone_number`),
  KEY `idx_otp_token` (`verification_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Optional unique index on phone for users (run carefully if duplicates exist)
-- ALTER TABLE `restaurantusers` ADD UNIQUE KEY `uq_users_phone` (`phone_number`);
