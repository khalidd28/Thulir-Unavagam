document
  .getElementById("adminLoginForm")
  .addEventListener("submit", async function (event) {

    event.preventDefault();

    const username =
      document
        .getElementById("adminUsername")
        .value
        .trim();

    const password =
      document
        .getElementById("adminPassword")
        .value;

    const message =
      document.getElementById("loginMessage");

    try {

      const response = await fetch("/api/admin/login", {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        credentials: "same-origin",

        body: JSON.stringify({
          username,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed."
        );
      }

      // Keep frontend login state
      sessionStorage.setItem(
        "adminLoggedIn",
        "true"
      );

      // Go to admin dashboard
      window.location.href = "admin.html";

    } catch (error) {

      message.textContent =
        "❌ " + error.message;

    }

  });