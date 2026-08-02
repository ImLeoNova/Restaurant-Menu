CREATE TABLE IF NOT EXISTS `weekly_report_summaries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `week_start` DATE NOT NULL,
  `week_end` DATE NOT NULL,
  `summary_founder` TEXT NOT NULL,
  `summary_admin` TEXT NOT NULL,
  `generated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_week` (`week_start`, `week_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
