require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");

const app = express();

const PORT = Number(process.env.PORT) || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================================================
   SESSION CONFIGURATION
   ========================================================= */

const SESSION_DURATION = 60 * 60 * 1000;

const CUSTOMER_SESSION_SECRET =
  process.env.CUSTOMER_SESSION_SECRET ||
  "thulir-unavagam-customer-session-secret-2026";


/* =========================================================
   COOKIE HELPERS
   ========================================================= */

function getCookies(req) {

  const cookieHeader =
    req.headers.cookie || "";

  const cookies = {};

  cookieHeader.split(";").forEach(cookie => {

    const parts =
      cookie.trim().split("=");

    if (parts.length >= 2) {

      const key = parts.shift();

      const value =
        parts.join("=");

      try {
        cookies[key] =
          decodeURIComponent(value);
      } catch {
        cookies[key] = value;
      }

    }

  });

  return cookies;
}


/* =========================================================
   ADMIN SESSION SYSTEM
   ========================================================= */

const adminSessions = new Map();


function createAdminSession() {

  const token =
    crypto.randomBytes(32).toString("hex");

  adminSessions.set(token, {

    createdAt: Date.now(),

    expiresAt:
      Date.now() + SESSION_DURATION

  });

  return token;
}


function getAdminToken(req) {

  const cookies =
    getCookies(req);

  return cookies.admin_session || null;
}


function requireAdmin(req, res, next) {

  const token =
    getAdminToken(req);

  if (!token) {

    return res.status(401).json({

      success: false,

      message:
        "Admin login required."

    });

  }


  const session =
    adminSessions.get(token);


  if (!session) {

    return res.status(401).json({

      success: false,

      message:
        "Invalid admin session."

    });

  }


  if (
    Date.now() >
    session.expiresAt
  ) {

    adminSessions.delete(token);

    return res.status(401).json({

      success: false,

      message:
        "Admin session expired."

    });

  }


  next();

}


/* =========================================================
   ADMIN LOGIN
   ========================================================= */

app.post(
  "/api/admin/login",
  (req, res) => {

    try {

      const username =
        String(
          req.body.username || ""
        ).trim();

      const password =
        String(
          req.body.password || ""
        );


      const adminUsername =
        process.env.ADMIN_USERNAME ||
        "admin";


      const adminPassword =
        process.env.ADMIN_PASSWORD ||
        "admin123";


      if (
        username !== adminUsername ||
        password !== adminPassword
      ) {

        return res.status(401).json({

          success: false,

          message:
            "Invalid username or password."

        });

      }


      const token =
        createAdminSession();


      res.setHeader(

        "Set-Cookie",

        `admin_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Max-Age=3600; Path=/`

      );


      res.json({

        success: true,

        message:
          "Admin login successful."

      });


    } catch (error) {

      console.error(
        "ADMIN LOGIN ERROR:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to login."

      });

    }

  }
);


/* =========================================================
   ADMIN LOGOUT
   ========================================================= */

app.post(
  "/api/admin/logout",
  (req, res) => {

    try {

      const token =
        getAdminToken(req);


      if (token) {

        adminSessions.delete(token);

      }


      res.setHeader(

        "Set-Cookie",

        "admin_session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/"

      );


      res.json({

        success: true,

        message:
          "Logged out successfully."

      });


    } catch (error) {

      console.error(
        "ADMIN LOGOUT ERROR:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to logout."

      });

    }

  }
);


/* =========================================================
   ADMIN SESSION CHECK
   ========================================================= */

app.get(
  "/api/admin/check",
  requireAdmin,
  (req, res) => {

    res.json({

      success: true,

      loggedIn: true

    });

  }
);


/* =========================================================
   CUSTOMER ACCOUNT SYSTEM
   ========================================================= */


/*
   Customer session is stored inside a signed cookie.

   This means restarting Node.js does NOT automatically
   destroy the customer's login session.
*/


function createCustomerToken(customer) {

  const payload = {

    id: customer.id,

    name: customer.name,

    phone: customer.phone,

    email: customer.email,

    expiresAt:
      Date.now() + SESSION_DURATION

  };


  const encodedPayload =
    Buffer
      .from(JSON.stringify(payload))
      .toString("base64url");


  const signature =
    crypto
      .createHmac(
        "sha256",
        CUSTOMER_SESSION_SECRET
      )
      .update(encodedPayload)
      .digest("base64url");


  return `${encodedPayload}.${signature}`;

}


function verifyCustomerToken(token) {

  try {

    if (!token) {
      return null;
    }


    const parts =
      token.split(".");


    if (parts.length !== 2) {
      return null;
    }


    const [
      encodedPayload,
      signature
    ] = parts;


    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          CUSTOMER_SESSION_SECRET
        )
        .update(encodedPayload)
        .digest("base64url");


    const signatureBuffer =
      Buffer.from(
        signature
      );


    const expectedBuffer =
      Buffer.from(
        expectedSignature
      );


    if (
      signatureBuffer.length !==
      expectedBuffer.length
    ) {

      return null;

    }


    if (
      !crypto.timingSafeEqual(
        signatureBuffer,
        expectedBuffer
      )
    ) {

      return null;

    }


    const payload =
      JSON.parse(

        Buffer
          .from(
            encodedPayload,
            "base64url"
          )
          .toString("utf8")

      );


    if (
      !payload.expiresAt ||
      Date.now() >
        Number(payload.expiresAt)
    ) {

      return null;

    }


    return payload;


  } catch (error) {

    return null;

  }

}


function getCustomerToken(req) {

  const cookies =
    getCookies(req);

  return cookies.customer_session || null;

}


function requireCustomer(req, res, next) {

  const token =
    getCustomerToken(req);


  if (!token) {

    return res.status(401).json({

      success: false,

      message:
        "Customer login required."

    });

  }


  const customer =
    verifyCustomerToken(token);


  if (!customer) {

    res.setHeader(

      "Set-Cookie",

      "customer_session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/"

    );


    return res.status(401).json({

      success: false,

      message:
        "Customer session expired. Please login again."

    });

  }


  req.customer = customer;

  next();

}


/* =========================================================
   CUSTOMER REGISTER
   ========================================================= */

app.post(
  "/api/customer/register",
  async (req, res) => {

    try {

      const name =
        String(
          req.body.name || ""
        ).trim();


      const phone =
        String(
          req.body.phone || ""
        ).trim();


      const email =
        String(
          req.body.email || ""
        )
          .trim()
          .toLowerCase();


      const password =
        String(
          req.body.password || ""
        );


      if (!name) {

        return res.status(400).json({

          success: false,

          message:
            "Name is required."

        });

      }


      if (
        !/^\d{10}$/.test(phone)
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Please enter a valid 10-digit phone number."

        });

      }


      if (
        !email ||
        !email.includes("@")
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Please enter a valid email."

        });

      }


      if (
        password.length < 6
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Password must be at least 6 characters."

        });

      }


      const [existing] =
        await db.query(

          `
          SELECT id
          FROM customers
          WHERE phone = ?
          OR email = ?
          LIMIT 1
          `,

          [
            phone,
            email
          ]

        );


      if (existing.length > 0) {

        return res.status(409).json({

          success: false,

          message:
            "Phone number or email already registered."

        });

      }


      const salt =
        crypto.randomBytes(16);


      const passwordHash =
        await new Promise(
          (resolve, reject) => {

            crypto.scrypt(

              password,

              salt,

              64,

              (error, derivedKey) => {

                if (error) {

                  return reject(
                    error
                  );

                }


                resolve(

                  salt.toString("hex") +
                  ":" +
                  derivedKey.toString("hex")

                );

              }

            );

          }
        );


      const [result] =
        await db.query(

          `
          INSERT INTO customers
          (
            name,
            phone,
            email,
            password
          )
          VALUES (?, ?, ?, ?)
          `,

          [
            name,
            phone,
            email,
            passwordHash
          ]

        );


      res.status(201).json({

        success: true,

        message:
          "Account created successfully.",

        customer_id:
          result.insertId

      });


    } catch (error) {

      console.error(
        "CUSTOMER REGISTER ERROR:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to create account."

      });

    }

  }
);


/* =========================================================
   CUSTOMER LOGIN
   ========================================================= */

app.post(
  "/api/customer/login",
  async (req, res) => {

    try {

      const login =
        String(
          req.body.login || ""
        ).trim();


      const password =
        String(
          req.body.password || ""
        );


      if (
        !login ||
        !password
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Login and password are required."

        });

      }


      const [rows] =
        await db.query(

          `
          SELECT
            id,
            name,
            phone,
            email,
            password
          FROM customers
          WHERE phone = ?
          OR email = ?
          LIMIT 1
          `,

          [
            login,
            login.toLowerCase()
          ]

        );


      if (!rows.length) {

        return res.status(401).json({

          success: false,

          message:
            "Invalid login details."

        });

      }


      const customer =
        rows[0];


      const passwordHash =
        customer.password;


      const isValid =
        await new Promise(
          (resolve, reject) => {

            try {

              const parts =
                passwordHash.split(":");


              if (
                parts.length !== 2
              ) {

                return resolve(false);

              }


              const salt =
                Buffer.from(
                  parts[0],
                  "hex"
                );


              const storedHash =
                Buffer.from(
                  parts[1],
                  "hex"
                );


              crypto.scrypt(

                password,

                salt,

                storedHash.length,

                (
                  error,
                  derivedKey
                ) => {

                  if (error) {

                    return reject(
                      error
                    );

                  }


                  resolve(

                    crypto.timingSafeEqual(

                      storedHash,

                      derivedKey

                    )

                  );

                }

              );


            } catch (error) {

              reject(error);

            }

          }
        );


      if (!isValid) {

        return res.status(401).json({

          success: false,

          message:
            "Invalid login details."

        });

      }


      const token =
        createCustomerToken(
          customer
        );


      res.setHeader(

        "Set-Cookie",

        `customer_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Max-Age=3600; Path=/`

      );


      res.json({

        success: true,

        message:
          "Login successful.",

        customer: {

          id:
            customer.id,

          name:
            customer.name,

          phone:
            customer.phone,

          email:
            customer.email

        }

      });


    } catch (error) {

      console.error(
        "CUSTOMER LOGIN ERROR:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to login."

      });

    }

  }
);


/* =========================================================
   CUSTOMER SESSION CHECK
   ========================================================= */

app.get(
  "/api/customer/check",
  requireCustomer,
  (req, res) => {

    res.json({

      success: true,

      loggedIn: true,

      customer: {

        id:
          req.customer.id,

        name:
          req.customer.name,

        phone:
          req.customer.phone,

        email:
          req.customer.email

      }

    });

  }
);


/* =========================================================
   CUSTOMER LOGOUT
   ========================================================= */

app.post(
  "/api/customer/logout",
  (req, res) => {

    try {

      res.setHeader(

        "Set-Cookie",

        "customer_session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/"

      );


      res.json({

        success: true,

        message:
          "Logged out successfully."

      });


    } catch (error) {

      console.error(
        "CUSTOMER LOGOUT ERROR:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to logout."

      });

    }

  }
);


/* =========================================================
   CUSTOMER MENU
   ========================================================= */

app.get(
  "/api/menu",
  async (req, res) => {

    try {

      const [rows] =
        await db.query(`

          SELECT

            id AS food_id,

            name,

            description,

            category AS meal_type,

            price,

            menu_date,

            is_available AS available

          FROM food_items

          WHERE menu_date = CURDATE()

          AND is_available = TRUE

          ORDER BY

            CASE category

              WHEN 'Breakfast'
              THEN 1

              WHEN 'Lunch'
              THEN 2

              WHEN 'Dinner'
              THEN 3

              WHEN 'Tea & Snacks'
              THEN 4

              ELSE 5

            END,

            name

        `);


      res.json(rows);


    } catch (error) {

      console.error(
        "MENU ERROR:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to load today's menu."

      });

    }

  }
);


/* =========================================================
   PLACE CUSTOMER ORDER
   ========================================================= */

app.post(
  "/api/orders",
  async (req, res) => {

    const connection =
      await db.getConnection();


    try {

      const customerName =
        String(
          req.body.customer_name || ""
        ).trim();


      const phone =
        String(
          req.body.phone || ""
        ).trim();


      const orderType =
        String(
          req.body.order_type || ""
        ).trim();


      const arrivalTime =
        String(
          req.body.arrival_time || ""
        ).trim();


      const paymentMethod =
        String(
          req.body.payment_method ||
          "Cash Payment"
        ).trim();


      const items =
        Array.isArray(req.body.items)
          ? req.body.items
          : [];


      if (!customerName) {

        return res.status(400).json({

          success: false,

          message:
            "Customer name is required."

        });

      }


      if (
        !/^\d{10}$/.test(phone)
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Please enter a valid 10-digit phone number."

        });

      }


      if (
        orderType !== "Dine-in" &&
        orderType !== "Parcel"
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Please select Dine-in or Parcel."

        });

      }


      if (!arrivalTime) {

        return res.status(400).json({

          success: false,

          message:
            "Expected arrival time is required."

        });

      }


      if (
        !/^\d{2}:\d{2}$/.test(
          arrivalTime
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid arrival time."

        });

      }


      if (!items.length) {

        return res.status(400).json({

          success: false,

          message:
            "Your cart is empty."

        });

      }


      await connection.beginTransaction();


      let totalAmount = 0;
      const PARCEL_CHARGE = 5;

      const verifiedItems = [];


      for (const item of items) {

        const foodId =
          Number(item.food_id);


        const quantity =
          Number(item.qty);


        if (

          !Number.isInteger(foodId) ||

          !Number.isInteger(quantity) ||

          quantity < 1 ||

          quantity > 50

        ) {

          await connection.rollback();


          return res.status(400).json({

            success: false,

            message:
              "Invalid food item or quantity."

          });

        }


        const [foodRows] =
          await connection.query(

            `
            SELECT
              id,
              name,
              price
            FROM food_items
            WHERE id = ?
            AND menu_date = CURDATE()
            AND is_available = TRUE
            `,

            [foodId]

          );


        if (!foodRows.length) {

          await connection.rollback();


          return res.status(400).json({

            success: false,

            message:
              "One or more selected food items are unavailable."

          });

        }


        const food =
          foodRows[0];


        const itemTotal =
          Number(food.price) *
          quantity;


        totalAmount +=
          itemTotal;


        verifiedItems.push({

          food_id:
            food.id,

          name:
            food.name,

          price:
            Number(food.price),

          quantity

        });

      }


      /*
         Parcel charge is currently NOT added here.
         It can be added later without changing
         the customer account system.
      */
     // Add ₹5 Parcel charge
if (orderType === "Parcel") {
  totalAmount += 5;
}


      const [orderResult] =
        await connection.query(

          `
          INSERT INTO orders
          (
            customer_name,
            phone,
            total_amount,
            status,
            order_type,
            arrival_time
          )
          VALUES (?, ?, ?, 'New', ?, ?)
          `,

          [

            customerName,

            phone,

            totalAmount.toFixed(2),

            orderType,

            arrivalTime

          ]

        );


      const orderId =
        orderResult.insertId;


      for (
        const item of verifiedItems
      ) {

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


      res.status(201).json({

        success: true,

        message:
          "Order placed successfully.",

        order_id:
          orderId,

        customer_name:
          customerName,

        phone,

        order_type:
          orderType,

        arrival_time:
          arrivalTime,

        payment_method:
          paymentMethod,

        total_amount:
          Number(
            totalAmount.toFixed(2)
          ),

        status:
          "New"

      });


    } catch (error) {

      await connection.rollback();


      console.error(
        "PLACE ORDER ERROR:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to place your order."

      });


    } finally {

      connection.release();

    }

  }
);


/* =========================================================
   TRACK SINGLE ORDER
   ========================================================= */

app.get(
  "/api/orders/:id",
  async (req, res) => {

    try {

      const orderId =
        Number(
          req.params.id
        );


      if (
        !Number.isInteger(orderId)
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid order number."

        });

      }


      const [orders] =
        await db.query(

          `
          SELECT

            id AS order_id,

            customer_name,

            phone,

            total_amount,

            status,

            order_type,

            arrival_time,

            created_at

          FROM orders

          WHERE id = ?

          `,

          [orderId]

        );


      if (!orders.length) {

        return res.status(404).json({

          success: false,

          message:
            "Order not found."

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


      order.items =
        items;


      res.json({

        success: true,

        order

      });


    } catch (error) {

      console.error(
        "TRACK ORDER ERROR:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to load order."

      });

    }

  }
);


/* =========================================================
   LOGGED-IN CUSTOMER MY ORDERS
   ========================================================= */

app.get(
  "/api/customer/my-orders",
  requireCustomer,
  async (req, res) => {

    try {

      const phone =
        req.customer.phone;


      const [orders] =
        await db.query(

          `
          SELECT

            id AS order_id,

            customer_name,

            phone,

            total_amount,

            status,

            order_type,

            arrival_time,

            created_at

          FROM orders

          WHERE phone = ?

          ORDER BY created_at DESC

          `,

          [phone]

        );


      for (
        const order of orders
      ) {

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


        order.items =
          items;

      }


      res.json({

        success: true,

        total_orders:
          orders.length,

        orders

      });


    } catch (error) {

      console.error(
        "CUSTOMER MY ORDERS ERROR:",
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


/* =========================================================
   OLD MY ORDERS BY PHONE
   ========================================================= */

app.get(
  "/api/my-orders/:phone",
  async (req, res) => {

    try {

      const phone =
        String(
          req.params.phone || ""
        ).trim();


      if (
        !/^\d{10}$/.test(phone)
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Please enter a valid 10-digit phone number."

        });

      }


      const [orders] =
        await db.query(

          `
          SELECT

            id AS order_id,

            customer_name,

            phone,

            total_amount,

            status,

            order_type,

            arrival_time,

            created_at

          FROM orders

          WHERE phone = ?

          ORDER BY created_at DESC

          `,

          [phone]

        );


      for (
        const order of orders
      ) {

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


        order.items =
          items;

      }


      res.json({

        success: true,

        phone,

        total_orders:
          orders.length,

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


/* =========================================================
   ADMIN - GET ALL ORDERS
   ========================================================= */

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

            total_amount,

            status,

            order_type,

            arrival_time,

            created_at

          FROM orders

          ORDER BY created_at DESC

        `);


      for (
        const order of orders
      ) {

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


        order.items =
          items;

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
          "Unable to load customer orders."

      });

    }

  }
);


/* =========================================================
   ADMIN - UPDATE ORDER STATUS
   ========================================================= */

app.patch(
  "/api/admin/orders/:id/status",
  requireAdmin,
  async (req, res) => {

    try {

      const orderId =
        Number(
          req.params.id
        );


      const status =
        String(
          req.body.status || ""
        ).trim();


      const allowedStatuses = [

        "New",

        "Accepted",

        "Preparing",

        "Ready",

        "Completed",

        "Cancelled"

      ];


      if (
        !Number.isInteger(orderId)
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid order number."

        });

      }


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
          "Order status updated successfully.",

        order_id:
          orderId,

        status

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
/* =========================================================
   ADMIN - WALK-IN / DIRECT SHOP SALE
   ========================================================= */

app.post(
  "/api/admin/walk-in-sale",
  requireAdmin,
  async (req, res) => {

    try {

      const foodId =
        Number(req.body.food_id);

      const quantity =
        Number(req.body.quantity);

      const orderType =
        String(req.body.order_type || "").trim();


      // Validate food
      if (
        !Number.isInteger(foodId) ||
        foodId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Please select a food item."
        });
      }


      // Validate quantity
      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid quantity."
        });
      }


      // Validate order type
      if (
        !["Dine-in", "Parcel"].includes(orderType)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid order type."
        });
      }


      // Get today's food item
      const [foodRows] =
        await db.query(
          `
          SELECT
            id,
            name,
            price
          FROM food_items
          WHERE id = ?
          AND menu_date = CURDATE()
          AND is_available = TRUE
          `,
          [foodId]
        );


      if (!foodRows.length) {

        return res.status(404).json({
          success: false,
          message:
            "Food item is unavailable today."
        });

      }


      const food = foodRows[0];


      // Calculate food amount
      const foodTotal =
        Number(food.price) * quantity;


      // ₹5 Parcel charge
      const parcelCharge =
        orderType === "Parcel"
          ? 5
          : 0;


      const totalAmount =
        foodTotal + parcelCharge;


      // Save walk-in sale
      await db.query(
        `
        INSERT INTO walk_in_sales
        (
          food_id,
          food_name,
          quantity,
          unit_price,
          total_amount,
          order_type
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          food.id,
          food.name,
          quantity,
          food.price,
          totalAmount.toFixed(2),
          orderType
        ]
      );


      res.json({
        success: true,

        message:
          "Walk-in sale recorded successfully.",

        food_name:
          food.name,

        quantity,

        order_type:
          orderType,

        total_amount:
          totalAmount
      });


    } catch (error) {

      console.error(
        "WALK-IN SALE ERROR:",
        error
      );


      res.status(500).json({
        success: false,
        message:
          "Unable to record walk-in sale."
      });

    }

  }
);

/* =========================================================
   ADMIN - DAILY ANALYTICS
   ========================================================= */

app.get(
  "/api/admin/analytics",
  requireAdmin,
  async (req, res) => {

    try {

      const date =
        String(
          req.query.date || ""
        ).trim();


      const selectedDate =
        /^\d{4}-\d{2}-\d{2}$/.test(date)

          ? date

          : new Date()
              .toISOString()
              .slice(0, 10);


      const [dateSummaryRows] =
        await db.query(

          `
          SELECT

            COUNT(*) AS totalOrders,

            COALESCE(
              SUM(total_amount),
              0
            ) AS totalSales

          FROM orders

          WHERE DATE(created_at) = ?

          AND status = 'Completed'

          `,

          [selectedDate]

        );


      const dateSummary =
        dateSummaryRows[0] || {

          totalOrders: 0,

          totalSales: 0

        };


      const [categoryRows] =
        await db.query(

          `
          SELECT

            CASE

              WHEN f.category =
                'Tea & Snacks'

              THEN 'Snacks'

              ELSE f.category

            END AS category,

            COALESCE(
              SUM(oi.quantity),
              0
            ) AS quantitySold,

            COALESCE(
              SUM(
                oi.quantity * oi.price
              ),
              0
            ) AS sales

          FROM order_items oi

          INNER JOIN orders o
            ON oi.order_id = o.id

          INNER JOIN food_items f
            ON oi.food_item_id = f.id

          WHERE DATE(o.created_at) = ?

          AND o.status = 'Completed'

          GROUP BY f.category

          ORDER BY

            CASE f.category

              WHEN 'Breakfast' THEN 1

              WHEN 'Tea & Snacks' THEN 2

              WHEN 'Lunch' THEN 3

              WHEN 'Dinner' THEN 4

              ELSE 5

            END

          `,

          [selectedDate]

        );


      const categoryMap = {

        Breakfast: {
          quantitySold: 0,
          sales: 0
        },

        Snacks: {
          quantitySold: 0,
          sales: 0
        },

        Lunch: {
          quantitySold: 0,
          sales: 0
        },

        Dinner: {
          quantitySold: 0,
          sales: 0
        }

      };


      categoryRows.forEach(
        row => {

          if (
            categoryMap[row.category]
          ) {

            categoryMap[
              row.category
            ] = {

              quantitySold:
                Number(
                  row.quantitySold || 0
                ),

              sales:
                Number(
                  row.sales || 0
                )

            };

          }

        }
      );


      const categories = [

        {
          category:
            "Breakfast",

          quantity:
            categoryMap.Breakfast
              .quantitySold,

          quantitySold:
            categoryMap.Breakfast
              .quantitySold,

          sales:
            categoryMap.Breakfast
              .sales

        },

        {
          category:
            "Snacks",

          quantity:
            categoryMap.Snacks
              .quantitySold,

          quantitySold:
            categoryMap.Snacks
              .quantitySold,

          sales:
            categoryMap.Snacks
              .sales

        },

        {
          category:
            "Lunch",

          quantity:
            categoryMap.Lunch
              .quantitySold,

          quantitySold:
            categoryMap.Lunch
              .quantitySold,

          sales:
            categoryMap.Lunch
              .sales

        },

        {
          category:
            "Dinner",

          quantity:
            categoryMap.Dinner
              .quantitySold,

          quantitySold:
            categoryMap.Dinner
              .quantitySold,

          sales:
            categoryMap.Dinner
              .sales

        }

      ];


      const [monthlyRows] =
        await db.query(`

          SELECT

            DATE_FORMAT(
              created_at,
              '%Y-%m'
            ) AS month,

            COUNT(*) AS totalOrders,

            COALESCE(
              SUM(total_amount),
              0
            ) AS totalSales

          FROM orders

          WHERE status = 'Completed'

          GROUP BY
            DATE_FORMAT(
              created_at,
              '%Y-%m'
            )

          ORDER BY month DESC

          LIMIT 12

        `);


      const [currentMonthRows] =
        await db.query(`

          SELECT

            COUNT(*) AS totalOrders,

            COALESCE(
              SUM(total_amount),
              0
            ) AS totalSales

          FROM orders

          WHERE status = 'Completed'

          AND YEAR(created_at) =
              YEAR(CURDATE())

          AND MONTH(created_at) =
              MONTH(CURDATE())

        `);


      const [dateOrders] =
        await db.query(

          `
          SELECT

            id AS order_id,

            customer_name,

            phone,

            total_amount,

            status,

            order_type,

            arrival_time,

            created_at

          FROM orders

          WHERE DATE(created_at) = ?

          ORDER BY created_at DESC

          `,

          [selectedDate]

        );


      res.json({

        success: true,

        date:
          selectedDate,

        dateSummary: {

          totalOrders:
            Number(
              dateSummary.totalOrders || 0
            ),

          totalSales:
            Number(
              dateSummary.totalSales || 0
            )

        },

        categories,

        categorySales:
          categories,

        breakfast:
          categories.find(
            item =>
              item.category ===
              "Breakfast"
          ) || {

            quantitySold: 0,

            sales: 0

          },

        monthly:
          monthlyRows.map(row => ({

            month:
              row.month,

            totalOrders:
              Number(
                row.totalOrders || 0
              ),

            totalSales:
              Number(
                row.totalSales || 0
              )

          })),

        currentMonthSales:
          Number(
            currentMonthRows[0]
              ?.totalSales || 0
          ),

        currentMonthOrders:
          Number(
            currentMonthRows[0]
              ?.totalOrders || 0
          ),

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
          "Unable to load analytics."

      });

    }

  }
);


/* =========================================================
   ADMIN - MONTHLY ANALYTICS
   ========================================================= */

app.get(
  "/api/admin/monthly-analytics",
  requireAdmin,
  async (req, res) => {

    try {

      const month =
        String(
          req.query.month || ""
        ).trim();


      if (
        !month ||
        !/^\d{4}-\d{2}$/.test(month)
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid month. Use YYYY-MM."

        });

      }


      const [summaryRows] =
        await db.query(

          `
          SELECT

            COUNT(*) AS totalOrders,

            COALESCE(
              SUM(total_amount),
              0
            ) AS totalSales

          FROM orders

          WHERE status = 'Completed'

          AND DATE_FORMAT(
            created_at,
            '%Y-%m'
          ) = ?

          `,

          [month]

        );


      const summary =
        summaryRows[0] || {

          totalOrders: 0,

          totalSales: 0

        };


      const [categoryRows] =
        await db.query(

          `
          SELECT

            CASE

              WHEN f.category =
                'Tea & Snacks'

              THEN 'Snacks'

              ELSE f.category

            END AS category,

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

          FROM orders o

          INNER JOIN order_items oi
            ON oi.order_id = o.id

          INNER JOIN food_items f
            ON f.id = oi.food_item_id

          WHERE o.status = 'Completed'

          AND DATE_FORMAT(
            o.created_at,
            '%Y-%m'
          ) = ?

          GROUP BY f.category

          ORDER BY

            CASE f.category

              WHEN 'Breakfast' THEN 1

              WHEN 'Tea & Snacks' THEN 2

              WHEN 'Lunch' THEN 3

              WHEN 'Dinner' THEN 4

              ELSE 5

            END

          `,

          [month]

        );


      const categoryMap = {

        Breakfast: {
          quantity: 0,
          sales: 0
        },

        Snacks: {
          quantity: 0,
          sales: 0
        },

        Lunch: {
          quantity: 0,
          sales: 0
        },

        Dinner: {
          quantity: 0,
          sales: 0
        }

      };


      categoryRows.forEach(
        row => {

          if (
            categoryMap[row.category]
          ) {

            categoryMap[
              row.category
            ] = {

              quantity:
                Number(
                  row.quantity || 0
                ),

              sales:
                Number(
                  row.sales || 0
                )

            };

          }

        }
      );


      res.json({

        success: true,

        month,

        totalOrders:
          Number(
            summary.totalOrders || 0
          ),

        totalSales:
          Number(
            summary.totalSales || 0
          ),

        categories:
          categoryMap,

        categorySales: [

          {
            category:
              "Breakfast",

            quantity:
              categoryMap.Breakfast
                .quantity,

            sales:
              categoryMap.Breakfast
                .sales

          },

          {
            category:
              "Snacks",

            quantity:
              categoryMap.Snacks
                .quantity,

            sales:
              categoryMap.Snacks
                .sales

          },

          {
            category:
              "Lunch",

            quantity:
              categoryMap.Lunch
                .quantity,

            sales:
              categoryMap.Lunch
                .sales

          },

          {
            category:
              "Dinner",

            quantity:
              categoryMap.Dinner
                .quantity,

            sales:
              categoryMap.Dinner
                .sales

          }

        ]

      });


    } catch (error) {

      console.error(
        "MONTHLY ANALYTICS ERROR:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to load monthly analytics.",

        error:
          error.message

      });

    }

  }
);


/* =========================================================
   ADMIN - ADD MENU ITEM
   ========================================================= */

app.post(
  "/api/admin/menu",
  requireAdmin,
  async (req, res) => {

    try {

      const menuDate =
        String(
          req.body.menu_date || ""
        ).trim();


      const category =
        String(
          req.body.meal_type ||
          req.body.category ||
          ""
        ).trim();


      const name =
        String(
          req.body.name || ""
        ).trim();


      const description =
        String(
          req.body.description || ""
        ).trim();


      const price =
        Number(
          req.body.price
        );


      const allowedCategories = [

        "Breakfast",

        "Lunch",

        "Dinner",

        "Tea & Snacks"

      ];


      if (
        !menuDate ||
        !name
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Menu date and food name are required."

        });

      }


      if (
        !allowedCategories.includes(
          category
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid meal category."

        });

      }


      if (
        !Number.isFinite(price) ||
        price <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Please enter a valid price."

        });

      }


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
        VALUES (?, ?, ?, ?, ?, TRUE)
        `,

        [

          name,

          description,

          category,

          price,

          menuDate

        ]

      );


      res.status(201).json({

        success: true,

        message:
          "Menu item added successfully."

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


/* =========================================================
   ADMIN - GET ALL MENU ITEMS
   ========================================================= */

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

            category AS meal_type,

            price,

            menu_date,

            is_available AS available

          FROM food_items

          ORDER BY

            menu_date DESC,

            CASE category

              WHEN 'Breakfast' THEN 1

              WHEN 'Lunch' THEN 2

              WHEN 'Dinner' THEN 3

              WHEN 'Tea & Snacks' THEN 4

              ELSE 5

            END,

            name

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
          "Unable to load menu."

      });

    }

  }
);


/* =========================================================
   ADMIN - EDIT MENU ITEM
   ========================================================= */

app.put(
  "/api/admin/menu/:id",
  requireAdmin,
  async (req, res) => {

    try {

      const foodId =
        Number(
          req.params.id
        );


      const name =
        String(
          req.body.name || ""
        ).trim();


      const description =
        String(
          req.body.description || ""
        ).trim();


      const category =
        String(
          req.body.category ||
          req.body.meal_type ||
          ""
        ).trim();


      const price =
        Number(
          req.body.price
        );


      const menuDate =
        String(
          req.body.menu_date || ""
        ).trim();


      const allowedCategories = [

        "Breakfast",

        "Lunch",

        "Dinner",

        "Tea & Snacks"

      ];


      if (
        !Number.isInteger(foodId)
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid food item."

        });

      }


      if (
        !name ||
        !menuDate
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Food name and menu date are required."

        });

      }


      if (
        !allowedCategories.includes(
          category
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid meal category."

        });

      }


      if (
        !Number.isFinite(price) ||
        price <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid price."

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

            description,

            category,

            price,

            menuDate,

            foodId

          ]

        );


      if (
        result.affectedRows === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            "Menu item not found."

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


/* =========================================================
   ADMIN - DELETE MENU ITEM
   ========================================================= */

app.delete(
  "/api/admin/menu/:id",
  requireAdmin,
  async (req, res) => {

    try {

      const foodId =
        Number(
          req.params.id
        );


      if (
        !Number.isInteger(foodId)
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid food item."

        });

      }


      try {

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
              "Menu item not found."

          });

        }


        return res.json({

          success: true,

          message:
            "Menu item deleted successfully."

        });


      } catch (deleteError) {

        if (
          deleteError.code ===
          "ER_ROW_IS_REFERENCED_2"
        ) {

          await db.query(

            `
            UPDATE food_items

            SET is_available = FALSE

            WHERE id = ?

            `,

            [foodId]

          );


          return res.json({

            success: true,

            message:
              "This item has existing orders, so it was marked unavailable instead of deleted."

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


/* =========================================================
   ADMIN - UPDATE MENU AVAILABILITY
   ========================================================= */

app.patch(
  "/api/admin/menu/:id/availability",
  requireAdmin,
  async (req, res) => {

    try {

      const foodId =
        Number(
          req.params.id
        );


      const available =
        Boolean(
          req.body.available
        );


      if (
        !Number.isInteger(foodId)
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid food item."

        });

      }


      const [result] =
        await db.query(

          `
          UPDATE food_items

          SET is_available = ?

          WHERE id = ?

          `,

          [

            available ? 1 : 0,

            foodId

          ]

        );


      if (
        result.affectedRows === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            "Menu item not found."

        });

      }


      res.json({

        success: true,

        message:

          available

            ? "Menu item is now available."

            : "Menu item is now unavailable."

      });


    } catch (error) {

      console.error(
        "AVAILABILITY ERROR:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to update menu availability."

      });

    }

  }
);


/* =========================================================
   SERVE FRONTEND
   ========================================================= */

app.use(

  express.static(

    path.join(
      __dirname,
      "public"
    )

  )

);


/* =========================================================
   DEFAULT PAGE
   ========================================================= */

app.get(
  "/",
  (req, res) => {

    res.sendFile(

      path.join(

        __dirname,

        "public",

        "index.html"

      )

    );

  }
);


/* =========================================================
   404 API HANDLER
   ========================================================= */

app.use(
  "/api",
  (req, res) => {

    res.status(404).json({

      success: false,

      message:
        "API endpoint not found."

    });

  }
);
/* =========================================================
   ADMIN - WALK-IN / DIRECT SHOP SALE
   ========================================================= */

app.post(
  "/api/admin/walk-in-sale",
  requireAdmin,
  async (req, res) => {

    try {

      const foodId = Number(req.body.food_id);
      const quantity = Number(req.body.quantity);
      const orderType =
        String(req.body.order_type || "").trim();

      if (!Number.isInteger(foodId) || foodId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Please select a food item."
        });
      }

      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid quantity."
        });
      }

      if (!["Dine-in", "Parcel"].includes(orderType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order type."
        });
      }

      const [foodRows] = await db.query(
        `
        SELECT
          id,
          name,
          price
        FROM food_items
        WHERE id = ?
        AND menu_date = CURDATE()
        AND is_available = TRUE
        `,
        [foodId]
      );

      if (!foodRows.length) {
        return res.status(404).json({
          success: false,
          message: "Food item is unavailable today."
        });
      }

      const food = foodRows[0];

      const foodTotal =
        Number(food.price) * quantity;

      const parcelCharge =
        orderType === "Parcel" ? 5 : 0;

      const totalAmount =
        foodTotal + parcelCharge;

      await db.query(
        `
        INSERT INTO walk_in_sales
        (
          food_id,
          food_name,
          quantity,
          unit_price,
          total_amount,
          order_type
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          food.id,
          food.name,
          quantity,
          food.price,
          totalAmount.toFixed(2),
          orderType
        ]
      );

      res.json({
        success: true,
        message: "Walk-in sale recorded successfully.",
        food_name: food.name,
        quantity,
        order_type: orderType,
        total_amount: totalAmount
      });

    } catch (error) {

      console.error(
        "WALK-IN SALE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Unable to record walk-in sale."
      });

    }
  }
);

/* =========================================================
   START SERVER
   ========================================================= */

app.listen(
  PORT,
  () => {

    console.log(

      `Thulir Unavagam server running at http://localhost:${PORT}`

    );

  }
);