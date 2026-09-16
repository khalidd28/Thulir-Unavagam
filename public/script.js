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

  const name =
    foodName
      .toLowerCase()
      .trim();

  return (
    foodImages[name] ||
    "assets/food/idli.jpg"
  );

}


// ==========================================
// DISPLAY MENU
// ==========================================

function renderMenu() {

  const container =
    document.getElementById("menuContainer");

  if (!container) {
    return;
  }

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

  container.innerHTML =
    categories
      .map(category => {

        const items =
          menu.filter(
            item =>
              item.meal_type === category
          );

        if (!items.length) {
          return "";
        }

        return `

          <div class="category">

            <h3>${escapeHtml(category)}</h3>

            <div class="cards">

              ${items
                .map(item => {

                  const image =
                    getFoodImage(item.name);

                  return `

                    <div class="card">

                      <img
                        src="${image}"
                        alt="${escapeHtml(item.name)}"
                        class="food-image"
                      >

                      <div class="card-content">

                        <h4>
                          ${escapeHtml(item.name)}
                        </h4>

                        <p>
                          ${
                            escapeHtml(
                              item.description ||
                              "Freshly prepared at Thulir Unavagam."
                            )
                          }
                        </p>

                        <div class="card-bottom">

                          <div class="price">
                            ₹${Number(
                              item.price
                            ).toFixed(0)}
                          </div>

                          <button
                            class="add"
                            onclick="addToCart(${item.food_id})"
                          >
                            Add to Cart
                          </button>

                        </div>

                      </div>

                    </div>

                  `;

                })
                .join("")}

            </div>

          </div>

        `;

      })
      .join("");

}


// ==========================================
// ADD FOOD TO CART
// ==========================================

function addToCart(foodId) {

  const item =
    menu.find(
      x =>
        x.food_id === foodId
    );

  if (!item) {

    alert("Food item not found.");

    return;

  }

  const existing =
    cart.find(
      x =>
        x.food_id === foodId
    );

  if (existing) {

    existing.qty++;

  } else {

    cart.push({

      food_id:
        item.food_id,

      name:
        item.name,

      price:
        Number(item.price),

      qty:
        1

    });

  }

  localStorage.setItem(
    "thulirCart",
    JSON.stringify(cart)
  );

  updateCartCount();

  alert(
    item.name +
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
// CUSTOMER PUSH NOTIFICATIONS
// ==========================================

async function enableNotifications() {

  const button = document.getElementById("notifyBtn");

  if (!button) {
    return;
  }

  try {

    // Check browser support
    if (!("Notification" in window)) {

      alert("This browser does not support notifications.");
      return;

    }

    if (!("serviceWorker" in navigator)) {

      alert("Service Worker is not supported by this browser.");
      return;

    }

    if (!("PushManager" in window)) {

      alert("Push notifications are not supported by this browser.");
      return;

    }


    // Ask permission
    const permission =
      await Notification.requestPermission();

    if (permission !== "granted") {

      alert(
        "Please allow notifications to receive new menu alerts."
      );

      return;

    }


    // Register service worker
    const registration =
      await navigator.serviceWorker.register("/sw.js");


    // Get VAPID public key
    const keyResponse =
      await fetch("/api/notifications/public-key");

    const keyData =
      await keyResponse.json();

    if (
      !keyResponse.ok ||
      !keyData.publicKey
    ) {

      throw new Error(
        "Notification public key is unavailable."
      );

    }


    // Check existing subscription
    let subscription =
      await registration.pushManager.getSubscription();


    // Create subscription if required
    if (!subscription) {

      subscription =
        await registration.pushManager.subscribe({

          userVisibleOnly: true,

          applicationServerKey:
            urlBase64ToUint8Array(
              keyData.publicKey
            )

        });

    }


    // Send subscription to server
    const response =
      await fetch(
        "/api/notifications/subscribe",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              subscription.toJSON()
            )

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Unable to enable notifications."
      );

    }


    button.textContent =
      "🔔 Notifications Enabled";

    button.disabled = true;

    alert(
      "Notifications enabled successfully!"
    );


  } catch (error) {

    console.error(
      "NOTIFICATION ERROR:",
      error
    );

    alert(
      error.message ||
      "Unable to enable notifications."
    );

  }

}


// ==========================================
// BASE64 → UINT8ARRAY
// ==========================================

function urlBase64ToUint8Array(
  base64String
) {

  const padding =
    "=".repeat(
      (4 - base64String.length % 4) % 4
    );

  const base64 =
    (
      base64String +
      padding
    )
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const rawData =
    window.atob(base64);

  return Uint8Array.from(
    [...rawData].map(
      char => char.charCodeAt(0)
    )
  );

}


// ==========================================
// REGISTER SERVICE WORKER
// ==========================================

if ("serviceWorker" in navigator) {

  window.addEventListener(
    "load",
    async () => {

      try {

        await navigator.serviceWorker.register(
          "/sw.js"
        );

        console.log(
          "Service Worker registered."
        );

      } catch (error) {

        console.error(
          "SERVICE WORKER ERROR:",
          error
        );

      }

    }
  );

}


// ==========================================
// NOTIFICATION BUTTON
// ==========================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const button =
      document.getElementById(
        "notifyBtn"
      );

    if (button) {

      button.addEventListener(
        "click",
        enableNotifications
      );

    }

  }
);