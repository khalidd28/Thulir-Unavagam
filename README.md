# Thulir Unavagam — Full Starter

## 1. Install
Install Node.js and MySQL on your computer.

Then open this folder in VS Code and run:

npm install

## 2. Create the database
Open MySQL Workbench (or the MySQL command line) and run all commands in `schema.sql`.

## 3. Configure the database
Copy `.env.example` to `.env` and put your MySQL password in it.

Example:
DB_PASSWORD=1234

## 4. Start the server
Run:

npm start

Then open:

http://localhost:5000

## Current backend APIs

GET /api/menu
- Returns today's available menu.

POST /api/orders
- Saves a customer order and calculates the total using database prices.

GET /api/admin/orders
- Returns orders for the shop dashboard.

PATCH /api/admin/orders/:id/status
- Updates an order status.

POST /api/admin/menu
- Adds a menu item for a selected date.

## Important
The admin endpoints are only a starter for development. Before public deployment, add proper admin authentication/authorization and input validation.
