-- ============================================================================
-- FizzDrop Multi-Tier Beverage E-Commerce & B2B Logistics Platform
-- Database Reset Script - MySQL 8.0+
-- Script: reset_db.sql
-- Description: Completely drops fizzdrop_db and recreates it cleanly.
-- ============================================================================

DROP DATABASE IF EXISTS `fizzdrop_db`;
CREATE DATABASE `fizzdrop_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
