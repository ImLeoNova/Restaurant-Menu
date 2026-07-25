-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 19, 2026 at 05:49 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `restaurant`
--

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `category_ID` int(11) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `title` varchar(350) NOT NULL,
  `image` varchar(350) NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_ID` int(11) NOT NULL,
  `image` varchar(350) NOT NULL,
  `title` varchar(350) NOT NULL,
  `description` varchar(350) NOT NULL,
  `category` varchar(350) NOT NULL,
  `price` varchar(350) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_ID`, `image`, `title`, `description`, `category`, `price`) VALUES
(1, 'BaconBurger.png', 'بیکن برگر', 'دو برگر گریل شده با سس مخصوص و پنیر و گوجه و خیارشور و کاهو و بیکن و دو پنیر', 'burger', '320'),
(15, 'MargaritaPizza.png', 'پیتزای مارگاریتا', 'پیتزای مارگاریتا شامل سس گوجه، پنیر موزارلا و ریحان تازه است و طعمی ساده و اصیل دارد.', 'pizza', '320'),
(16, 'ChiliChicken.png', 'پیتزای مرغ و چیلی', 'پیتزای چیلی و مرغ ترکیبی از مرغ گریل‌شده، فلفل چیلی تند و پنیر است که طعمی تند و لذیذ دارد.', 'pizza', '415'),
(17, 'dbl-burger.png', 'دبل برگر', 'دو برگر و پنیر و پیاز و گوجه و فلفل و به همراه دو سس اضافه و کاهو و پنیر', 'burger', '200'),
(18, 'SpecialBurger.png', 'اسپشیال برگر', 'یک برگر با سس مخصوص و کاهو و گوجه و خیارشور و بیکن و پنیر و نان گریل شده', 'burger', '400'),
(19, 'VeganBurger.png', 'برگر گیاهی', 'یک برگر کاملا گیاهی و نان گیاهی و خیارشور و گوجه و کاهو و پیاز و سس مخصوص گیاهی', 'burger', '900'),
(20, 'SmashBurger.png', 'برگر مخصوص', 'دو برگر و سس مخصوص و مقدار زیادی پیاز و نان گریل شده و دو پنیر', 'burger', '600'),
(21, 'BBQChicken.png', 'پیتزای باربیکیو چیکن', 'پیتزای باربیکیو چیکن شامل مرغ گریل‌شده، سس باربیکیو، پنیر موزارلا و پیاز قرمز است', 'pizza', '300'),
(23, 'steak.png', 'استیک امریکا', 'این استیک با گوشت 600 گرمی، سس چیلی تای و رزماری همراه با سس قارچ و سیب‌زمینی 200 گرمی و سبزیجات سرو می‌شود. ', 'steak', '760'),
(24, 'normal-steak.png', 'استیک معمولی', 'این استیک ساده از 400 گرم گوشت، رزماری و کمی سس ایتالیایی تهیه می‌شود. طعمی خوشمزه و راحت دارد.', 'steak', '456'),
(25, 'steak-tond.png', 'استیک مکزیک', 'استیک تند با گوجه، رزماری و ادویه‌های تند، طعمی پرحرارت و معطر به همراه لذت خاصی از تندی به غذا می‌دهد.', 'steak', '900');

--
-- Table structure for table `product_comments`
--

CREATE TABLE `product_comments` (
  `comment_ID` int(11) NOT NULL,
  `product_ID` int(11) NOT NULL,
  `user_ID` varchar(350) NOT NULL,
  `content` text NOT NULL,
  `rating` tinyint(4) NOT NULL DEFAULT 5,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `restaurantusers`
--

CREATE TABLE `restaurantusers` (
  `user_ID` varchar(350) NOT NULL,
  `username` varchar(350) NOT NULL,
  `password` varchar(350) NOT NULL,
  `email` varchar(350) NOT NULL,
  `role` varchar(350) NOT NULL,
  `conversation_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`conversation_history`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_ID`),
  ADD UNIQUE KEY `uq_categories_slug` (`slug`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_ID`);

--
-- Indexes for table `product_comments`
--
ALTER TABLE `product_comments`
  ADD PRIMARY KEY (`comment_ID`),
  ADD KEY `idx_product_comments_product` (`product_ID`),
  ADD KEY `idx_product_comments_user` (`user_ID`);

--
-- Indexes for table `restaurantusers`
--
ALTER TABLE `restaurantusers`
  ADD PRIMARY KEY (`user_ID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `category_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `product_comments`
--
ALTER TABLE `product_comments`
  MODIFY `comment_ID` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `product_comments`
  ADD CONSTRAINT `fk_product_comments_product`
  FOREIGN KEY (`product_ID`) REFERENCES `products` (`product_ID`)
  ON DELETE CASCADE;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
