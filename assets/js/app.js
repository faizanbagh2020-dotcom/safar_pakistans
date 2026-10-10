const DATA_PATHS = { destinations: "data/destinations.json", hotels: "data/hotels.json" };
const state = { destinations: [], hotels: [], destinationCategory: "all", destinationQuery: "", destinationLimit: 6, hotelQuery: "", hotelProvince: "", hotelContact: "all", hotelSort: "name", hotelLimit: 9, globalQuery: "" };
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const text = (value, fallback = "") => String(value ?? "").trim() || fallback;
const safeURL = value => { try { const u = new URL(value); return ["http:","https:"].includes(u.protocol) ? u.href : ""; } catch { return ""; } };
const hasCoords = item => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)) && item.latitude !== null && item.longitude !== null && Math.abs(Number(item.latitude)) <= 90 && Math.abs(Number(item.longitude)) <= 180;
const mapURL = item => safeURL(item.mapUrl) || (hasCoords(item) ? `https://www.google.com/maps?q=${Number(item.latitude)},${Number(item.longitude)}` : "");
const phoneHref = phone => { const digits = String(phone || "").replace(/[^\d+]/g, ""); return digits.replace(/\+/g, "").length >= 7 ? `tel:${digits}` : ""; };
const images = [
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1000&q=80"
];
const destinationImage = (d, i) => d.image || images[(i * 3 + 1) % images.length];
let toastTimer;
function showToast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2600); }

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
  return response.json();
}
async function init() {
  $("#year").textContent = new Date().getFullYear();
  setupNavigation();
  setupReveal();
  setupControls();
  const [destResult, hotelResult] = await Promise.allSettled([loadJSON(DATA_PATHS.destinations), loadJSON(DATA_PATHS.hotels)]);
  if (destResult.status === "fulfilled") state.destinations = destResult.value;
  if (hotelResult.status === "fulfilled") state.hotels = hotelResult.value;
  $("#destinationCount").textContent = state.destinations.length.toLocaleString();
  $("#hotelCount").textContent = state.hotels.length.toLocaleString();
  if (destResult.status === "rejected") $("#destinationGrid").innerHTML = errorCard("Destinations could not be loaded", "Run the website through a local server and make sure data/destinations.json exists.");
  else renderDestinations();
  if (hotelResult.status === "rejected") $("#hotelGrid").innerHTML = errorCard("Accommodation data could not be loaded", "Make sure data/hotels.json exists and the website is running through a local server.");
  else { populateProvinces(); renderHotels(); }
  renderMapPlaces();
  renderCategoryChips();
  setupGlobalSearch();
}
function errorCard(title, message) { return `<div class="empty-state"><h3>${escapeHTML(title)}</h3><p>${escapeHTML(message)}</p></div>`; }
function setupNavigation() {
  const toggle = $("#menuToggle"), links = $("#navLinks"), header = $(".site-header");
  toggle.addEventListener("click", () => { const open = links.classList.toggle("open"); toggle.setAttribute("aria-expanded", String(open)); toggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu"); });
  $$("#navLinks a").forEach(a => a.addEventListener("click", () => { links.classList.remove("open"); toggle.setAttribute("aria-expanded","false"); }));
  window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 10), { passive: true });
}
function setupReveal() {
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { $$(".reveal").forEach(el => el.classList.add("visible")); return; }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); } }), { threshold: .12 });
  $$(".reveal").forEach(el => observer.observe(el));
}
function setupControls() {
  $("#destinationQuery").addEventListener("input", e => { state.destinationQuery = e.target.value.trim().toLowerCase(); state.destinationLimit = 6; renderDestinations(); });
  $("#categoryChips").addEventListener("click", e => { const btn = e.target.closest("[data-category]"); if (!btn) return; state.destinationCategory = btn.dataset.category; $$("#categoryChips .chip").forEach(chip => chip.classList.toggle("active", chip === btn)); state.destinationLimit = 6; renderDestinations(); });
  $("#loadMoreDestinations").addEventListener("click", () => { state.destinationLimit += 6; renderDestinations(); });
  $("#hotelQuery").addEventListener("input", e => { state.hotelQuery = e.target.value.trim().toLowerCase(); state.hotelLimit = 9; renderHotels(); });
  $("#provinceFilter").addEventListener("change", e => { state.hotelProvince = e.target.value; state.hotelLimit = 9; renderHotels(); });
  $("#contactFilter").addEventListener("change", e => { state.hotelContact = e.target.value; state.hotelLimit = 9; renderHotels(); });
  $("#hotelSort").addEventListener("change", e => { state.hotelSort = e.target.value; renderHotels(); });
  $("#clearHotelFilters").addEventListener("click", () => { state.hotelQuery = ""; state.hotelProvince = ""; state.hotelContact = "all"; state.hotelSort = "name"; state.hotelLimit = 9; $("#hotelQuery").value = ""; $("#provinceFilter").value = ""; $("#contactFilter").value = "all"; $("#hotelSort").value = "name"; renderHotels(); });
  $("#loadMoreHotels").addEventListener("click", () => { state.hotelLimit += 9; renderHotels(); });
  $("#dialogClose").addEventListener("click", () => $("#detailDialog").close());
  $("#detailDialog").addEventListener("click", e => { if (e.target === $("#detailDialog")) $("#detailDialog").close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#detailDialog").open) $("#detailDialog").close(); });
  $("#destinationGrid").addEventListener("click", e => { const card = e.target.closest("[data-destination-id]"); if (card) openDestination(card.dataset.destinationId); });
  $("#hotelGrid").addEventListener("click", e => { const btn = e.target.closest("[data-hotel-detail]"); if (btn) openHotel(btn.dataset.hotelDetail); });
}
function renderCategoryChips() {
  const categories = [...new Set(state.destinations.map(d => text(d.category)).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  $("#categoryChips").innerHTML = `<button class="chip ${state.destinationCategory==="all"?"active":""}" data-category="all">All places</button>` + categories.map(c => `<button class="chip ${state.destinationCategory===c?"active":""}" data-category="${escapeHTML(c)}">${escapeHTML(c)}</button>`).join("");
}
function destinationMatches() {
  return state.destinations.filter(d => {
    const catOk = state.destinationCategory === "all" || text(d.category) === state.destinationCategory;
    const hay = [d.name,d.description,d.category,d.district].join(" ").toLowerCase();
    return catOk && (!state.destinationQuery || hay.includes(state.destinationQuery));
  });
}
function renderDestinations() {
  const results = destinationMatches(), visible = results.slice(0, state.destinationLimit);
  $("#destinationResults").textContent = `${results.length.toLocaleString()} destination${results.length===1?"":"s"} found`;
  $("#loadMoreDestinations").hidden = visible.length >= results.length;
  if (!visible.length) { $("#destinationGrid").innerHTML = errorCard("No places found", "Try another keyword or select “All places”."); return; }
  $("#destinationGrid").innerHTML = visible.map((d,i) => {
    const img = destinationImage(d, state.destinations.indexOf(d));
    const description = text(d.description, "Explore this destination and discover what makes it special.");
    return `<article class="destination-card" role="button" tabindex="0" data-destination-id="${escapeHTML(d.id)}" aria-label="View ${escapeHTML(d.name)} details"><div class="destination-photo" style="background-image:url('${escapeHTML(img)}')"></div><div class="destination-content"><span class="destination-tag">${escapeHTML(text(d.category,"Destination"))}${d.district ? " · "+escapeHTML(d.district):""}</span><h3>${escapeHTML(d.name)}</h3><p>${escapeHTML(description)}</p><span class="destination-open">Discover this place <span>↗</span></span></div></article>`;
  }).join("");
  $("#destinationGrid").querySelectorAll(".destination-card").forEach(card => card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDestination(card.dataset.destinationId); } }));
}
function populateProvinces() {
  const provinces = [...new Set(state.hotels.map(h => text(h.stateOrProvince)).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  $("#provinceFilter").innerHTML = `<option value="">All provinces / regions</option>` + provinces.map(p => `<option value="${escapeHTML(p)}">${escapeHTML(p)}</option>`).join("");
}
function filteredHotels() {
  let arr = state.hotels.filter(h => {
    const hay = [h.name,h.address,h.city,h.stateOrProvince,h.category,h.phone].join(" ").toLowerCase();
    if (state.hotelQuery && !hay.includes(state.hotelQuery)) return false;
    if (state.hotelProvince && h.stateOrProvince !== state.hotelProvince) return false;
    if (state.hotelContact === "phone" && !phoneHref(h.phone)) return false;
    if (state.hotelContact === "website" && !safeURL(h.website)) return false;
    if (state.hotelContact === "map" && !mapURL(h)) return false;
    return true;
  });
  arr.sort((a,b) => state.hotelSort === "name-desc" ? text(b.name).localeCompare(text(a.name)) : state.hotelSort === "contact" ? ((Number(!!phoneHref(b.phone))+Number(!!safeURL(b.website))+Number(!!mapURL(b))) - (Number(!!phoneHref(a.phone))+Number(!!safeURL(a.website))+Number(!!mapURL(a)))) || text(a.name).localeCompare(text(b.name)) : text(a.name).localeCompare(text(b.name)));
  return arr;
}
function renderHotels() {
  const results = filteredHotels(), visible = results.slice(0,state.hotelLimit);
  $("#hotelResults").textContent = `${results.length.toLocaleString()} accommodation listings match your search`;
  $("#loadMoreHotels").hidden = visible.length >= results.length;
  if (!visible.length) { $("#hotelGrid").innerHTML = errorCard("No stays match those filters", "Try a different hotel name, city, or filter."); return; }
  $("#hotelGrid").innerHTML = visible.map(h => {
    const phone = phoneHref(h.phone), website = safeURL(h.website), map = mapURL(h);
    const location = [h.city,h.stateOrProvince].filter(Boolean).join(", ");
    const contactBits = [
      phone ? `<div class="contact-line"><span class="contact-icon">↗</span><a href="${escapeHTML(phone)}">${escapeHTML(h.phone)}</a></div>` : "",
      website ? `<div class="contact-line"><span class="contact-icon">⌁</span><a href="${escapeHTML(website)}" target="_blank" rel="noopener noreferrer">Official website</a></div>` : "",
      h.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(h.email) ? `<div class="contact-line"><span class="contact-icon">@</span><a href="mailto:${escapeHTML(h.email)}">${escapeHTML(h.email)}</a></div>` : ""
    ].filter(Boolean).join("");
    return `<article class="hotel-card"><div class="hotel-card-top"><span class="hotel-category">${escapeHTML(text(h.category,"Accommodation"))}</span></div><h3>${escapeHTML(h.name)}</h3><p class="hotel-location"><span>⌖</span><span>${escapeHTML(text(h.address,"Address not available"))}${location ? `<br>${escapeHTML(location)}`:""}</span></p><div class="hotel-contact">${contactBits || `<div class="contact-line"><span class="contact-icon">i</span><span>Contact details not available in the supplied dataset.</span></div>`}</div><div class="hotel-actions">${map ? `<a class="mini-action primary" href="${escapeHTML(map)}" target="_blank" rel="noopener noreferrer">View on map ↗</a>`:""}<button class="mini-action" data-hotel-detail="${escapeHTML(h.id)}">View details</button></div></article>`;
  }).join("");
}
function renderMapPlaces() {
  const destinations = state.destinations.filter(hasCoords).slice(0,4).map(d=>({name:d.name,type:"Destination",url:mapURL(d),color:"#b98f4e",district:d.district}));
  const hotels = state.hotels.filter(hasCoords).slice(0,4).map(h=>({name:h.name,type:"Accommodation",url:mapURL(h),color:"#2e7155",district:h.city}));
  const places = [...destinations,...hotels].slice(0,8);
  $("#mapPlaces").innerHTML = places.length ? places.map(p=>`<div class="map-place"><span style="background:${p.color}"></span><div><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(p.type)}${p.district?" · "+escapeHTML(p.district):""}</small></div>${p.url?`<a href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open map for ${escapeHTML(p.name)}">↗</a>`:""}</div>`).join("") : `<p>No usable coordinates are available in the current dataset.</p>`;
}
function openDestination(id) {
  const d = state.destinations.find(item => String(item.id) === String(id)); if (!d) return;
  const img = destinationImage(d, state.destinations.indexOf(d));
  const map = mapURL(d);
  $("#dialogContent").innerHTML = `<div class="dialog-hero" style="background-image:url('${escapeHTML(img)}')"><h2 id="dialogTitle">${escapeHTML(d.name)}</h2></div><div class="dialog-body"><p class="eyebrow">${escapeHTML(text(d.category,"Destination"))}${d.district?" · "+escapeHTML(d.district):""}</p><p>${escapeHTML(text(d.description,"No description is available for this destination in the supplied dataset."))}</p><div class="dialog-facts">${d.district?`<div class="dialog-fact"><small>District / region</small><strong>${escapeHTML(d.district)}</strong></div>`:""}${hasCoords(d)?`<div class="dialog-fact"><small>Coordinates</small><strong>${Number(d.latitude).toFixed(4)}, ${Number(d.longitude).toFixed(4)}</strong></div>`:""}</div>${map?`<a class="button button-green" href="${escapeHTML(map)}" target="_blank" rel="noopener noreferrer">Open location in maps ↗</a>`:""}</div>`;
  $("#detailDialog").showModal();
}
function openHotel(id) {
  const h = state.hotels.find(item => String(item.id) === String(id)); if (!h) return;
  const website = safeURL(h.website), phone = phoneHref(h.phone), map = mapURL(h);
  const facts = [["Category",h.category],["Address",h.address],["City",h.city],["Province / region",h.stateOrProvince],["Phone",h.phone],["Email",h.email],["Coordinates",hasCoords(h)?`${h.latitude}, ${h.longitude}`:""],["Source dataset",h.sourceDataset]];
  $("#dialogContent").innerHTML = `<div class="dialog-hero" style="background-image:linear-gradient(0deg,rgba(10,30,23,.25),rgba(10,30,23,.05)),url('${images[2]}')"><h2 id="dialogTitle">${escapeHTML(h.name)}</h2></div><div class="dialog-body"><p class="eyebrow">ACCOMMODATION DETAILS</p><div class="dialog-facts">${facts.filter(([k,v])=>text(v)).map(([k,v])=>`<div class="dialog-fact"><small>${escapeHTML(k)}</small><strong>${escapeHTML(v)}</strong></div>`).join("")}</div><p class="fine-print">Contact information is based on the supplied dataset and may be incomplete or out of date. Please confirm details directly.</p><div class="hotel-actions">${phone?`<a class="button button-green" href="${escapeHTML(phone)}">Call hotel</a>`:""}${website?`<a class="button button-outline" href="${escapeHTML(website)}" target="_blank" rel="noopener noreferrer">Visit website ↗</a>`:""}${map?`<a class="button button-outline" href="${escapeHTML(map)}" target="_blank" rel="noopener noreferrer">Open map ↗</a>`:""}${h.email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(h.email)?`<a class="button button-outline" href="mailto:${escapeHTML(h.email)}">Email hotel</a>`:""}</div></div>`;
  $("#detailDialog").showModal();
}
function setupGlobalSearch() {
  $("#globalSearch").addEventListener("submit", e => {
    e.preventDefault();
    const q = $("#globalQuery").value.trim(), type = $("#globalType").value;
    if (!q) { showToast("Enter a destination, city or hotel name to search."); return; }
    if (type === "destinations" || type === "all") {
      state.destinationQuery = q.toLowerCase(); $("#destinationQuery").value = q; state.destinationCategory = "all"; state.destinationLimit = 6; renderCategoryChips(); renderDestinations();
    }
    if (type === "hotels" || type === "all") { state.hotelQuery = q.toLowerCase(); $("#hotelQuery").value = q; state.hotelLimit = 9; renderHotels(); }
    const target = type === "hotels" ? "#hotels" : type === "destinations" ? "#destinations" : "#destinations";
    document.querySelector(target).scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    if (type === "all") showToast("Showing matching destinations and accommodation listings.");
  });
}
document.addEventListener("DOMContentLoaded", init);
