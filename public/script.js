let menu = [];
let selectedCategory = "All";
let searchText = "";
let cart =
  JSON.parse(localStorage.getItem("thuliirCart")) || [];

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

    const container =
      document.getElementById("menuContainer");

    if (container) {

      container.innerHTML =
        "<p>Unable to load today's menu.</p>";

    }

  }

}


// ==========================================
// GET FOOD IMAGE
// ==========================================
function getFoodImage(foodName) {

  const name = String(foodName || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  if (name.includes("idli")) {
    return "assets/food/idli.jpg";
  }

  if (name.includes("dosa")) {
    return "assets/food/dosa.jpg";
  }

  if (name.includes("chapati") || name.includes("chapathi")) {
    return "assets/food/chapati.jpg";
  }

  if (name.includes("poori") || name.includes("puri")) {
    return "assets/food/poori.jpg";
  }

  if (name.includes("pongal")) {
    return "assets/food/pongal.jpg";
  }

  if (name.includes("vada")) {
    return "assets/food/vada.jpg";
  }

  if (name.includes("egg rice") || name.includes("egg-rice")) {
    return "assets/food/egg-rice.jpg";
  }

  if (name.includes("egg noodles") || name.includes("egg-noodles")) {
    return "assets/food/egg-noodles.jpg";
  }

  if (name.includes("semiya biryani") || name.includes("semiya-biryani")) {
    return "assets/food/semiya-biryani.jpg";
  }

  if (name.includes("empty biryani") || name.includes("empty-biryani")) {
    return "assets/food/empty-biryani.jpg";
  }

  if (name.includes("biryani")) {
    return "assets/food/biryani.jpg";
  }

  if (name.includes("tomato rice") || name.includes("tomato-rice")) {
    return "assets/food/tomato-rice.jpg";
  }

  if (
    name.includes("malli rice") ||
    name.includes("malli-rice") ||
    name.includes("coriander rice")
  ) {
    return "assets/food/malli-rice.jpg";
  }

  if (name.includes("meals")) {
    return "assets/food/meals.jpg";
  }

  return "assets/food/idli.jpg";
}

// ==========================================
// RENDER MENU
// ==========================================

function renderMenu() {

  const container =
    document.getElementById("menuContainer");

  if (!container) {
    return;
  }

  const filteredMenu = menu.filter(item => {

    const matchesCategory =
      selectedCategory === "All" ||
      item.meal_type === selectedCategory ||
      item.category === selectedCategory;

    const matchesSearch =
      !searchText ||
      String(item.name || "")
        .toLowerCase()
        .includes(searchText) ||
      String(item.description || "")
        .toLowerCase()
        .includes(searchText);

    return matchesCategory && matchesSearch;
  });


  if (filteredMenu.length === 0) {

    container.innerHTML = `
      <div class="no-menu-message">
        <div style="font-size:45px;">🍽️</div>
        <h3>No food found</h3>
        <p>Try another food name or category.</p>
      </div>
    `;

    return;
  }


  const grouped = {};

  filteredMenu.forEach(item => {

    const category =
      item.meal_type ||
      item.category ||
      "Other";

    if (!grouped[category]) {
      grouped[category] = [];
    }

    grouped[category].push(item);

  });


  const categoryOrder = [
    "Breakfast",
    "Lunch",
    "Dinner",
    "Tea & Snacks"
  ];


  let html = "";


  categoryOrder.forEach(category => {

    if (!grouped[category]) {
      return;
    }


    html += `
      <div class="menu-category">

        <h3 class="menu-category-title">
          ${
            category === "Tea & Snacks"
              ? "☕ Snacks"
              : category
          }
        </h3>

        <div class="menu-grid">
    `;


    grouped[category].forEach(item => {

      const image =
        getFoodImage(item.name);

      const foodId =
        Number(item.food_id || item.id);

      const foodName =
        escapeHtml(item.name || "");

      const foodPrice =
        Number(item.price || 0);


      html += `
        <div class="food-card">

          <img
            src="${image}"
            alt="${foodName}"
            class="food-image"
            onerror="this.style.display='none'"
          >

          <div class="food-card-content">

            <h3>
              ${foodName}
            </h3>

            <p class="food-description">
              ${escapeHtml(item.description || "")}
            </p>

            <div class="food-card-bottom">

              <strong class="food-price">
                ₹${foodPrice.toFixed(2)}
              </strong>

              <button
                class="add-cart-btn"
                onclick="addToCart(
                  ${foodId},
                  '${String(item.name || "")
                    .replace(/\\/g, "\\\\")
                    .replace(/'/g, "\\'")}',
                  ${foodPrice}
                )"
              >
                🛒 Add
              </button>

            </div>

          </div>

        </div>
      `;

    });


    html += `
        </div>
      </div>
    `;

  });


  container.innerHTML = html;

}

// ==========================================
// ADD FOOD TO CART
// ==========================================

// ==========================================
// ADD FOOD TO CART
// ==========================================

function addToCart(foodId, foodName, foodPrice) {

  foodId = Number(foodId);

  const item = menu.find(x =>
    Number(x.food_id || x.id) === foodId
  );

  if (!item) {
    alert("Food item not found.");
    return;
  }

  const existing = cart.find(x =>
    Number(x.food_id) === foodId
  );

  if (existing) {

    existing.qty++;

  } else {

    cart.push({
      food_id: foodId,
      name: foodName || item.name,
      price: Number(foodPrice || item.price),
      qty: 1
    });

  }

  localStorage.setItem(
    "thuliirCart",
    JSON.stringify(cart)
  );

  updateCartCount();

  alert(
    (foodName || item.name) +
    " added to cart"
  );
}

// ==========================================
// UPDATE CART COUNT
// ==========================================

function updateCartCount() {

  const count =
    cart.reduce(
      (sum, item) =>
        sum + Number(item.qty || 0),
      0
    );

  const cartCount =
    document.getElementById("cartCount");

  if (cartCount) {

    cartCount.textContent =
      count;

  }

}


// ==========================================
// TRACK ORDER
// ==========================================

async function trackOrder() {

  const input =
    document.getElementById(
      "trackingOrderId"
    );

  const result =
    document.getElementById(
      "trackingResult"
    );

  if (!input || !result) {
    return;
  }

  const orderId =
    input.value.trim();

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

  await fetchOrderStatus(orderId);

  trackingInterval =
    setInterval(
      () => {

        fetchOrderStatus(orderId);

      },
      5000
    );

}


// ==========================================
// FETCH ORDER STATUS
// ==========================================

async function fetchOrderStatus(orderId) {

  const result =
    document.getElementById(
      "trackingResult"
    );

  if (!result) {
    return;
  }

  try {

    const response =
      await fetch(
        `/api/orders/${encodeURIComponent(orderId)}`
      );

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data.message ||
        "Order not found."
      );

    }


    // ======================================
    // SUPPORT API RESPONSE
    // ======================================

    const order =
      data.order ||
      data;

    const items =
      data.items ||
      order.items ||
      [];


    if (
      !order ||
      !order.status
    ) {

      throw new Error(
        "Order information is unavailable."
      );

    }


    // ======================================
    // ORDER STATUS FLOW
    // ======================================

    const statuses = [

      "New",

      "Accepted",

      "Preparing",

      "Ready",

      "Completed"

    ];


    // ======================================
    // CANCELLED ORDER
    // ======================================

    if (
      order.status === "Cancelled"
    ) {

      result.innerHTML = `

        <div class="tracking-card">

          <h3>
            Order #${escapeHtml(
              order.order_id ||
              order.id
            )}
          </h3>

          <p>

            <strong>
              Current Status:
            </strong>

            Cancelled ❌

          </p>

          <p>
            Your order has been cancelled.
          </p>

        </div>

      `;

      return;

    }


    // ======================================
    // CURRENT STATUS INDEX
    // ======================================

    const currentIndex =
      statuses.indexOf(
        order.status
      );

    const safeIndex =
      currentIndex >= 0
        ? currentIndex
        : 0;


    // ======================================
    // CREATE STATUS TRACKER
    // ======================================

    const trackerHTML =
      statuses
        .map(
          (status, index) => {

            let className = "";

            if (
              index <
              safeIndex
            ) {

              className =
                "completed";

            }

            if (
              index ===
              safeIndex
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
                    safeIndex
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
        )
        .join("");


    // ======================================
    // ORDER TYPE
    // ======================================

    const orderType =
      order.order_type ||
      "Parcel";


    // ======================================
    // ARRIVAL TIME
    // ======================================

    let arrivalTime =
      order.arrival_time ||
      "Not specified";


    arrivalTime =
      String(arrivalTime)
        .substring(0, 5);


    // ======================================
    // ORDER ITEMS
    // ======================================

    let itemsHTML = "";

    if (
      items &&
      items.length
    ) {

      itemsHTML =
        items
          .map(item => {

            const itemName =
              item.food_name ||
              item.name ||
              "Food Item";

            const quantity =
              Number(
                item.quantity || 0
              );

            const unitPrice =
              Number(
                item.unit_price ||
                item.price ||
                0
              );

            const itemTotal =
              unitPrice *
              quantity;

            return `

              <p>

                ${escapeHtml(itemName)}

                × ${quantity}

                =

                ₹${itemTotal.toFixed(0)}

              </p>

            `;

          })
          .join("");

    } else {

      itemsHTML =
        "<p>Order items unavailable.</p>";

    }


    // ======================================
    // DISPLAY TRACKING
    // ======================================

    result.innerHTML = `

      <div class="tracking-card">

        <h3>

          Order #
          ${escapeHtml(
            order.order_id ||
            order.id
          )}

        </h3>


        <p>

          <strong>
            Current Status:
          </strong>

          ${escapeHtml(
            order.status
          )}

        </p>


        <div
          class="order-status-tracker"
        >

          ${trackerHTML}

        </div>


        <div class="tracking-info">

          <p>

            <strong>
              Customer:
            </strong>

            ${escapeHtml(
              order.customer_name ||
              "-"
            )}

          </p>


          <p>

            <strong>
              Order Type:
            </strong>

            ${escapeHtml(
              orderType
            )}

          </p>


          <p>

            <strong>
              Expected Arrival:
            </strong>

            ${escapeHtml(
              arrivalTime
            )}

          </p>

        </div>


        <h4>
          🍽️ Items
        </h4>


        ${itemsHTML}


        <h3>

          Total:

          ₹${Number(
            order.total_amount ||
            0
          ).toFixed(0)}

        </h3>

      </div>

    `;


  } catch (error) {

    console.error(
      "TRACKING ERROR:",
      error
    );

    result.innerHTML = `

      <div class="tracking-card">

        <p>
          ${escapeHtml(
            error.message ||
            "Unable to track order."
          )}
        </p>

      </div>

    `;

  }

}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(value) {

  return String(value ?? "")
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


// ==========================================
// TODAY'S DATE
// ==========================================

const today =
  new Date();

const todayDate =
  document.getElementById(
    "todayDate"
  );

if (todayDate) {

  todayDate.textContent =
    today.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );

}


// ==========================================
// UPDATE CART COUNT
// ==========================================

updateCartCount();


// ==========================================
// START WEBSITE
// ==========================================

loadMenu();


// ==========================================
// AUTO TRACK ORDER FROM URL
// Example:
// index.html?track=123
// ==========================================

const urlParams =
  new URLSearchParams(
    window.location.search
  );

const trackId =
  urlParams.get("track");

if (trackId) {

  const trackingInput =
    document.getElementById(
      "trackingOrderId"
    );

  if (trackingInput) {

    trackingInput.value =
      trackId;

    trackOrder();

    const trackingSection =
      document.getElementById(
        "tracking"
      );

    if (trackingSection) {

      setTimeout(
        () => {

          trackingSection.scrollIntoView({
            behavior: "smooth"
          });

        },
        300
      );

    }

  }

}
// ==========================================
// SEARCH AND CATEGORY FILTER
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

  const searchInput =
    document.getElementById("menuSearch");

  if (searchInput) {

    searchInput.addEventListener("input", function () {

      searchText =
        this.value.trim().toLowerCase();

      renderMenu();

    });

  }

  const categoryButtons =
    document.querySelectorAll(".category-btn");

  categoryButtons.forEach(button => {

    button.addEventListener("click", function () {

      categoryButtons.forEach(btn => {
        btn.classList.remove("active");
      });

      this.classList.add("active");

      selectedCategory =
        this.dataset.category;

      renderMenu();

    });

  });

});