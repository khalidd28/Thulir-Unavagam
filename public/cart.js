// ==========================================
// CART DATA
// ==========================================

let cart =
  JSON.parse(
    localStorage.getItem("thulirCart") || "[]"
  );


// ==========================================
// FOOD IMAGE MAPPING
// ==========================================

const foodImages = {

  "idli":
    "assets/food/idli.jpg",

  "dosa":
    "assets/food/dosa.jpg",

  "chapati":
    "assets/food/chapati.jpg",

  "chapathi":
    "assets/food/chapati.jpg",

  "poori":
    "assets/food/poori.jpg",

  "pongal":
    "assets/food/pongal.jpg",

  "vada":
    "assets/food/vada.jpg",

  "medu vada":
    "assets/food/vada.jpg",

  "egg rice":
    "assets/food/egg-rice.jpg",

  "egg-rice":
    "assets/food/egg-rice.jpg",

  "egg noodles":
    "assets/food/egg-noodles.jpg",

  "egg-noodles":
    "assets/food/egg-noodles.jpg",

  "semiya biryani":
    "assets/food/semiya-biryani.jpg",

  "semiya-biryani":
    "assets/food/semiya-biryani.jpg",

  "biryani":
    "assets/food/biryani.jpg",

  "empty biryani":
    "assets/food/empty-biryani.jpg",

  "empty-biryani":
    "assets/food/empty-biryani.jpg",

  "tomato rice":
    "assets/food/tomato-rice.jpg",

  "tomato-rice":
    "assets/food/tomato-rice.jpg",

  "malli rice":
    "assets/food/malli-rice.jpg",

  "malli-rice":
    "assets/food/malli-rice.jpg",

  "coriander rice":
    "assets/food/malli-rice.jpg"

};


// ==========================================
// GET FOOD IMAGE
// ==========================================

function getFoodImage(name) {

  const foodName =
    String(name || "")
      .toLowerCase()
      .trim();

  return (
    foodImages[foodName] ||
    "assets/food/idli.jpg"
  );

}


// ==========================================
// SAVE CART
// ==========================================

function saveCart() {

  localStorage.setItem(
    "thulirCart",
    JSON.stringify(cart)
  );

}


// ==========================================
// RENDER CART
// ==========================================

function renderCart() {

  const container =
    document.getElementById(
      "cartPageContainer"
    );

  if (!container) {
    return;
  }


  // EMPTY CART

  if (!cart.length) {

    container.innerHTML = `

      <div class="cart-items-box empty-cart">

        <div class="empty-cart-icon">
          🛒
        </div>

        <h3>
          Your Cart is Empty
        </h3>

        <p>
          Add some delicious food from today's menu.
        </p>

        <a
          href="index.html"
          class="empty-cart-btn"
        >
          🍽️ Browse Menu
        </a>

      </div>

    `;

    return;

  }


  // CALCULATE TOTAL

  let total = 0;

  cart.forEach(item => {

    const price =
      Number(
        item.price ||
        item.unit_price ||
        0
      );

    const quantity =
      Number(
        item.quantity ||
        item.qty ||
        1
      );

    total +=
      price * quantity;

  });


  // CART ITEMS

  const itemsHTML =
    cart.map(
      (item, index) => {

        const name =
          item.name ||
          item.food_name ||
          "Food Item";

        const price =
          Number(
            item.price ||
            item.unit_price ||
            0
          );

        const quantity =
          Number(
            item.quantity ||
            item.qty ||
            1
          );

        const itemTotal =
          price * quantity;

        const image =
          getFoodImage(name);


        return `

          <div class="cart-item">

            <img
              src="${image}"
              alt="${name}"
              class="cart-item-image"
            >

            <div class="cart-item-info">

              <h4>
                ${name}
              </h4>

              <div class="cart-item-price">
                ₹${price.toFixed(0)}
              </div>

              <div class="quantity-controls">

                <button
                  class="quantity-btn"
                  onclick="decreaseQuantity(${index})"
                >
                  −
                </button>

                <span class="quantity-value">
                  ${quantity}
                </span>

                <button
                  class="quantity-btn"
                  onclick="increaseQuantity(${index})"
                >
                  +
                </button>

              </div>

              <button
                class="remove-btn"
                onclick="removeItem(${index})"
              >
                🗑️ Remove
              </button>

            </div>

            <div class="cart-item-total">

              ₹${itemTotal.toFixed(0)}

            </div>

          </div>

        `;

      }
    ).join("");


  // FINAL CART UI

  container.innerHTML = `

    <div class="cart-layout">


      <!-- ITEMS -->

      <div class="cart-items-box">

        <h3>
          Your Items
        </h3>

        ${itemsHTML}

      </div>


      <!-- SUMMARY -->

      <div class="cart-summary-box">

        <h3>
          Order Summary
        </h3>

        <div class="summary-row">

          <span>
            Items
          </span>

          <strong>
            ${getTotalQuantity()}
          </strong>

        </div>


        <div class="summary-row">

          <span>
            Subtotal
          </span>

          <strong>
            ₹${total.toFixed(0)}
          </strong>

        </div>


        <div class="summary-row">

          <span>
            Payment
          </span>

          <strong>
            💵 Cash on Delivery
          </strong>

        </div>


        <div class="summary-total">

          <span>
            Total
          </span>

          <strong>
            ₹${total.toFixed(0)}
          </strong>

        </div>


        <button
          class="checkout-btn-cart"
          onclick="proceedToCheckout()"
        >
          🛒 Proceed to Checkout
        </button>


        <a
          href="index.html"
          class="continue-shopping"
        >
          ← Continue Shopping
        </a>

      </div>

    </div>

  `;

}


// ==========================================
// TOTAL QUANTITY
// ==========================================

function getTotalQuantity() {

  return cart.reduce(
    (total, item) => {

      return (
        total +
        Number(
          item.quantity ||
          item.qty ||
          1
        )
      );

    },
    0
  );

}


// ==========================================
// INCREASE QUANTITY
// ==========================================

function increaseQuantity(index) {

  if (!cart[index]) {
    return;
  }


  if (cart[index].quantity !== undefined) {

    cart[index].quantity =
      Number(cart[index].quantity) + 1;

  } else {

    cart[index].qty =
      Number(cart[index].qty || 1) + 1;

  }


  saveCart();

  renderCart();

}


// ==========================================
// DECREASE QUANTITY
// ==========================================

function decreaseQuantity(index) {

  if (!cart[index]) {
    return;
  }


  let quantity =
    Number(
      cart[index].quantity ||
      cart[index].qty ||
      1
    );


  if (quantity <= 1) {

    removeItem(index);

    return;

  }


  quantity--;


  if (cart[index].quantity !== undefined) {

    cart[index].quantity =
      quantity;

  } else {

    cart[index].qty =
      quantity;

  }


  saveCart();

  renderCart();

}


// ==========================================
// REMOVE ITEM
// ==========================================

function removeItem(index) {

  if (!cart[index]) {
    return;
  }


  const itemName =
    cart[index].name ||
    cart[index].food_name ||
    "Item";


  const confirmed =
    confirm(
      `Remove ${itemName} from your cart?`
    );


  if (!confirmed) {
    return;
  }


  cart.splice(
    index,
    1
  );


  saveCart();

  renderCart();

}


// ==========================================
// PROCEED TO CHECKOUT
// ==========================================

function proceedToCheckout() {

  if (!cart.length) {

    alert(
      "Your cart is empty."
    );

    return;

  }


  window.location.href =
    "checkout.html";

}


// ==========================================
// START
// ==========================================

renderCart();