const cart = JSON.parse(localStorage.getItem("thulirCart") || "[]");

const form = document.getElementById("checkoutForm");
const summary = document.getElementById("checkoutSummary");
const message = document.getElementById("checkoutMessage");


// ===============================
// SHOW CART SUMMARY
// ===============================
function showCartSummary() {

  if (cart.length === 0) {
    summary.innerHTML = `
      <div class="checkout-summary">
        <h3>Your Cart</h3>
        <p>Your cart is empty.</p>
        <a href="index.html">Go back to menu</a>
      </div>
    `;
    return;
  }

  let total = 0;

  let html = `
    <div class="checkout-summary">
      <h3>Order Summary</h3>
  `;

  cart.forEach(item => {

    const name =
      item.name ||
      item.food_name ||
      "Food Item";

    const price =
      Number(item.price || item.unit_price || 0);

    const quantity =
      Number(item.quantity || item.qty || 1);

    const itemTotal = price * quantity;

    total += itemTotal;

    html += `
      <div class="checkout-summary-row">
        <span>${escapeHtml(name)} × ${quantity}</span>
        <strong>₹${itemTotal.toFixed(2)}</strong>
      </div>
    `;
  });

  html += `
      <div class="checkout-total">
        <span>Total Amount</span>
        <strong>₹${total.toFixed(2)}</strong>
      </div>

      <div class="payment-summary">
        <span>Payment Method</span>
        <strong>💵 Cash on Delivery</strong>
      </div>

    </div>
  `;

  summary.innerHTML = html;
}

showCartSummary();


// ===============================
// PLACE ORDER
// ===============================
form.addEventListener("submit", async function (event) {

  event.preventDefault();

  if (cart.length === 0) {
    message.textContent = "❌ Your cart is empty.";
    return;
  }

  const customerName =
    document.getElementById("customerName").value.trim();

  const phone =
    document.getElementById("phone").value.trim();

  const address =
    document.getElementById("address").value.trim();


  // Phone validation
  if (!/^[0-9]{10}$/.test(phone)) {

    message.textContent =
      "❌ Please enter a valid 10-digit phone number.";

    return;
  }


  // Required fields
  if (!customerName || !address) {

    message.textContent =
      "❌ Please fill in all required details.";

    return;
  }


  // Convert cart items
  const items = cart.map(item => {

    return {
      food_id: Number(
        item.food_id || item.id
      ),

      quantity: Number(
        item.quantity || item.qty || 1
      )
    };

  });


  // Check invalid food ID
  const invalidItem = items.find(
    item => !item.food_id || item.food_id <= 0
  );

  if (invalidItem) {

    message.textContent =
      "❌ Invalid food item in cart.";

    return;
  }


  try {

    message.textContent =
      "⏳ Placing your order...";


    const response = await fetch("/api/orders", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({

        customer_name: customerName,

        phone: phone,

        address: address,

        payment_method: "Cash on Delivery",

        items: items

      })

    });


    const data = await response.json();


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Unable to place your order."
      );

    }


    // ===============================
    // ORDER SUCCESS
    // ===============================

    const orderId = data.order_id;


    // Calculate total
    let totalAmount = 0;

    cart.forEach(item => {

      const price =
        Number(item.price || item.unit_price || 0);

      const quantity =
        Number(item.quantity || item.qty || 1);

      totalAmount += price * quantity;

    });


    // Create receipt items
    let receiptItems = "";

    cart.forEach(item => {

      const name =
        item.name ||
        item.food_name ||
        "Food Item";

      const price =
        Number(item.price || item.unit_price || 0);

      const quantity =
        Number(item.quantity || item.qty || 1);

      const itemTotal =
        price * quantity;

      receiptItems += `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td>${quantity}</td>
          <td>₹${price.toFixed(2)}</td>
          <td>₹${itemTotal.toFixed(2)}</td>
        </tr>
      `;
    });


    // Clear cart
    localStorage.removeItem("thulirCart");


    // ===============================
    // SHOW CONFIRMATION + RECEIPT
    // ===============================

    document.body.innerHTML = `

      <header class="navbar">

        <div class="brand">

          <img
            src="assets/logo.jpeg"
            alt="Thulir Unavagam Logo"
          >

          <div>

            <h1>Thulir Unavagam</h1>

            <p>Fresh food, every day</p>

          </div>

        </div>

        <div class="nav-actions">

          <a href="index.html">
            Menu
          </a>

        </div>

      </header>


      <main>

        <section class="menu-section">

          <div
            class="checkout-box"
            style="
              max-width:750px;
              margin:40px auto;
              text-align:center;
            "
          >

            <div
              style="
                font-size:65px;
                margin-bottom:10px;
              "
            >
              ✅
            </div>


            <p class="eyebrow">
              ORDER CONFIRMED
            </p>


            <h2>
              Order Placed Successfully!
            </h2>


            <p>
              Thank you for ordering from
              <strong>Thulir Unavagam</strong>.
            </p>


            <!-- RECEIPT -->

            <div
              id="receipt"
              style="
                background:#ffffff;
                border:1px solid #ddd;
                border-radius:14px;
                padding:25px;
                margin:30px 0;
                text-align:left;
                box-shadow:0 8px 25px rgba(0,0,0,0.06);
              "
            >

              <div
                style="
                  text-align:center;
                  border-bottom:1px solid #ddd;
                  padding-bottom:18px;
                  margin-bottom:20px;
                "
              >

                <h2 style="margin:0;">
                  🍽️ Thulir Unavagam
                </h2>

                <p style="margin:5px 0;">
                  Fresh food, every day
                </p>

                <h3 style="margin:12px 0 0;">
                  ORDER RECEIPT
                </h3>

              </div>


              <div
                style="
                  display:grid;
                  grid-template-columns:1fr 1fr;
                  gap:10px;
                  margin-bottom:20px;
                "
              >

                <p>
                  <strong>Order Number:</strong><br>
                  #${orderId}
                </p>

                <p>
                  <strong>Customer:</strong><br>
                  ${escapeHtml(customerName)}
                </p>

                <p>
                  <strong>Phone:</strong><br>
                  ${escapeHtml(phone)}
                </p>

                <p>
                  <strong>Payment:</strong><br>
                  💵 Cash on Delivery
                </p>

                <p style="grid-column:1 / -1;">
                  <strong>Delivery Address:</strong><br>
                  ${escapeHtml(address)}
                </p>

              </div>


              <div style="overflow-x:auto;">

                <table
                  style="
                    width:100%;
                    border-collapse:collapse;
                    margin-top:15px;
                  "
                >

                  <thead>

                    <tr style="background:#f5f5f5;">

                      <th
                        style="
                          padding:10px;
                          border-bottom:1px solid #ddd;
                          text-align:left;
                        "
                      >
                        Item
                      </th>

                      <th
                        style="
                          padding:10px;
                          border-bottom:1px solid #ddd;
                          text-align:center;
                        "
                      >
                        Qty
                      </th>

                      <th
                        style="
                          padding:10px;
                          border-bottom:1px solid #ddd;
                          text-align:right;
                        "
                      >
                        Price
                      </th>

                      <th
                        style="
                          padding:10px;
                          border-bottom:1px solid #ddd;
                          text-align:right;
                        "
                      >
                        Total
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    ${receiptItems}

                  </tbody>

                </table>

              </div>


              <div
                style="
                  border-top:2px solid #222;
                  margin-top:20px;
                  padding-top:15px;
                  display:flex;
                  justify-content:space-between;
                  font-size:20px;
                  font-weight:bold;
                "
              >

                <span>
                  Total Amount
                </span>

                <span>
                  ₹${totalAmount.toFixed(2)}
                </span>

              </div>


              <div
                style="
                  margin-top:20px;
                  padding:12px;
                  background:#fff3cd;
                  color:#856404;
                  border-radius:8px;
                  text-align:center;
                  font-weight:600;
                "
              >

                💵 Payment will be collected through
                Cash on Delivery.

              </div>

            </div>


            <!-- PRINT BUTTON -->

            <button
              class="checkout-btn"
              onclick="printReceipt()"
              style="margin-bottom:15px;"
            >
              🖨️ Print Receipt
            </button>


            <!-- TRACKING -->

            <h3>
              📦 Order Tracking
            </h3>


            <div
              id="orderTracking"
              style="
                margin:20px 0;
              "
            >

              <div
                style="
                  padding:15px;
                  border-radius:10px;
                  background:#fff3cd;
                  color:#856404;
                "
              >

                🆕 Order Status:
                <strong>New</strong>

              </div>

            </div>


            <div
              style="
                display:flex;
                gap:12px;
                justify-content:center;
                flex-wrap:wrap;
                margin-top:25px;
              "
            >

              <button
                class="checkout-btn"
                onclick="window.location.href='index.html'"
              >
                🍽️ Back to Menu
              </button>

              <button
                class="checkout-btn"
                onclick="window.location.href='order.html'"
              >
                📦 My Orders
              </button>

            </div>


            <p
              style="
                margin-top:20px;
                font-size:14px;
                color:#666;
              "
            >
              Order status updates automatically.
            </p>

          </div>

        </section>

      </main>


      <footer>

        <strong>
          Thulir Unavagam
        </strong>

        <p>
          Fresh food, every day.
        </p>

        <p>
          © 2026 Thulir Unavagam.
          All rights reserved.
        </p>

      </footer>

    `;


    // Start automatic tracking
    startOrderTracking(orderId);

  } catch (error) {

    console.error(error);

    message.textContent =
      "❌ " + error.message;

  }

});


// ===============================
// ORDER TRACKING
// ===============================
function startOrderTracking(orderId) {

  async function updateTracking() {

    try {

      const response =
        await fetch(`/api/orders/${orderId}`);

      const order =
        await response.json();


      if (!response.ok) {
        return;
      }


      const tracking =
        document.getElementById("orderTracking");


      if (!tracking) {
        return;
      }


      const status =
        order.status || "New";


      const statusSteps = [

        "New",

        "Accepted",

        "Preparing",

        "Ready",

        "Out for Delivery",

        "Delivered"

      ];


      let html = "";


      if (status === "Cancelled") {

        html = `

          <div
            style="
              padding:18px;
              border-radius:10px;
              background:#f8d7da;
              color:#842029;
              font-weight:600;
            "
          >

            ❌ Order Cancelled

          </div>

        `;

      } else {

        const currentIndex =
          statusSteps.indexOf(status);

        statusSteps.forEach((step, index) => {

          let background = "#eeeeee";
          let textColor = "#777";

          if (index <= currentIndex) {

            background = "#198754";
            textColor = "#ffffff";

          }

          html += `

            <div
              style="
                display:flex;
                align-items:center;
                gap:10px;
                margin:8px 0;
                padding:10px;
                border-radius:8px;
                background:${background};
                color:${textColor};
                font-weight:600;
              "
            >

              <span>
                ${index <= currentIndex ? "✓" : "○"}
              </span>

              <span>
                ${step}
              </span>

            </div>

          `;

        });

      }


      tracking.innerHTML = html;

    } catch (error) {

      console.error(
        "Tracking error:",
        error
      );

    }

  }


  updateTracking();


  setInterval(
    updateTracking,
    5000
  );

}


// ===============================
// PRINT RECEIPT
// ===============================
function printReceipt() {

  const receipt =
    document.getElementById("receipt");

  if (!receipt) {
    return;
  }

  const printWindow =
    window.open(
      "",
      "_blank",
      "width=800,height=900"
    );

  if (!printWindow) {

    alert(
      "Please allow pop-ups to print the receipt."
    );

    return;
  }


  printWindow.document.write(`

    <!DOCTYPE html>

    <html>

    <head>

      <title>
        Thulir Unavagam - Order Receipt
      </title>

      <style>

        body {
          font-family: Arial, sans-serif;
          padding: 30px;
          color: #222;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          padding: 10px;
          border-bottom: 1px solid #ddd;
        }

        th {
          background: #f5f5f5;
        }

        @media print {

          body {
            padding: 10px;
          }

        }

      </style>

    </head>

    <body>

      ${receipt.innerHTML}

    </body>

    </html>

  `);

  printWindow.document.close();

  printWindow.focus();

  setTimeout(() => {

    printWindow.print();

  }, 300);

}


// ===============================
// ESCAPE HTML
// ===============================
function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}