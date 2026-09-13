let menu = [];

let cart =
  JSON.parse(localStorage.getItem("thulirCart")) || [];

let trackingInterval = null;


// ==========================================
// FOOD IMAGE MAPPING
// ==========================================

const foodImages = {
  "idli": "assets/food/idli.jpg",
  "dosa": "assets/food/dosa.jpg",
  "chapati": "assets/food/chapati.jpg",
  "chapathi": "assets/food/chapati.jpg",
  "poori": "assets/food/poori.jpg",
  "pongal": "assets/food/pongal.jpg",
  "vada": "assets/food/vada.jpg",
  "medu vada": "assets/food/vada.jpg",

  "egg rice": "assets/food/egg-rice.jpg",
  "egg-rice": "assets/food/egg-rice.jpg",

  "egg noodles": "assets/food/egg-noodles.jpg",
  "egg-noodles": "assets/food/egg-noodles.jpg",

  "semiya biryani": "assets/food/semiya-biryani.jpg",
  "semiya-biryani": "assets/food/semiya-biryani.jpg",

  "biryani": "assets/food/biryani.jpg",

  "empty biryani": "assets/food/empty-biryani.jpg",
  "empty-biryani": "assets/food/empty-biryani.jpg",

  "tomato rice": "assets/food/tomato-rice.jpg",
  "tomato-rice": "assets/food/tomato-rice.jpg",

  "malli rice": "assets/food/malli-rice.jpg",
  "malli-rice": "assets/food/malli-rice.jpg",
  "coriander rice": "assets/food/malli-rice.jpg"
};


// ==========================================
// LOAD MENU FROM DATABASE
// ==========================================

async function loadMenu() {

  try {

    const response = await fetch("/api/menu");

    if (!response.ok) {
      throw new Error("Unable to load menu");
    }

    menu = await response.json();

    renderMenu();

  } catch (error) {

    console.error("MENU ERROR:", error);

    document.getElementById("menuContainer").innerHTML =
      "<p>Unable to load today's menu.</p>";
  }
}


// ==========================================
// GET IMAGE FOR FOOD ITEM
// ==========================================

function getFoodImage(foodName) {

  const name = foodName
    .toLowerCase()
    .trim();

  return foodImages[name] ||
    "assets/food/idli.jpg";
}


// ==========================================
// DISPLAY MENU
// ==========================================

function renderMenu() {

  const container =
    document.getElementById("menuContainer");

  if (!menu.length) {

    container.innerHTML =
      "<p>No items available today.</p>";

    return;
  }


  const categories = [
    "Breakfast",
    "Lunch",
    "Dinner",
    "Tea & Snacks"
  ];


  container.innerHTML = categories.map(category => {

    const items =
      menu.filter(
        item => item.meal_type === category
      );


    if (!items.length) {
      return "";
    }


    return `
      <div class="category">

        <h3>${category}</h3>

        <div class="cards">

          ${items.map(item => {

            const image =
              getFoodImage(item.name);

            return `

              <div class="card">

                <img
                  src="${image}"
                  alt="${item.name}"
                  class="food-image"
                >

                <div class="card-content">

                  <h4>${item.name}</h4>

                  <p>
                    ${
                      item.description ||
                      "Freshly prepared at Thulir Unavagam."
                    }
                  </p>

                  <div class="price">
                    ₹${Number(item.price).toFixed(0)}
                  </div>

                  <button
                    class="add"
                    onclick="addToCart(${item.food_id})"
                  >
                    Add to Cart
                  </button>

                </div>

              </div>

            `;

          }).join("")}

        </div>

      </div>
    `;

  }).join("");
}


// ==========================================
// ADD FOOD TO CART
// ==========================================

function addToCart(foodId) {

  const item =
    menu.find(
      x => x.food_id === foodId
    );


  if (!item) {

    alert("Food item not found.");

    return;
  }


  const existing =
    cart.find(
      x => x.food_id === foodId
    );


  if (existing) {

    existing.qty++;

  } else {

    cart.push({

      food_id: item.food_id,

      name: item.name,

      price: Number(item.price),

      qty: 1

    });
  }


  localStorage.setItem(
  "thulirCart",
  JSON.stringify(cart)
);

updateCartCount();

alert(item.name + " added to cart");
}


// ==========================================
// UPDATE CART COUNT
// ==========================================

function updateCartCount() {

  const count =
    cart.reduce(
      (sum, item) =>
        sum + item.qty,
      0
    );


  document.getElementById(
    "cartCount"
  ).textContent = count;
}


// ==========================================
// SHOW CART
// ==========================================

function showCart() {

  const checkoutContainer =
    document.getElementById(
      "checkoutContainer"
    );


  if (!cart.length) {

    checkoutContainer.innerHTML = `

      <div class="checkout-box">

        <h2>Your Cart</h2>

        <p>Your cart is empty.</p>

      </div>

    `;

    return;
  }


  const total =
    cart.reduce(
      (sum, item) =>
        sum +
        item.price *
        item.qty,
      0
    );


  const cartItems =
    cart.map(item => `

      <div class="checkout-item">

        <strong>
          ${item.name}
        </strong>

        <span>
          ${item.qty}
          × ₹${item.price.toFixed(0)}
          =
          ₹${(
            item.price *
            item.qty
          ).toFixed(0)}
        </span>

      </div>

    `).join("");


  checkoutContainer.innerHTML = `

    <div class="checkout-box">

      <h2>Your Cart</h2>

      <div class="cart-items">
        ${cartItems}
      </div>

      <h3>
        Total:
        ₹${total.toFixed(0)}
      </h3>

      <hr>

      <h2>Checkout</h2>

      <form id="checkoutForm">

        <label>
          Customer Name
        </label>

        <input
          type="text"
          id="customerName"
          required
          placeholder="Enter your name"
        >


        <label>
          Phone Number
        </label>

        <input
          type="tel"
          id="customerPhone"
          required
          placeholder="Enter your phone number"
        >


        <label>
          Delivery Address
        </label>

        <textarea
          id="customerAddress"
          required
          placeholder="Enter your delivery address"
          rows="4"
        ></textarea>


        <button
          type="submit"
          class="checkout-btn"
        >
          Place Order
        </button>

      </form>


      <p id="orderMessage"></p>

    </div>

  `;


  document
    .getElementById("checkoutForm")
    .addEventListener(
      "submit",
      placeOrder
    );
}


// ==========================================
// PLACE ORDER
// ==========================================

async function placeOrder(event) {

  event.preventDefault();


  const customerName =
    document
      .getElementById("customerName")
      .value
      .trim();


  const customerPhone =
    document
      .getElementById("customerPhone")
      .value
      .trim();


  const customerAddress =
    document
      .getElementById("customerAddress")
      .value
      .trim();


  const message =
    document.getElementById(
      "orderMessage"
    );


  if (
    !customerName ||
    !customerPhone ||
    !customerAddress
  ) {

    message.textContent =
      "Please fill all customer details.";

    return;
  }


  const items =
    cart.map(item => ({

      food_id:
        item.food_id,

      quantity:
        item.qty

    }));


  try {

    message.textContent =
      "Placing your order...";


    const response =
      await fetch(
        "/api/orders",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              customer_name:
                customerName,

              phone:
                customerPhone,

              address:
                customerAddress,

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


    message.innerHTML = `

      <strong>
        Order placed successfully!
      </strong>

      <br>

      Order ID:
      #${data.order_id}

      <br>

      Total Amount:
      ₹${Number(
        data.total_amount
      ).toFixed(0)}

    `;


    cart = [];

    updateCartCount();

    document
      .getElementById(
        "checkoutForm"
      )
      .reset();


  } catch (error) {

    console.error(
      "ORDER ERROR:",
      error
    );

    message.textContent =
      error.message ||
      "Unable to place order.";
  }
}


// ==========================================
// TRACK ORDER
// ==========================================

async function trackOrder() {

  const orderId =
    document
      .getElementById(
        "trackingOrderId"
      )
      .value
      .trim();


  const result =
    document.getElementById(
      "trackingResult"
    );


  if (!orderId) {

    result.innerHTML =
      "<p>Please enter your Order ID.</p>";

    return;
  }


  if (trackingInterval) {

    clearInterval(
      trackingInterval
    );
  }


  await fetchOrderStatus(
    orderId
  );


  trackingInterval =
    setInterval(
      () => {

        fetchOrderStatus(
          orderId
        );

      },
      5000
    );
}


// ==========================================
// FETCH ORDER STATUS
// ==========================================

async function fetchOrderStatus(
  orderId
) {

  const result =
    document.getElementById(
      "trackingResult"
    );


  try {

    const response =
      await fetch(
        `/api/orders/${orderId}`
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Order not found."
      );
    }


    const order =
      data.order;


    const items =
      data.items;


    const statuses = [

      "New",

      "Accepted",

      "Preparing",

      "Ready",

      "Out for Delivery",

      "Delivered"

    ];


    let statusHTML = "";


    // CANCELLED ORDER

    if (
      order.status ===
      "Cancelled"
    ) {

      statusHTML = `

        <div class="tracking-card">

          <h3>
            Order #${order.order_id}
          </h3>

          <p>
            <strong>
              Status:
            </strong>

            Cancelled ❌
          </p>

          <p>
            Your order has been cancelled.
          </p>

        </div>

      `;

    }


    // NORMAL ORDER

    else {

      const currentIndex =
        statuses.indexOf(
          order.status
        );


      const trackerHTML =
        statuses.map(
          (status, index) => {

            let className = "";


            if (
              index <
              currentIndex
            ) {

              className =
                "completed";
            }


            if (
              index ===
              currentIndex
            ) {

              className =
                "current completed";
            }


            return `

              <div
                class="status-step ${className}"
              >

                <div
                  class="status-circle"
                >

                  ${
                    index <=
                    currentIndex
                      ? "✓"
                      : index + 1
                  }

                </div>


                <div
                  class="status-name"
                >
                  ${status}
                </div>

              </div>

            `;

          }
        ).join("");


      statusHTML = `

        <div class="tracking-card">

          <h3>
            Order #${order.order_id}
          </h3>


          <p>

            <strong>
              Current Status:
            </strong>

            ${order.status}

          </p>


          <div
            class="order-status-tracker"
          >

            ${trackerHTML}

          </div>


          <p>

            <strong>
              Customer:
            </strong>

            ${order.customer_name}

          </p>


          <p>

            <strong>
              Address:
            </strong>

            ${order.address}

          </p>


          <h4>
            Items
          </h4>


          ${
            items.map(item => `

              <p>

                ${item.food_name}

                ×

                ${item.quantity}

                =

                ₹${(
                  Number(
                    item.unit_price
                  ) *
                  item.quantity
                ).toFixed(0)}

              </p>

            `).join("")
          }


          <h3>

            Total:

            ₹${Number(
              order.total_amount
            ).toFixed(0)}

          </h3>

        </div>

      `;
    }


    result.innerHTML =
      statusHTML;


  } catch (error) {

    console.error(
      "TRACKING ERROR:",
      error
    );


    result.innerHTML = `

      <div class="tracking-card">

        <p>
          ${error.message}
        </p>

      </div>

    `;
  }
}


// ==========================================
// TODAY'S DATE
// ==========================================

const today =
  new Date();


document
  .getElementById(
    "todayDate"
  )
  .textContent =
    today.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );


// ==========================================
// START WEBSITE
// ==========================================

loadMenu();