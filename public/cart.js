let cart =
  JSON.parse(localStorage.getItem("thulirCart")) || [];


function renderCart() {

  const container =
    document.getElementById("cartPageContainer");

  if (!cart.length) {

    container.innerHTML = `
      <div class="checkout-box">

        <h2>Your Cart is Empty</h2>

        <p>
          Add some delicious food from today's menu.
        </p>

        <a
          href="index.html"
          class="primary-btn"
        >
          🍽️ Go to Menu
        </a>

      </div>
    `;

    return;
  }


  let total = 0;


  const itemsHTML = cart.map((item, index) => {

    const itemTotal =
      Number(item.price) * item.qty;

    total += itemTotal;


    return `
      <div class="checkout-item">

        <div>

          <strong>
            ${item.name}
          </strong>

          <p>
            ₹${Number(item.price).toFixed(0)}
            each
          </p>

        </div>


        <div class="cart-controls">

          <button
            onclick="decreaseQuantity(${index})"
            class="quantity-btn"
          >
            −
          </button>

          <span class="quantity">
            ${item.qty}
          </span>

          <button
            onclick="increaseQuantity(${index})"
            class="quantity-btn"
          >
            +
          </button>

        </div>


        <div>

          <strong>
            ₹${itemTotal.toFixed(0)}
          </strong>

          <br>

          <button
            onclick="removeItem(${index})"
            class="remove-btn"
          >
            Remove
          </button>

        </div>

      </div>
    `;

  }).join("");


  container.innerHTML = `

    <div class="checkout-box">

      <h2>
        Your Cart
      </h2>

      <div class="cart-items">

        ${itemsHTML}

      </div>

      <hr>

      <h2>
        Total: ₹${total.toFixed(0)}
      </h2>

      <button
        onclick="proceedToCheckout()"
        class="checkout-btn"
      >
        Proceed to Checkout
      </button>

      <br><br>

      <a href="index.html">
        ← Continue Shopping
      </a>

    </div>

  `;
}



function increaseQuantity(index) {

  cart[index].qty++;

  saveCart();

  renderCart();
}



function decreaseQuantity(index) {

  if (cart[index].qty > 1) {

    cart[index].qty--;

  } else {

    cart.splice(index, 1);

  }

  saveCart();

  renderCart();
}



function removeItem(index) {

  cart.splice(index, 1);

  saveCart();

  renderCart();
}



function saveCart() {

  localStorage.setItem(
    "thulirCart",
    JSON.stringify(cart)
  );

}



function proceedToCheckout() {

  window.location.href = "checkout.html";

}


renderCart();