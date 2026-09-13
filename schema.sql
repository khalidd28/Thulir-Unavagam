CREATE DATABASE IF NOT EXISTS thulir_unavagam;
USE thulir_unavagam;

CREATE TABLE IF NOT EXISTS food_items (
  food_id INT AUTO_INCREMENT PRIMARY KEY,
  menu_date DATE NOT NULL,
  meal_type ENUM('Breakfast', 'Lunch', 'Dinner', 'Tea & Snacks') NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  price DECIMAL(10,2) NOT NULL,
  image VARCHAR(255),
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM(
    'New',
    'Accepted',
    'Preparing',
    'Ready',
    'Out for Delivery',
    'Delivered',
    'Cancelled'
  ) DEFAULT 'New',
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  food_id INT NULL,
  food_name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (food_id) REFERENCES food_items(food_id) ON DELETE SET NULL
);

-- Sample menu for today. Replace these with the shop's real menu.
INSERT INTO food_items (menu_date, meal_type, name, description, price)
VALUES
(CURDATE(), 'Breakfast', 'Idli', 'Soft steamed rice cakes', 20.00),
(CURDATE(), 'Breakfast', 'Vada', 'Crispy South Indian snack', 15.00),
(CURDATE(), 'Breakfast', 'Pongal', 'Traditional rice and lentil dish', 40.00),
(CURDATE(), 'Lunch', 'South Indian Meals', 'Traditional lunch meal', 80.00),
(CURDATE(), 'Lunch', 'Variety Rice', 'Chef special variety rice', 60.00),
(CURDATE(), 'Lunch', 'Curd Rice', 'Cooling curd rice', 45.00),
(CURDATE(), 'Dinner', 'Parotta', 'Layered soft parotta', 15.00),
(CURDATE(), 'Dinner', 'Chapati', 'Fresh wheat chapati', 20.00),
(CURDATE(), 'Dinner', 'Dosa', 'Crispy South Indian dosa', 40.00),
(CURDATE(), 'Tea & Snacks', 'Tea', 'Freshly prepared tea', 15.00),
(CURDATE(), 'Tea & Snacks', 'Coffee', 'Fresh filter coffee', 20.00),
(CURDATE(), 'Tea & Snacks', 'Bajji', 'Fresh evening snack', 25.00);
