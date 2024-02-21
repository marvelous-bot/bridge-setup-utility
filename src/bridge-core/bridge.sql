-- MySQL dump 10.13  Distrib 8.0.35, for Linux (x86_64)
--
-- Host: localhost    Database: mainnetzbridge
-- ------------------------------------------------------
-- Server version	8.0.35-0ubuntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_settings`
--

DROP TABLE IF EXISTS `admin_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `networkid` int NOT NULL,
  `last_block_synced` bigint NOT NULL,
  `customchain_to_network` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL COMMENT 'to keep records of bnb, eth, matic on custom chain',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_settings`
--

LOCK TABLES `admin_settings` WRITE;
/*!40000 ALTER TABLE `admin_settings` DISABLE KEYS */;
INSERT INTO `admin_settings` VALUES (1,11155111,5118505,''),(2,97,37005624,''),(3,80001,44961226,''),(5,9768,1,''),(6,9768,14316288,'bnb'),(7,9768,14316268,'eth'),(8,9768,14316288,'matic');
/*!40000 ALTER TABLE `admin_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bridge_transactions`
--

DROP TABLE IF EXISTS `bridge_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bridge_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fromTxnHash` varchar(70) NOT NULL,
  `fromChainID` int NOT NULL,
  `toChainID` int DEFAULT NULL,
  `orderid` int DEFAULT NULL,
  `secretText` varchar(100) DEFAULT NULL,
  `toWallet` varchar(50) NOT NULL,
  `toAmount` varchar(30) NOT NULL,
  `status` tinyint DEFAULT '0',
  `inputCurrency` varchar(50) NOT NULL,
  `outputCurrency` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bridge_transactions`
--

LOCK TABLES `bridge_transactions` WRITE;
/*!40000 ALTER TABLE `bridge_transactions` DISABLE KEYS */;

/*!40000 ALTER TABLE `bridge_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `token_pricing_table`
--

DROP TABLE IF EXISTS `token_pricing_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `token_pricing_table` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tokenName` varchar(100) DEFAULT NULL,
  `tokenPriceInUSD` float NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `token_pricing_table`
--

LOCK TABLES `token_pricing_table` WRITE;
/*!40000 ALTER TABLE `token_pricing_table` DISABLE KEYS */;
INSERT INTO `token_pricing_table` VALUES (1,'ETH',2376.7),(2,'BNB',319.21),(3,'USDT',1),(4,'Matic',0.984497),(5,'clientChainNativeCoin',0.088092);
/*!40000 ALTER TABLE `token_pricing_table` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-01-20  4:59:37
