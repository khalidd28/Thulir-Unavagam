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
        <span>${name} × ${quantity}</span>
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


    // Send order to backend
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


    // Clear cart
    localStorage.removeItem("thulirCart");


    // Calculate total
    let totalAmount = 0;

    cart.forEach(item => {

      const price =
        Number(item.price || item.unit_price || 0);

      const quantity =
        Number(item.quantity || item.qty || 1);

      totalAmount += price * quantity;

    });


    // Replace current page with confirmation
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
              max-width:650px;
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


            <div
              style="
                background:#f5f5f5;
                padding:20px;
                border-radius:10px;
                margin:25px 0;
                text-align:left;
              "
            >

              <p>
                <strong>Order Number:</strong>
                #${orderId}
              </p>

              <p>
                <strong>Customer:</strong>
                ${customerName}
              </p>

              <p>
                <strong>Phone:</strong>
                ${phone}
              </p>

              <p>
                <strong>Total Amount:</strong>
                ₹${totalAmount.toFixed(2)}
              </p>

              <p>
                <strong>Payment:</strong>
                💵 Cash on Delivery
              </p>

            </div>


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


      statusSteps.forEach((step, index) => {

        const currentIndex =
          statusSteps.indexOf(status);

        const stepIndex = index;


        let background =
          "#eeeeee";

        let textColor =
          "#777";


        if (stepIndex <= currentIndex) {

          background =
            "#198754";

          textColor =
            "#ffffff";

        }


        if (status === "Cancelled") {

          background =
            "#dc3545";

          textColor =
            "#ffffff";

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
              ${stepIndex <= currentIndex ? "✓" : "○"}
            </span>

            <span>
              ${step}
            </span>

          </div>

        `;

      });


      // Cancelled order
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

      }


      tracking.innerHTML = html;


    } catch (error) {

      console.error(
        "Tracking error:",
        error
      );

    }

  }


  // First update
  updateTracking();


  // Update every 5 seconds
  setInterval(
    updateTracking,
    5000
  );

}