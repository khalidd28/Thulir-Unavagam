let cart = JSON.parse(
  localStorage.getItem("thulirCart") || "[]"
);

// =====================================================
// LOAD CHECKOUT
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

  renderCheckoutSummary();

  setDefaultArrivalTime();


  // Update summary when Dine-in / Parcel changes
  document
    .querySelectorAll('input[name="order_type"]')
    .forEach(radio => {

      radio.addEventListener(
        "change",
        renderCheckoutSummary
      );

    });


  const form =
    document.getElementById("checkoutForm");

  if (form) {

    form.addEventListener(
      "submit",
      placeOrder
    );

  }

});
// =====================================================
// DEFAULT ARRIVAL TIME
// =====================================================

function setDefaultArrivalTime() {

  const timeInput =
    document.getElementById("arrivalTime");

  if (!timeInput) return;

  const now = new Date();

  let hours = now.getHours();
  let minutes = now.getMinutes();

  // Round to next 15 minutes
  minutes =
    Math.ceil(minutes / 15) * 15;

  if (minutes >= 60) {
    hours++;
    minutes = 0;
  }

  if (hours > 23) {
    hours = 23;
    minutes = 45;
  }

  const formattedHour =
    String(hours).padStart(2, "0");

  const formattedMinute =
    String(minutes).padStart(2, "0");

  timeInput.value =
    `${formattedHour}:${formattedMinute}`;
}


// =====================================================
// CHECKOUT SUMMARY
// =====================================================

function renderCheckoutSummary() {

  const summary =
    document.getElementById("checkoutSummary");

  if (!summary) return;


  if (!cart.length) {

    summary.innerHTML = `
      <div class="checkout-empty">

        <h3>Your cart is empty</h3>

        <p>
          Please add some food before placing an order.
        </p>

        <a
          href="index.html"
          class="checkout-btn"
        >
          🍽️ Browse Menu
        </a>

      </div>
    `;

    return;
  }


  let total = 0;


  cart.forEach(item => {

    const price = Number(item.price);
    const quantity = Number(item.qty);

    total += price * quantity;

  });


  const orderTypeElement =
    document.querySelector(
      'input[name="order_type"]:checked'
    );


  const orderType =
    orderTypeElement
      ? orderTypeElement.value
      : "";


  // Parcel charge = ₹5
  const parcelCharge =
    orderType === "Parcel"
      ? 5
      : 0;


  const grandTotal =
    total + parcelCharge;


  let html = `

    <div class="checkout-summary">

      <h3>Order Summary</h3>

      <div class="checkout-items">

  `;


  cart.forEach(item => {

    const price = Number(item.price);
    const quantity = Number(item.qty);

    const itemTotal =
      price * quantity;


    html += `

      <div class="checkout-item">

        <div>

          <strong>
            ${escapeHtml(item.name)}
          </strong>

          <span>
            ₹${price.toFixed(2)}
            × ${quantity}
          </span>

        </div>

        <strong>
          ₹${itemTotal.toFixed(2)}
        </strong>

      </div>

    `;

  });


  // Show Parcel Charge only for Parcel
  if (parcelCharge > 0) {

    html += `

      <div class="checkout-item">

        <div>
          <strong>
            Parcel Charge
          </strong>
        </div>

        <strong>
          ₹5.00
        </strong>

      </div>

    `;

  }


  html += `

      </div>

      <div class="checkout-total">

        <span>
          Total Amount
        </span>

        <strong>
          ₹${grandTotal.toFixed(2)}
        </strong>

      </div>

    </div>

  `;


  summary.innerHTML = html;

}

// =====================================================
// PLACE ORDER
// =====================================================

async function placeOrder(event) {

  event.preventDefault();


  const message =
    document.getElementById(
      "checkoutMessage"
    );


  const customerName =
    document
      .getElementById("customerName")
      .value
      .trim();


  const phone =
    document
      .getElementById("phone")
      .value
      .trim();


  const arrivalTime =
    document
      .getElementById("arrivalTime")
      .value;


  const orderTypeElement =
    document.querySelector(
      'input[name="order_type"]:checked'
    );


  const paymentElement =
    document.querySelector(
      'input[name="payment_method"]:checked'
    );


  const orderType =
    orderTypeElement
      ? orderTypeElement.value
      : "";


  const paymentMethod =
    paymentElement
      ? paymentElement.value
      : "Cash Payment";


  // ===================================================
  // VALIDATION
  // ===================================================

  if (!customerName) {

    showMessage(
      "Please enter your name.",
      "error"
    );

    return;
  }


  if (!/^\d{10}$/.test(phone)) {

    showMessage(
      "Please enter a valid 10-digit phone number.",
      "error"
    );

    return;
  }


  if (
    orderType !== "Dine-in" &&
    orderType !== "Parcel"
  ) {

    showMessage(
      "Please select Dine-in or Parcel.",
      "error"
    );

    return;
  }


  if (!arrivalTime) {

    showMessage(
      "Please select your expected arrival time.",
      "error"
    );

    return;
  }


  if (!cart.length) {

    showMessage(
      "Your cart is empty.",
      "error"
    );

    return;
  }


  // ===================================================
  // REFRESH SUMMARY
  // ===================================================

  renderCheckoutSummary();


  // ===================================================
  // PREPARE ITEMS
  // ===================================================

  const items = cart.map(item => ({

    food_id:
      Number(item.food_id),

    qty:
      Number(item.qty)

  }));


  // ===================================================
  // DISABLE BUTTON
  // ===================================================

  const button =
    document.querySelector(
      "#checkoutForm button[type='submit']"
    );


  if (button) {

    button.disabled = true;

    button.textContent =
      "⏳ Placing Order...";

  }


  showMessage(
    "Please wait...",
    "info"
  );


  // ===================================================
  // SEND ORDER TO SERVER
  // ===================================================

  try {

    const response =
      await fetch(
        "/api/orders",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            customer_name:
              customerName,

            phone:
              phone,

            order_type:
              orderType,

            arrival_time:
              arrivalTime,

            payment_method:
              paymentMethod,

            items:
              items

          })

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Unable to place order."
      );

    }


    // =================================================
    // SAVE ORDER
    // =================================================

    localStorage.removeItem(
      "thulirCart"
    );

    cart = [];


    // =================================================
    // SHOW CONFIRMATION
    // =================================================

    showOrderConfirmation(data);


  } catch (error) {

    console.error(
      "ORDER ERROR:",
      error
    );


    showMessage(
      error.message ||
      "Unable to place order.",
      "error"
    );


    if (button) {

      button.disabled = false;

      button.textContent =
        "🛒 Place Order";

    }

  }

}


// =====================================================
// ORDER CONFIRMATION
// =====================================================

function showOrderConfirmation(data) {

  const main =
    document.querySelector("main");


  const orderId =
    data.order_id;


  const total =
    Number(
      data.total_amount || 0
    );


  const orderType =
    data.order_type || "";


  const arrivalTime =
    data.arrival_time || "";


  const paymentMethod =
    data.payment_method ||
    "Cash Payment";


  main.innerHTML = `

    <section class="menu-section">

      <div class="section-heading">

        <p class="eyebrow">
          ORDER CONFIRMED
        </p>

        <h2>
          🎉 Your Order is Placed!
        </h2>

        <p>
          Thank you for ordering from
          Thulir Unavagam.
        </p>

      </div>


      <div class="checkout-box">

        <div class="order-confirmation">

          <div class="order-success-icon">
            ✓
          </div>


          <h3>
            Order #${orderId}
          </h3>


          <p>
            Your order has been received successfully.
          </p>


          <div class="confirmation-details">

            <div>

              <span>
                Customer
              </span>

              <strong>
                ${escapeHtml(
                  data.customer_name || ""
                )}
              </strong>

            </div>


            <div>

              <span>
                Phone
              </span>

              <strong>
                ${escapeHtml(
                  data.phone || ""
                )}
              </strong>

            </div>


            <div>

              <span>
                Order Type
              </span>

              <strong>
                ${escapeHtml(orderType)}
              </strong>

            </div>


            <div>

              <span>
                Expected Arrival
              </span>

              <strong>
                ${escapeHtml(arrivalTime)}
              </strong>

            </div>


            <div>

              <span>
                Payment
              </span>

              <strong>
                ${escapeHtml(paymentMethod)}
              </strong>

            </div>


            <div>

              <span>
                Total Amount
              </span>

              <strong>
                ₹${total.toFixed(2)}
              </strong>

            </div>

          </div>


          <div
            id="liveOrderTracking"
            class="live-tracking"
          >

            <h3>
              Order Status
            </h3>

            <p>
              Loading status...
            </p>

          </div>


          <div class="confirmation-actions">

            <button
              onclick="printReceipt()"
              class="checkout-btn"
            >
              🖨️ Print Receipt
            </button>


            <a
              href="order.html"
              class="checkout-btn"
            >
              📦 My Orders
            </a>


            <a
              href="index.html"
              class="checkout-btn"
            >
              🍽️ Back to Menu
            </a>

          </div>

        </div>

      </div>

    </section>

  `;


  window.currentOrder = {

    order_id:
      orderId,

    customer_name:
      data.customer_name || "",

    phone:
      data.phone || "",

    order_type:
      orderType,

    arrival_time:
      arrivalTime,

    payment_method:
      paymentMethod,

    total_amount:
      total

  };


  startOrderTracking(orderId);

}


// =====================================================
// TRACK ORDER
// =====================================================

let trackingInterval = null;


function startOrderTracking(orderId) {

  fetchOrderStatus(orderId);


  if (trackingInterval) {

    clearInterval(
      trackingInterval
    );

  }


  trackingInterval =
    setInterval(() => {

      fetchOrderStatus(orderId);

    }, 5000);

}


// =====================================================
// FETCH ORDER STATUS
// =====================================================

async function fetchOrderStatus(orderId) {

  try {

    const response =
      await fetch(
        `/api/orders/${orderId}`
      );


    if (!response.ok) {
      return;
    }


    const data =
      await response.json();


    if (!data.success) {
      return;
    }


    const order =
      data.order;


    const tracking =
      document.getElementById(
        "liveOrderTracking"
      );


    if (!tracking) {
      return;
    }


    const statuses = [

      "New",
      "Accepted",
      "Preparing",
      "Ready",
      "Completed"

    ];


    const currentIndex =
      statuses.indexOf(
        order.status
      );


    let trackerHTML = `

      <h3>
        Order Status
      </h3>

      <div class="status-tracker">

    `;


    statuses.forEach(
      (status, index) => {

        let className = "";


        if (index < currentIndex) {

          className =
            "completed";

        }


        if (index === currentIndex) {

          className =
            "active";

        }


        trackerHTML += `

          <div
            class="status-step ${className}"
          >

            <div class="status-circle">

              ${
                index < currentIndex
                  ? "✓"
                  : index + 1
              }

            </div>

            <span>
              ${status}
            </span>

          </div>

        `;

      }
    );


    trackerHTML += `

      </div>

      <p class="current-status">

        Current Status:

        <strong>
          ${escapeHtml(order.status)}
        </strong>

      </p>

    `;


    if (
      order.status === "Cancelled"
    ) {

      trackerHTML += `

        <div class="cancelled-message">

          ❌
          This order has been cancelled.

        </div>

      `;


      clearInterval(
        trackingInterval
      );

    }


    if (
      order.status === "Completed"
    ) {

      trackerHTML += `

        <div class="completed-message">

          🎉
          Your order is completed.

          Thank you for visiting
          Thulir Unavagam!

        </div>

      `;


      clearInterval(
        trackingInterval
      );

    }


    tracking.innerHTML =
      trackerHTML;


    // Update receipt data

    if (window.currentOrder) {

      window.currentOrder.status =
        order.status;

    }


  } catch (error) {

    console.error(
      "TRACKING ERROR:",
      error
    );

  }

}


// =====================================================
// PRINT RECEIPT
// =====================================================

function printReceipt() {

  const order =
    window.currentOrder;


  if (!order) {
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


  const receiptItems =
    order.items || [];


  let itemsHTML = "";


  receiptItems.forEach(item => {

    const price =
      Number(item.price || 0);

    const qty =
      Number(item.qty || 0);

    const total =
      price * qty;


    itemsHTML += `

      <tr>

        <td>
          ${escapeHtml(item.name)}
        </td>

        <td>
          ${qty}
        </td>

        <td>
          ₹${price.toFixed(2)}
        </td>

        <td>
          ₹${total.toFixed(2)}
        </td>

      </tr>

    `;

  });


  printWindow.document.write(`

    <!DOCTYPE html>

    <html>

    <head>

      <title>
        Thulir Unavagam Receipt
      </title>


      <style>

        body {

          font-family:
            Arial,
            sans-serif;

          padding: 30px;

          color: #222;

        }


        .receipt {

          max-width: 700px;

          margin: auto;

        }


        h1 {

          text-align: center;

          margin-bottom: 5px;

        }


        .subtitle {

          text-align: center;

          color: #666;

        }


        .line {

          border-top:
            1px solid #ccc;

          margin: 20px 0;

        }


        .details {

          margin: 15px 0;

        }


        .details p {

          margin: 7px 0;

        }


        table {

          width: 100%;

          border-collapse:
            collapse;

          margin-top: 20px;

        }


        th,
        td {

          border-bottom:
            1px solid #ddd;

          padding: 10px;

          text-align: left;

        }


        .total {

          text-align: right;

          font-size: 20px;

          font-weight: bold;

          margin-top: 20px;

        }


        .footer {

          text-align: center;

          margin-top: 40px;

          color: #666;

        }

      </style>

    </head>


    <body>

      <div class="receipt">

        <h1>
          Thulir Unavagam
        </h1>


        <div class="subtitle">
          Fresh food, every day.
        </div>


        <div class="line"></div>


        <div class="details">

          <p>
            <strong>Order No:</strong>
            #${order.order_id}
          </p>


          <p>
            <strong>Customer:</strong>
            ${escapeHtml(order.customer_name)}
          </p>


          <p>
            <strong>Phone:</strong>
            ${escapeHtml(order.phone)}
          </p>


          <p>
            <strong>Order Type:</strong>
            ${escapeHtml(order.order_type)}
          </p>


          <p>
            <strong>Expected Arrival:</strong>
            ${escapeHtml(order.arrival_time)}
          </p>


          <p>
            <strong>Payment:</strong>
            ${escapeHtml(order.payment_method)}
          </p>


          <p>
            <strong>Status:</strong>
            ${escapeHtml(
              order.status || "New"
            )}
          </p>

        </div>


        <table>

          <thead>

            <tr>

              <th>Item</th>

              <th>Qty</th>

              <th>Price</th>

              <th>Total</th>

            </tr>

          </thead>


          <tbody>

            ${itemsHTML}

          </tbody>

        </table>


        <div class="total">

          Total:

          ₹${Number(
            order.total_amount || 0
          ).toFixed(2)}

        </div>


        <div class="footer">

          Thank you for choosing
          Thulir Unavagam! ❤️

        </div>

      </div>


      <script>

        window.onload = function() {

          window.print();

        };

      <\/script>

    </body>

    </html>

  `);


  printWindow.document.close();

}


// =====================================================
// MESSAGE
// =====================================================

function showMessage(
  text,
  type = "info"
) {

  const message =
    document.getElementById(
      "checkoutMessage"
    );


  if (!message) return;


  message.textContent =
    text;


  message.className =
    `message-${type}`;

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(value) {

  return String(value || "")

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}