self.addEventListener("push", function (event) {

  let data = {};

  try {

    data =
      event.data
        ? event.data.json()
        : {};

  } catch (error) {

    data = {
      title: "🔔 Thulir Unavagam",
      body: "Today's menu is now available!"
    };

  }


  const title =
    data.title ||
    "🔔 Thulir Unavagam";


  const options = {

    body:
      data.body ||
      "Today's menu is now available!",

    icon:
      data.icon ||
      "/assets/logo.jpeg",

    badge:
      data.badge ||
      "/assets/logo.jpeg",

    data: {

      url:
        data.url ||
        "/"

    },

    vibrate: [
      200,
      100,
      200
    ]

  };


  event.waitUntil(

    self.registration.showNotification(
      title,
      options
    )

  );

});


// ==========================================
// WHEN CUSTOMER CLICKS NOTIFICATION
// ==========================================

self.addEventListener(
  "notificationclick",
  function (event) {

    event.notification.close();

    const url =
      event.notification.data &&
      event.notification.data.url
        ? event.notification.data.url
        : "/";


    event.waitUntil(

      clients.matchAll({
        type: "window",
        includeUncontrolled: true
      })

      .then(function (clientList) {

        for (
          const client of clientList
        ) {

          if (
            "focus" in client
          ) {

            client.navigate(url);

            return client.focus();

          }

        }


        if (
          clients.openWindow
        ) {

          return clients.openWindow(
            url
          );

        }

      })

    );

  }
);