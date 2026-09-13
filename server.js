require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =================================
// ADMIN SESSION STORAGE
// =================================

const adminSessions = new Map();

const SESSION_DURATION = 60 * 60 * 1000; // 1 hour

function createAdminSession() {
  const token = crypto.randomBytes(32).toString("hex");

  adminSessions.set(token, {
    expiresAt: Date.now() + SESSION_DURATION
  });

  return token;
}

function getSessionToken(req) {
  const cookies = req.headers.cookie;

  if (!cookies) {
    return null;
  }

  const cookie = cookies
    .split(";")
    .map(item => item.trim())
    .find(item => item.startsWith("admin_session="));

  if (!cookie) {
    return null;
  }

  return cookie.substring("admin_session=".length);
}

// =================================
// ADMIN AUTHENTICATION
// =================================

function requireAdmin(req, res, next) {
  const token = getSessionToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please login."
    });
  }

  const session = adminSessions.get(token);

  if (!session) {
    return res.status(401).json({
      success: false,
      message: "Invalid admin session."
    });
  }

  if (Date.now() > session.expiresAt) {
    adminSessions.delete(token);

    return res.status(401).json({
      success: false,
      message: "Admin session expired. Please login again."
    });
  }

  next();
}

// =================================
// STATIC FILES
// =================================

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

// =================================
// ADMIN LOGIN
// =================================

app.post("/api/admin/login", (req, res) => {
  const {
    username,
    password
  } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = createAdminSession();

    res.setHeader(
      "Set-Cookie",
      `admin_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=3600`
    );

    return res.json({
      success: true,
      message: "Login successful"
    });
  }

  return res.status(401).json({
    success: false,
    message: "Invalid username or password"
  });
});

// =================================
// ADMIN LOGOUT
// =================================

app.post("/api/admin/logout", (req, res) => {
  const token = getSessionToken(req);

  if (token) {
    adminSessions.delete(token);
  }

  res.setHeader(
    "Set-Cookie",
    "admin_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0"
  );

  res.json({
    success: true,
    message: "Logout successful"
  });
});

// =================================
// CUSTOMER MENU
// =================================

app.get("/api/menu", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id AS food_id,
        name,
        description,
        price,
        category AS meal_type,
        '' AS image,
        is_available AS available
      FROM food_items
      WHERE menu_date = CURDATE()
        AND is_available = TRUE
      ORDER BY
        FIELD(
          category,
          'Breakfast',
          'Lunch',
          'Dinner',
          'Tea & Snacks'
        ),
        id
    `);

    res.json(rows);

  } catch (error) {
    console.error(
      "MENU ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to load menu."
    });
  }
});

// =================================
// PLACE CUSTOMER ORDER
// =================================

app.post("/api/orders", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      customer_name,
      phone,
      address,
      items
    } = req.body;

    if (
      !customer_name ||
      !phone ||
      !address ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order details."
      });
    }

    await connection.beginTransaction();

    let totalAmount = 0;

    const orderItems = [];

    for (const item of items) {
      const foodId = Number(item.food_id);
      const quantity = Number(item.quantity);

      if (
        !foodId ||
        !quantity ||
        quantity < 1
      ) {
        throw new Error(
          "Invalid food item."
        );
      }

      const [foodRows] =
        await connection.query(
          `
          SELECT
            id,
            name,
            price,
            is_available
          FROM food_items
          WHERE id = ?
          `,
          [foodId]
        );

      if (foodRows.length === 0) {
        throw new Error(
          "Food item not found."
        );
      }

      const food = foodRows[0];

      if (!food.is_available) {
        throw new Error(
          `${food.name} is currently unavailable.`
        );
      }

      const price = Number(food.price);

      totalAmount += price * quantity;

      orderItems.push({
        food_id: food.id,
        quantity,
        price
      });
    }

    const [orderResult] =
      await connection.query(
        `
        INSERT INTO orders
        (
          customer_name,
          phone,
          address,
          total_amount,
          status
        )
        VALUES (?, ?, ?, ?, 'New')
        `,
        [
          customer_name,
          phone,
          address,
          totalAmount
        ]
      );

    const orderId =
      orderResult.insertId;

    for (const item of orderItems) {
      await connection.query(
        `
        INSERT INTO order_items
        (
          order_id,
          food_item_id,
          quantity,
          price
        )
        VALUES (?, ?, ?, ?)
        `,
        [
          orderId,
          item.food_id,
          item.quantity,
          item.price
        ]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message:
        "Order placed successfully.",
      order_id: orderId,
      total_amount: totalAmount
    });

  } catch (error) {
    await connection.rollback();

    console.error(
      "ORDER ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to place order."
    });

  } finally {
    connection.release();
  }
});

// =================================
// CUSTOMER ORDER TRACKING
// =================================

app.get(
  "/api/orders/:id",
  async (req, res) => {
    try {
      const orderId =
        Number(req.params.id);

      const [orders] =
        await db.query(
          `
          SELECT
            id AS order_id,
            customer_name,
            phone,
            address,
            total_amount,
            status,
            created_at
          FROM orders
          WHERE id = ?
          `,
          [orderId]
        );

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order not found."
        });
      }

      const order =
        orders[0];

      const [items] =
        await db.query(
          `
          SELECT
            oi.food_item_id,
            f.name AS food_name,
            oi.quantity,
            oi.price AS unit_price
          FROM order_items oi
          JOIN food_items f
            ON oi.food_item_id = f.id
          WHERE oi.order_id = ?
          `,
          [orderId]
        );

      order.items = items;

      res.json(order);

    } catch (error) {
      console.error(
        "TRACK ORDER ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to track order."
      });
    }
  }
);

// =================================
// CUSTOMER - MY ORDERS
// =================================
// Customers can view their previous
// orders using their phone number.
// =================================

app.get(
  "/api/my-orders/:phone",
  async (req, res) => {
    try {

      const phone =
        String(req.params.phone || "").trim();

      if (!phone) {
        return res.status(400).json({
          success: false,
          message:
            "Phone number is required."
        });
      }

      const [orders] =
        await db.query(
          `
          SELECT
            id AS order_id,
            customer_name,
            phone,
            address,
            total_amount,
            status,
            created_at
          FROM orders
          WHERE phone = ?
          ORDER BY created_at DESC
          `,
          [phone]
        );

      for (const order of orders) {

        const [items] =
          await db.query(
            `
            SELECT
              oi.food_item_id,
              f.name AS food_name,
              oi.quantity,
              oi.price AS unit_price
            FROM order_items oi
            JOIN food_items f
              ON oi.food_item_id = f.id
            WHERE oi.order_id = ?
            `,
            [order.order_id]
          );

        order.items = items;
      }

      res.json({
        success: true,
        phone,
        total_orders: orders.length,
        orders
      });

    } catch (error) {

      console.error(
        "MY ORDERS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to load your orders."
      });
    }
  }
);

// =================================
// ADMIN - GET ORDERS
// =================================

app.get(
  "/api/admin/orders",
  requireAdmin,
  async (req, res) => {
    try {
      const [orders] =
        await db.query(`
          SELECT
            id AS order_id,
            customer_name,
            phone,
            address,
            total_amount,
            status,
            created_at
          FROM orders
          ORDER BY created_at DESC
        `);

      for (const order of orders) {
        const [items] =
          await db.query(
            `
            SELECT
              oi.food_item_id,
              f.name AS food_name,
              oi.quantity,
              oi.price AS unit_price,
              f.category
            FROM order_items oi
            JOIN food_items f
              ON oi.food_item_id = f.id
            WHERE oi.order_id = ?
            `,
            [order.order_id]
          );

        order.items = items;
      }

      res.json(orders);

    } catch (error) {
      console.error(
        "ADMIN ORDERS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to load orders."
      });
    }
  }
);

// =================================
// ADMIN - SALES & ORDER ANALYTICS
// =================================
// Sales are counted ONLY when status
// is Delivered.
// =================================

app.get(
  "/api/admin/analytics",
  requireAdmin,
  async (req, res) => {
    try {

      const selectedDate =
        req.query.date ||
        new Date()
          .toISOString()
          .split("T")[0];

      // -----------------------------
      // SELECTED DATE SUMMARY
      // ONLY DELIVERED ORDERS
      // -----------------------------

      const [dateSummary] =
        await db.query(
          `
          SELECT
            COUNT(*) AS total_orders,
            COALESCE(
              SUM(total_amount),
              0
            ) AS total_sales
          FROM orders
          WHERE DATE(created_at) = ?
            AND status = 'Delivered'
          `,
          [selectedDate]
        );

      // -----------------------------
      // BREAKFAST SALES
      // ONLY DELIVERED ORDERS
      // -----------------------------

      const [breakfastSummary] =
        await db.query(
          `
          SELECT
            COALESCE(
              SUM(oi.quantity),
              0
            ) AS breakfast_quantity,

            COALESCE(
              SUM(
                oi.quantity * oi.price
              ),
              0
            ) AS breakfast_sales

          FROM order_items oi

          JOIN orders o
            ON oi.order_id = o.id

          JOIN food_items f
            ON oi.food_item_id = f.id

          WHERE DATE(o.created_at) = ?
            AND f.category = 'Breakfast'
            AND o.status = 'Delivered'
          `,
          [selectedDate]
        );

      // -----------------------------
      // CATEGORY SALES
      // ONLY DELIVERED ORDERS
      // -----------------------------

      const [categorySummary] =
        await db.query(
          `
          SELECT
            f.category,

            COALESCE(
              SUM(oi.quantity),
              0
            ) AS quantity,

            COALESCE(
              SUM(
                oi.quantity * oi.price
              ),
              0
            ) AS sales

          FROM order_items oi

          JOIN orders o
            ON oi.order_id = o.id

          JOIN food_items f
            ON oi.food_item_id = f.id

          WHERE DATE(o.created_at) = ?
            AND o.status = 'Delivered'

          GROUP BY f.category

          ORDER BY FIELD(
            f.category,
            'Breakfast',
            'Lunch',
            'Dinner',
            'Tea & Snacks'
          )
          `,
          [selectedDate]
        );

      // -----------------------------
      // MONTHLY SALES
      // ONLY DELIVERED ORDERS
      // -----------------------------

      const [monthlySummary] =
        await db.query(
          `
          SELECT
            COUNT(*) AS monthly_orders,

            COALESCE(
              SUM(total_amount),
              0
            ) AS monthly_sales

          FROM orders

          WHERE YEAR(created_at) =
                YEAR(?)

            AND MONTH(created_at) =
                MONTH(?)

            AND status = 'Delivered'
          `,
          [
            selectedDate,
            selectedDate
          ]
        );

      // -----------------------------
      // DATE-WISE ORDERS
      // ALL STATUSES
      // -----------------------------

      const [dateOrders] =
        await db.query(
          `
          SELECT
            id AS order_id,
            customer_name,
            phone,
            address,
            total_amount,
            status,
            created_at
          FROM orders
          WHERE DATE(created_at) = ?
          ORDER BY created_at DESC
          `,
          [selectedDate]
        );

      // -----------------------------
      // RESPONSE
      // -----------------------------

      res.json({

        success: true,

        date: selectedDate,

        dateSummary: {

          totalOrders:
            Number(
              dateSummary[0]
                .total_orders || 0
            ),

          totalSales:
            Number(
              dateSummary[0]
                .total_sales || 0
            )
        },

        breakfast: {

          quantity:
            Number(
              breakfastSummary[0]
                .breakfast_quantity || 0
            ),

          sales:
            Number(
              breakfastSummary[0]
                .breakfast_sales || 0
            )
        },

        categories:
          categorySummary.map(
            category => ({

              category:
                category.category,

              quantity:
                Number(
                  category.quantity || 0
                ),

              sales:
                Number(
                  category.sales || 0
                )
            })
          ),

        monthly: {

          orders:
            Number(
              monthlySummary[0]
                .monthly_orders || 0
            ),

          sales:
            Number(
              monthlySummary[0]
                .monthly_sales || 0
            )
        },

        dateOrders

      });

    } catch (error) {

      console.error(
        "ANALYTICS ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Unable to load sales analytics."
      });
    }
  }
);

// =================================
// ADMIN - UPDATE ORDER STATUS
// =================================

app.patch(
  "/api/admin/orders/:id/status",
  requireAdmin,
  async (req, res) => {
    try {

      const orderId =
        Number(req.params.id);

      const { status } =
        req.body;

      const allowedStatuses = [
        "New",
        "Accepted",
        "Preparing",
        "Ready",
        "Out for Delivery",
        "Delivered",
        "Cancelled"
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order status."
        });
      }

      const [result] =
        await db.query(
          `
          UPDATE orders
          SET status = ?
          WHERE id = ?
          `,
          [
            status,
            orderId
          ]
        );

      if (
        result.affectedRows === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found."
        });
      }

      res.json({
        success: true,
        message:
          "Order status updated."
      });

    } catch (error) {

      console.error(
        "STATUS UPDATE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to update order status."
      });
    }
  }
);

// =================================
// ADMIN - ADD MENU ITEM
// =================================

app.post(
  "/api/admin/menu",
  requireAdmin,
  async (req, res) => {
    try {

      const {
        name,
        description,
        category,
        meal_type,
        price,
        menu_date,
        is_available
      } = req.body;

      const finalCategory =
        category || meal_type;

      if (
        !name ||
        !finalCategory ||
        price === undefined ||
        !menu_date
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Required menu details are missing."
        });
      }

      const [result] =
        await db.query(
          `
          INSERT INTO food_items
          (
            name,
            description,
            category,
            price,
            menu_date,
            is_available
          )
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            name,
            description || "",
            finalCategory,
            price,
            menu_date,
            is_available !== undefined
              ? Boolean(is_available)
              : true
          ]
        );

      res.json({

        success: true,

        message:
          "Menu item added successfully.",

        food_id:
          result.insertId
      });

    } catch (error) {

      console.error(
        "ADD MENU ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to add menu item."
      });
    }
  }
);

// =================================
// ADMIN - GET ALL MENU
// =================================

app.get(
  "/api/admin/menu",
  requireAdmin,
  async (req, res) => {
    try {

      const [rows] =
        await db.query(`
          SELECT
            id AS food_id,
            name,
            description,
            price,
            category AS meal_type,
            menu_date,
            is_available AS available
          FROM food_items
          ORDER BY
            menu_date DESC,
            FIELD(
              category,
              'Breakfast',
              'Lunch',
              'Dinner',
              'Tea & Snacks'
            ),
            id
        `);

      res.json(rows);

    } catch (error) {

      console.error(
        "ADMIN MENU ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to load admin menu."
      });
    }
  }
);

// =================================
// ADMIN - EDIT MENU ITEM
// =================================

app.put(
  "/api/admin/menu/:id",
  requireAdmin,
  async (req, res) => {
    try {

      const foodId =
        Number(req.params.id);

      const {
        name,
        description,
        category,
        meal_type,
        price,
        menu_date
      } = req.body;

      const finalCategory =
        category || meal_type;

      if (
        !foodId ||
        !name ||
        !finalCategory ||
        price === undefined ||
        !menu_date
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Required menu details are missing."
        });
      }

      const [result] =
        await db.query(
          `
          UPDATE food_items
          SET
            name = ?,
            description = ?,
            category = ?,
            price = ?,
            menu_date = ?
          WHERE id = ?
          `,
          [
            name,
            description || "",
            finalCategory,
            price,
            menu_date,
            foodId
          ]
        );

      if (
        result.affectedRows === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Food item not found."
        });
      }

      res.json({
        success: true,
        message:
          "Menu item updated successfully."
      });

    } catch (error) {

      console.error(
        "EDIT MENU ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to update menu item."
      });
    }
  }
);

// =================================
// ADMIN - DELETE MENU ITEM
// =================================

app.delete(
  "/api/admin/menu/:id",
  requireAdmin,
  async (req, res) => {
    try {

      const foodId =
        Number(req.params.id);

      if (!foodId) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid food item ID."
        });
      }

      try {

        // Try permanent deletion first
        const [result] =
          await db.query(
            `
            DELETE FROM food_items
            WHERE id = ?
            `,
            [foodId]
          );

        if (
          result.affectedRows === 0
        ) {
          return res.status(404).json({
            success: false,
            message:
              "Food item not found."
          });
        }

        return res.json({
          success: true,
          message:
            "Menu item deleted successfully."
        });

      } catch (deleteError) {

        // If old orders use this item,
        // hide it instead of deleting it.
        if (
          deleteError.code ===
          "ER_ROW_IS_REFERENCED_2"
        ) {

          const [hideResult] =
            await db.query(
              `
              UPDATE food_items
              SET is_available = FALSE
              WHERE id = ?
              `,
              [foodId]
            );

          if (
            hideResult.affectedRows === 0
          ) {
            return res.status(404).json({
              success: false,
              message:
                "Food item not found."
            });
          }

          return res.json({
            success: true,
            message:
              "Menu item was already used in an order, so it has been removed from the active menu while preserving old order history."
          });
        }

        throw deleteError;
      }

    } catch (error) {

      console.error(
        "DELETE MENU ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to delete menu item."
      });
    }
  }
);

// =================================
// ADMIN - CHANGE AVAILABILITY
// =================================

app.patch(
  "/api/admin/menu/:id/availability",
  requireAdmin,
  async (req, res) => {
    try {

      const foodId =
        Number(req.params.id);

      const {
        available
      } = req.body;

      const [result] =
        await db.query(
          `
          UPDATE food_items
          SET is_available = ?
          WHERE id = ?
          `,
          [
            Boolean(available),
            foodId
          ]
        );

      if (
        result.affectedRows === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Food item not found."
        });
      }

      res.json({
        success: true,
        message:
          "Availability updated."
      });

    } catch (error) {

      console.error(
        "AVAILABILITY ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to update availability."
      });
    }
  }
);

// =================================
// DEFAULT PAGE
// =================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

// =================================
// START SERVER
// =================================

const PORT =
  Number(process.env.PORT) || 5000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Thulir Unavagam server running on port ${PORT}`
    );

  }
);