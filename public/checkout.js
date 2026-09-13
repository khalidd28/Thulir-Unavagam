let cart =
  JSON.parse(localStorage.getItem("thulirCart")) || [];


// SHOW ORDER SUMMARY

function showSummary() {

  const summary =
    document.getElementById("checkoutSummary");

  if (!cart.length) {

    summary.innerHTML = `
      <p>
        Your cart is empty.
      </p>

      <a href="index.html">
        ← Go to Menu
      </a>
    `;

    return;
  }


  let total = 0;


  const itemsHTML = cart.map(item => {

    const itemTotal =
      Number(item.price) * item.qty;

    total += itemTotal;

    return `
      <p>
        <strong>
          ${item.name}
        </strong>

        × ${item.qty}

        — ₹${itemTotal.toFixed(0)}
      </p>
    `;

  }).join("");


  summary.innerHTML = `

    <hr>

    <h3>
      Order Summary
    </h3>

    ${itemsHTML}

    <h2>
      Total: ₹${total.toFixed(0)}
    </h2>

  `;
}



// PLACE ORDER

document
  .getElementById("checkoutForm")
  .addEventListener("submit", async function(event) {

    event.preventDefault();


    if (!cart.length) {

      alert("Your cart is empty.");

      return;
    }


    const customerName =
      document
        .getElementById("customerName")
        .value
        .trim();


    const phone =
      document
        .getElementById("customerPhone")
        .value
        .trim();
        if (!/^[0-9]{10}$/.test(phone)) {

  alert("Please enter a valid 10-digit phone number.");

  return;
}


    const address =
      document
        .getElementById("customerAddress")
        .value
        .trim();


    const orderMessage =
      document.getElementById("orderMessage");


    let total = 0;

    cart.forEach(item => {

      total +=
        Number(item.price) * item.qty;

    });


    const orderData = {

      customer_name: customerName,

      phone: phone,

      address: address,

      total_amount: total,

      items: cart.map(item => ({

        food_id: item.food_id,

        quantity: item.qty,

        price: Number(item.price)

      }))

    };


    try {

      orderMessage.textContent =
        "Placing your order...";


      const response =
        await fetch("/api/orders", {

          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(orderData)

        });


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to place order."
        );

      }


      // CLEAR CART

      localStorage.removeItem(
        "thulirCart"
      );

      cart = [];


      // SHOW SUCCESS

      document.getElementById(
        "checkoutForm"
      ).style.display = "none";


      document.getElementById(
        "checkoutSummary"
      ).style.display = "none";


      orderMessage.innerHTML = `

        <div class="tracking-card">

          <h2>
            🎉 Order Placed Successfully!
          </h2>

          <p>
            Thank you, ${customerName}.
          </p>

          <p>
            Your Order ID is:
          </p>

          <h1>
            #${data.order_id}
          </h1>

          <p>
            <strong>
              Total Amount:
            </strong>

            ₹${total.toFixed(0)}
          </p>

          <p>
            Your order has been received by
            Thulir Unavagam.
          </p>

          <br>

          <a
            href="index.html#tracking"
            class="primary-btn"
          >
            📦 Track Your Order
          </a>

          <a
            href="index.html"
            class="primary-btn"
          >
            🍽️ Back to Menu
          </a>

        </div>

      `;


    } catch (error) {

      console.error(
        "ORDER ERROR:",
        error
      );


      orderMessage.innerHTML = `

        <p>
          ❌ ${error.message}
        </p>

      `;

    }

  });


showSummary();