const cart = JSON.parse(
  localStorage.getItem("thulirCart") || "[]"
);

const form = document.getElementById("checkoutForm");
const summary = document.getElementById("checkoutSummary");
const message = document.getElementById("checkoutMessage");


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

    // Support the existing cart structure
    const name =
      item.name || item.food_name || "Food Item";

    const price =
      Number(item.price || item.unit_price || 0);

    const quantity =
      Number(
        item.quantity ||
        item.qty ||
        1
      );

    const itemTotal =
      price * quantity;

    total += itemTotal;

    html += `
      <div class="checkout-summary-row">

        <span>
          ${name} × ${quantity}
        </span>

        <strong>
          ₹${itemTotal.toFixed(2)}
        </strong>

      </div>
    `;
  });


  html += `

      <div class="checkout-total">

        <span>
          Total Amount
        </span>

        <strong>
          ₹${total.toFixed(2)}
        </strong>

      </div>


      <div class="payment-summary">

        <span>
          Payment Method
        </span>

        <strong>
          💵 Cash on Delivery
        </strong>

      </div>

    </div>
  `;


  summary.innerHTML = html;
}


showCartSummary();


form.addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();


    if (cart.length === 0) {

      message.textContent =
        "❌ Your cart is empty.";

      return;
    }


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


    const address =
      document
        .getElementById("address")
        .value
        .trim();


    if (!/^[0-9]{10}$/.test(phone)) {

      message.textContent =
        "❌ Please enter a valid 10-digit phone number.";

      return;
    }


    if (!customerName || !address) {

      message.textContent =
        "❌ Please fill in all required details.";

      return;
    }


    const items = cart.map(item => ({

      food_id:
        Number(
          item.food_id ||
          item.id
        ),

      quantity:
        Number(
          item.quantity ||
          item.qty ||
          1
        )

    }));


    try {

      message.textContent =
        "⏳ Placing your order...";


      const response =
        await fetch("/api/orders", {

          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            customer_name:
              customerName,

            phone:
              phone,

            address:
              address,

            payment_method:
              "Cash on Delivery",

            items:
              items

          })

        });


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          "Unable to place order."
        );

      }


      localStorage.removeItem(
        "thulirCart"
      );


      window.location.href =
        `order-confirmation.html?order_id=${data.order_id}`;

    }

    catch(error) {

      console.error(error);

      message.textContent =
        "❌ " + error.message;

    }

  }
);