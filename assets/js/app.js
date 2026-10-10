
function decodeHotelName(name) {
  if (typeof name !== "string") return "";

  let decoded = name.trim();

  // Decode URL-encoded text safely, including repeated encoding.
  for (let i = 0; i < 3; i++) {
    try {
      const safeEncoded = decoded.replace(/%(?![0-9a-f]{2})/gi, "%25");
      const next = decodeURIComponent(safeEncoded);

      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }

  return decoded
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .trim();
}

function normalizeHotel(hotel) {
  return {
    ...hotel,
    name: decodeHotelName(hotel.name),
    address: decodeHotelName(hotel.address),
    city: decodeHotelName(hotel.city),
    stateOrProvince: decodeHotelName(hotel.stateOrProvince),
    category: decodeHotelName(hotel.category)
  };
}

const DATA_PATHS = {
  destinations: "data/destinations.json",
  hotels: "data/hotels.json"
};

const state = {
  destinations: [],
  hotels: [],
  destinationCategory: "all",
  destinationQuery: "",
  destinationLimit: 6,
  hotelQuery: "",
  hotelProvince: "",
  hotelContact: "all",
  hotelSort: "name",
  hotelLimit: 9,
  globalQuery: ""
};

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

const text = (value, fallback = "") =>
  String(value ?? "").trim() || fallback;

const safeURL = value => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol)
      ? url.href
      : "";
  } catch {
    return "";
  }
};

const hasCoords = item =>
  Number.isFinite(Number(item.latitude)) &&
  Number.isFinite(Number(item.longitude)) &&
  item.latitude !== null &&
  item.longitude !== null &&
  Math.abs(Number(item.latitude)) <= 90 &&
  Math.abs(Number(item.longitude)) <= 180;

const mapURL = item =>
  safeURL(item.mapUrl) ||
  (hasCoords(item)
    ? `https://www.google.com/maps?q=${Number(item.latitude)},${Number(item.longitude)}`
    : "");

const phoneHref = phone => {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  return digits.replace(/\+/g, "").length >= 7
    ? `tel:${digits}`
    : "";
};

const images = [
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1000&q=80"
];

const destinationImage = (destination, index) =>
  destination.image || images[(index * 3 + 1) % images.length];

let toastTimer;

function showToast(message) {
  const element = $("#toast");
  if (!element) return;

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    element.classList.remove("show");
  }, 2600);
}

async function loadJSON(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Could not load ${path} (${response.status})`);
  }

  return response.json();
}

async function init() {
  $("#year").textContent = new Date().getFullYear();

  setupNavigation();
  setupReveal();
  setupControls();

  const [destinationResult, hotelResult] =
    await Promise.allSettled([
      loadJSON(DATA_PATHS.destinations),
      loadJSON(DATA_PATHS.hotels)
    ]);

  if (destinationResult.status === "fulfilled") {
    state.destinations = destinationResult.value;
  }

  if (hotelResult.status === "fulfilled") {
    // IMPORTANT: Normalize hotel names when data loads.
    state.hotels = hotelResult.value.map(normalizeHotel);
  }

  $("#destinationCount").textContent =
    state.destinations.length.toLocaleString();

  $("#hotelCount").textContent =
    state.hotels.length.toLocaleString();

  if (destinationResult.status === "rejected") {
    $("#destinationGrid").innerHTML = errorCard(
      "Destinations could not be loaded",
      "Make sure data/destinations.json exists and the website is running through a server."
    );
  } else {
    renderDestinations();
  }

  if (hotelResult.status === "rejected") {
    $("#hotelGrid").innerHTML = errorCard(
      "Accommodation data could not be loaded",
      "Make sure data/hotels.json exists and the website is running through a server."
    );
  } else {
    populateProvinces();
    renderHotels();
  }

  renderMapPlaces();
  renderCategoryChips();
  setupGlobalSearch();
}

function errorCard(title, message) {
  return `
    <div class="empty-state">
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}

function setupNavigation() {
  const toggle = $("#menuToggle");
  const links = $("#navLinks");
  const header = $(".site-header");

  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");

    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "Close navigation menu" : "Open navigation menu"
    );
  });

  $$("#navLinks a").forEach(link => {
    link.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  window.addEventListener(
    "scroll",
    () => {
      header.classList.toggle("scrolled", window.scrollY > 10);
    },
    { passive: true }
  );
}

function setupReveal() {
  if (
    !("IntersectionObserver" in window) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    $$(".reveal").forEach(element => {
      element.classList.add("visible");
    });
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  $$(".reveal").forEach(element => observer.observe(element));
}

function setupControls() {
  $("#destinationQuery").addEventListener("input", event => {
    state.destinationQuery = event.target.value.trim().toLowerCase();
    state.destinationLimit = 6;
    renderDestinations();
  });

  $("#categoryChips").addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;

    state.destinationCategory = button.dataset.category;

    $$("#categoryChips .chip").forEach(chip => {
      chip.classList.toggle("active", chip === button);
    });

    state.destinationLimit = 6;
    renderDestinations();
  });

  $("#loadMoreDestinations").addEventListener("click", () => {
    state.destinationLimit += 6;
    renderDestinations();
  });

  $("#hotelQuery").addEventListener("input", event => {
    state.hotelQuery = event.target.value.trim().toLowerCase();
    state.hotelLimit = 9;
    renderHotels();
  });

  $("#provinceFilter").addEventListener("change", event => {
    state.hotelProvince = event.target.value;
    state.hotelLimit = 9;
    renderHotels();
  });

  $("#contactFilter").addEventListener("change", event => {
    state.hotelContact = event.target.value;
    state.hotelLimit = 9;
    renderHotels();
  });

  $("#hotelSort").addEventListener("change", event => {
    state.hotelSort = event.target.value;
    renderHotels();
  });

  $("#clearHotelFilters").addEventListener("click", () => {
    state.hotelQuery = "";
    state.hotelProvince = "";
    state.hotelContact = "all";
    state.hotelSort = "name";
    state.hotelLimit = 9;

    $("#hotelQuery").value = "";
    $("#provinceFilter").value = "";
    $("#contactFilter").value = "all";
    $("#hotelSort").value = "name";

    renderHotels();
  });

  $("#loadMoreHotels").addEventListener("click", () => {
    state.hotelLimit += 9;
    renderHotels();
  });

  $("#dialogClose").addEventListener("click", () => {
    $("#detailDialog").close();
  });

  $("#detailDialog").addEventListener("click", event => {
    if (event.target === $("#detailDialog")) {
      $("#detailDialog").close();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && $("#detailDialog").open) {
      $("#detailDialog").close();
    }
  });

  $("#destinationGrid").addEventListener("click", event => {
    const card = event.target.closest("[data-destination-id]");
    if (card) openDestination(card.dataset.destinationId);
  });

  $("#hotelGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-hotel-detail]");
    if (button) openHotel(button.dataset.hotelDetail);
  });
}

function renderCategoryChips() {
  const categories = [
    ...new Set(
      state.destinations
        .map(destination => text(destination.category))
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));

  $("#categoryChips").innerHTML =
    `<button class="chip ${state.destinationCategory === "all" ? "active" : ""}" data-category="all">All places</button>` +
    categories.map(category => `
      <button
        class="chip ${state.destinationCategory === category ? "active" : ""}"
        data-category="${escapeHTML(category)}"
      >${escapeHTML(category)}</button>
    `).join("");
}

function destinationMatches() {
  return state.destinations.filter(destination => {
    const categoryMatches =
      state.destinationCategory === "all" ||
      text(destination.category) === state.destinationCategory;

    const searchableText = [
      destination.name,
      destination.description,
      destination.category,
      destination.district
    ].join(" ").toLowerCase();

    return categoryMatches &&
      (!state.destinationQuery ||
        searchableText.includes(state.destinationQuery));
  });
}

function renderDestinations() {
  const results = destinationMatches();
  const visible = results.slice(0, state.destinationLimit);

  $("#destinationResults").textContent =
    `${results.length.toLocaleString()} destination${results.length === 1 ? "" : "s"} found`;

  $("#loadMoreDestinations").hidden = visible.length >= results.length;

  if (!visible.length) {
    $("#destinationGrid").innerHTML = errorCard(
      "No places found",
      "Try another keyword or select “All places”."
    );
    return;
  }

  $("#destinationGrid").innerHTML = visible.map(destination => {
    const image = destinationImage(
      destination,
      state.destinations.indexOf(destination)
    );

    const description = text(
      destination.description,
      "Explore this destination and discover what makes it special."
    );

    return `
      <article
        class="destination-card"
        role="button"
        tabindex="0"
        data-destination-id="${escapeHTML(destination.id)}"
        aria-label="View ${escapeHTML(destination.name)} details"
      >
        <div
          class="destination-photo"
          style="background-image:url('${escapeHTML(image)}')"
        ></div>
        <div class="destination-content">
          <span class="destination-tag">
            ${escapeHTML(text(destination.category, "Destination"))}
            ${destination.district ? " · " + escapeHTML(destination.district) : ""}
          </span>
          <h3>${escapeHTML(destination.name)}</h3>
          <p>${escapeHTML(description)}</p>
          <span class="destination-open">
            Discover this place <span>↗</span>
          </span>
        </div>
      </article>
    `;
  }).join("");

  $("#destinationGrid")
    .querySelectorAll(".destination-card")
    .forEach(card => {
      card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDestination(card.dataset.destinationId);
        }
      });
    });
}

function populateProvinces() {
  const provinces = [
    ...new Set(
      state.hotels
        .map(hotel => text(hotel.stateOrProvince))
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));

  $("#provinceFilter").innerHTML =
    `<option value="">All provinces / regions</option>` +
    provinces.map(province => `
      <option value="${escapeHTML(province)}">
        ${escapeHTML(province)}
      </option>
    `).join("");
}

function filteredHotels() {
  let hotels = state.hotels.filter(hotel => {
    const searchableText = [
      hotel.name,
      hotel.address,
      hotel.city,
      hotel.stateOrProvince,
      hotel.category,
      hotel.phone
    ].join(" ").toLowerCase();

    if (
      state.hotelQuery &&
      !searchableText.includes(state.hotelQuery)
    ) return false;

    if (
      state.hotelProvince &&
      hotel.stateOrProvince !== state.hotelProvince
    ) return false;

    if (state.hotelContact === "phone" && !phoneHref(hotel.phone)) {
      return false;
    }

    if (state.hotelContact === "website" && !safeURL(hotel.website)) {
      return false;
    }

    if (state.hotelContact === "map" && !mapURL(hotel)) {
      return false;
    }

    return true;
  });

  hotels.sort((a, b) => {
    if (state.hotelSort === "name-desc") {
      return text(b.name).localeCompare(text(a.name));
    }

    if (state.hotelSort === "contact") {
      const contactsA =
        Number(!!phoneHref(a.phone)) +
        Number(!!safeURL(a.website)) +
        Number(!!mapURL(a));

      const contactsB =
        Number(!!phoneHref(b.phone)) +
        Number(!!safeURL(b.website)) +
        Number(!!mapURL(b));

      return contactsB - contactsA ||
        text(a.name).localeCompare(text(b.name));
    }

    return text(a.name).localeCompare(text(b.name));
  });

  return hotels;
}

function renderHotels() {
  const results = filteredHotels();
  const visible = results.slice(0, state.hotelLimit);

  $("#hotelResults").textContent =
    `${results.length.toLocaleString()} accommodation listings match your search`;

  $("#loadMoreHotels").hidden = visible.length >= results.length;

  if (!visible.length) {
    $("#hotelGrid").innerHTML = errorCard(
      "No stays match those filters",
      "Try a different hotel name, city, or filter."
    );
    return;
  }

  $("#hotelGrid").innerHTML = visible.map(hotel => {
    const phone = phoneHref(hotel.phone);
    const website = safeURL(hotel.website);
    const map = mapURL(hotel);

    const location = [
      hotel.city,
      hotel.stateOrProvince
    ].filter(Boolean).join(", ");

    const contactBits = [
      phone
        ? `<div class="contact-line"><span class="contact-icon">↗</span><a href="${escapeHTML(phone)}">${escapeHTML(hotel.phone)}</a></div>`
        : "",

      website
        ? `<div class="contact-line"><span class="contact-icon">⌁</span><a href="${escapeHTML(website)}" target="_blank" rel="noopener noreferrer">Official website</a></div>`
        : "",

      hotel.email &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hotel.email)
        ? `<div class="contact-line"><span class="contact-icon">@</span><a href="mailto:${escapeHTML(hotel.email)}">${escapeHTML(hotel.email)}</a></div>`
        : ""
    ].filter(Boolean).join("");

    return `
      <article class="hotel-card">
        <div class="hotel-card-top">
          <span class="hotel-category">
            ${escapeHTML(text(hotel.category, "Accommodation"))}
          </span>
        </div>

        <h3>${escapeHTML(decodeHotelName(hotel.name))}</h3>

        <p class="hotel-location">
          <span>⌖</span>
          <span>
            ${escapeHTML(text(hotel.address, "Address not available"))}
            ${location ? `<br>${escapeHTML(location)}` : ""}
          </span>
        </p>

        <div class="hotel-contact">
          ${contactBits || `
            <div class="contact-line">
              <span class="contact-icon">i</span>
              <span>Contact details not available in the supplied dataset.</span>
            </div>
          `}
        </div>

        <div class="hotel-actions">
          ${map ? `
            <a
              class="mini-action primary"
              href="${escapeHTML(map)}"
              target="_blank"
              rel="noopener noreferrer"
            >View on map ↗</a>
          ` : ""}

          <button
            class="mini-action"
            data-hotel-detail="${escapeHTML(hotel.id)}"
          >View details</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderMapPlaces() {
  const destinations = state.destinations
    .filter(hasCoords)
    .slice(0, 4)
    .map(destination => ({
      name: destination.name,
      type: "Destination",
      url: mapURL(destination),
      color: "#b98f4e",
      district: destination.district
    }));

  const hotels = state.hotels
    .filter(hasCoords)
    .slice(0, 4)
    .map(hotel => ({
      name: decodeHotelName(hotel.name),
      type: "Accommodation",
      url: mapURL(hotel),
      color: "#2e7155",
      district: hotel.city
    }));

  const places = [...destinations, ...hotels].slice(0, 8);

  $("#mapPlaces").innerHTML = places.length
    ? places.map(place => `
        <div class="map-place">
          <span style="background:${place.color}"></span>
          <div>
            <strong>${escapeHTML(place.name)}</strong>
            <small>
              ${escapeHTML(place.type)}
              ${place.district ? " · " + escapeHTML(place.district) : ""}
            </small>
          </div>
          ${place.url ? `
            <a
              href="${escapeHTML(place.url)}"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open map for ${escapeHTML(place.name)}"
            >↗</a>
          ` : ""}
        </div>
      `).join("")
    : "<p>No usable coordinates are available in the current dataset.</p>";
}

function openDestination(id) {
  const destination = state.destinations.find(
    item => String(item.id) === String(id)
  );

  if (!destination) return;

  const image = destinationImage(
    destination,
    state.destinations.indexOf(destination)
  );

  const map = mapURL(destination);

  $("#dialogContent").innerHTML = `
    <div
      class="dialog-hero"
      style="background-image:url('${escapeHTML(image)}')"
    >
      <h2 id="dialogTitle">${escapeHTML(destination.name)}</h2>
    </div>

    <div class="dialog-body">
      <p class="eyebrow">
        ${escapeHTML(text(destination.category, "Destination"))}
        ${destination.district ? " · " + escapeHTML(destination.district) : ""}
      </p>

      <p>
        ${escapeHTML(text(
          destination.description,
          "No description is available for this destination in the supplied dataset."
        ))}
      </p>

      <div class="dialog-facts">
        ${destination.district ? `
          <div class="dialog-fact">
            <small>District / region</small>
            <strong>${escapeHTML(destination.district)}</strong>
          </div>
        ` : ""}

        ${hasCoords(destination) ? `
          <div class="dialog-fact">
            <small>Coordinates</small>
            <strong>
              ${Number(destination.latitude).toFixed(4)},
              ${Number(destination.longitude).toFixed(4)}
            </strong>
          </div>
        ` : ""}
      </div>

      ${map ? `
        <a
          class="button button-green"
          href="${escapeHTML(map)}"
          target="_blank"
          rel="noopener noreferrer"
        >Open location in maps ↗</a>
      ` : ""}
    </div>
  `;

  $("#detailDialog").showModal();
}

function openHotel(id) {
  const hotel = state.hotels.find(
    item => String(item.id) === String(id)
  );

  if (!hotel) return;

  const website = safeURL(hotel.website);
  const phone = phoneHref(hotel.phone);
  const map = mapURL(hotel);

  const facts = [
    ["Category", hotel.category],
    ["Address", hotel.address],
    ["City", hotel.city],
    ["Province / region", hotel.stateOrProvince],
    ["Phone", hotel.phone],
    ["Email", hotel.email],
    [
      "Coordinates",
      hasCoords(hotel)
        ? `${hotel.latitude}, ${hotel.longitude}`
        : ""
    ],
    ["Source dataset", hotel.sourceDataset]
  ];

  $("#dialogContent").innerHTML = `
    <div
      class="dialog-hero"
      style="background-image:linear-gradient(0deg,rgba(10,30,23,.25),rgba(10,30,23,.05)),url('${images[2]}')"
    >
      <h2 id="dialogTitle">${escapeHTML(decodeHotelName(hotel.name))}</h2>
    </div>

    <div class="dialog-body">
      <p class="eyebrow">ACCOMMODATION DETAILS</p>

      <div class="dialog-facts">
        ${facts.filter(([, value]) => text(value)).map(([label, value]) => `
          <div class="dialog-fact">
            <small>${escapeHTML(label)}</small>
            <strong>${escapeHTML(value)}</strong>
          </div>
        `).join("")}
      </div>

      <p class="fine-print">
        Contact information is based on the supplied dataset and may be
        incomplete or out of date. Please confirm details directly.
      </p>

      <div class="hotel-actions">
        ${phone ? `
          <a class="button button-green" href="${escapeHTML(phone)}">
            Call hotel
          </a>
        ` : ""}

        ${website ? `
          <a
            class="button button-outline"
            href="${escapeHTML(website)}"
            target="_blank"
            rel="noopener noreferrer"
          >Visit website ↗</a>
        ` : ""}

        ${map ? `
          <a
            class="button button-outline"
            href="${escapeHTML(map)}"
            target="_blank"
            rel="noopener noreferrer"
          >Open map ↗</a>
        ` : ""}

        ${hotel.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hotel.email) ? `
          <a class="button button-outline" href="mailto:${escapeHTML(hotel.email)}">
            Email hotel
          </a>
        ` : ""}
      </div>
    </div>
  `;

  $("#detailDialog").showModal();
}

function setupGlobalSearch() {
  $("#globalSearch").addEventListener("submit", event => {
    event.preventDefault();

    const query = $("#globalQuery").value.trim();
    const type = $("#globalType").value;

    if (!query) {
      showToast("Enter a destination, city or hotel name to search.");
      return;
    }

    if (type === "destinations" || type === "all") {
      state.destinationQuery = query.toLowerCase();
      $("#destinationQuery").value = query;
      state.destinationCategory = "all";
      state.destinationLimit = 6;

      renderCategoryChips();
      renderDestinations();
    }

    if (type === "hotels" || type === "all") {
      state.hotelQuery = query.toLowerCase();
      $("#hotelQuery").value = query;
      state.hotelLimit = 9;

      renderHotels();
    }

    const target = type === "hotels"
      ? "#hotels"
      : "#destinations";

    document.querySelector(target).scrollIntoView({
      behavior: window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches ? "auto" : "smooth"
    });

    if (type === "all") {
      showToast("Showing matching destinations and accommodation listings.");
    }
  });
}
document.addEventListener("DOMContentLoaded", init);
