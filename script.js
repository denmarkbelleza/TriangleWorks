// ===== Shared helpers =====
const peso = (n) => "₱" + n.toLocaleString("en-PH");
const getCart = () => JSON.parse(localStorage.getItem("tw-cart") || "[]");
const saveCart = (c) => {
  localStorage.setItem("tw-cart", JSON.stringify(c));
  updateBadge();
};
const loadFrames = () => fetch("frames.json").then((r) => r.json());
const $ = (s) => document.querySelector(s);

function updateBadge() {
  const el = $("#cart-count");
  if (el) el.textContent = getCart().reduce((t, i) => t + i.qty, 0);
}

// Header and footer are injected so every page shares one copy
function buildLayout() {
  const page = document.body.dataset.page;
  const links = [
    ["index", "Home"],
    ["shop", "Shop"],
    ["fit", "Fit Guide"],
    ["contact", "Contact"],
    ["cart", "Cart"],
  ];
  $("#site-header").innerHTML =
    `<div class="bar"><a class="logo" href="index.html">Triangle<span>Works</span></a><nav>` +
    links
      .map(
        ([p, t]) =>
          `<a href="${p}.html" class="${p === page ? "on" : ""}">${t}${p === "cart" ? ' <span class="badge" id="cart-count">0</span>' : ""}</a>`,
      )
      .join("") +
    `</nav></div>`;
  $("#site-footer").textContent = "© 2026 Triangle Works. Bike frame studio.";
  updateBadge();
}

// The same frame in a different size is a separate cart item
function addToCart(id, size) {
  const cart = getCart(),
    item = cart.find((i) => i.id === id && i.size === size);
  item ? item.qty++ : cart.push({ id, size, qty: 1 });
  saveCart(cart);
}

function frameCard(f, withButton = true) {
  const picker = withButton
    ? `<select class="size-pick" data-for="${f.id}" aria-label="Select size"><option value="">Select size</option>${f.sizes.map((s) => `<option>${s}</option>`).join("")}</select><p class="err" id="err-${f.id}"></p>`
    : "";
  return (
    `<article class="card"><img src="${f.image}" alt="${f.name}" loading="lazy"><span class="tag">${f.type} · ${f.material}</span><h3>${f.name}</h3><p>${f.desc}</p><p class="price">${peso(f.price)}</p>${picker}` +
    (withButton
      ? `<button class="btn" data-add="${f.id}">Add to cart</button>`
      : `<p>Sizes: ${f.sizes.join(", ")}</p>`) +
    `</article>`
  );
}

// ===== Home: featured frames =====
async function initHome() {
  const frames = await loadFrames();
  $("#featured").innerHTML = frames
    .slice(0, 3)
    .map((f) => frameCard(f, false))
    .join("");
}

// ===== Shop: search, filter, sort =====
async function initShop() {
  const frames = await loadFrames();
  const size = new URLSearchParams(location.search).get("size");
  if (size) $("#size").value = size;
  function render() {
    const q = $("#search").value.toLowerCase(),
      type = $("#type").value,
      mat = $("#material").value,
      sz = $("#size").value,
      sort = $("#sort").value;
    let list = frames.filter(
      (f) =>
        (f.name + f.desc).toLowerCase().includes(q) &&
        (!type || f.type === type) &&
        (!mat || f.material === mat) &&
        (!sz || f.sizes.includes(sz)),
    );
    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    $("#results").innerHTML = list.length
      ? list.map((f) => frameCard(f)).join("")
      : "<p>No frames match. Try clearing a filter.</p>";
    $("#count").textContent = `${list.length} frame(s) found`;
    // If a size filter is chosen, preselect it in each card's size picker
    if (sz)
      document.querySelectorAll(".size-pick").forEach((s) => (s.value = sz));
  }
  document
    .querySelectorAll(".tools input,.tools select")
    .forEach((el) => el.addEventListener("input", render));
  $("#results").addEventListener("click", (e) => {
    const id = e.target.dataset.add;
    if (!id) return;
    const pick = document.querySelector(`.size-pick[data-for="${id}"]`);
    if (!pick.value) {
      $("#err-" + id).textContent = "Please pick a size first.";
      return;
    }
    $("#err-" + id).textContent = "";
    addToCart(+id, pick.value);
    e.target.textContent = "Added ✓";
    setTimeout(() => (e.target.textContent = "Add to cart"), 1200);
  });
  render();
}

// ===== Fit calculator =====
function initFit() {
  $("#fit-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const inseam = parseFloat($("#inseam").value),
      factor = parseFloat($("#ride").value);
    if (!inseam || inseam < 55 || inseam > 105) {
      $("#fit-err").textContent =
        "Enter your inseam in cm, between 55 and 105.";
      return;
    }
    $("#fit-err").textContent = "";
    const cm = (inseam * factor).toFixed(1);
    const letter =
      inseam < 72
        ? "XS"
        : inseam < 77
          ? "S"
          : inseam < 82
            ? "M"
            : inseam < 87
              ? "L"
              : "XL";
    $("#fit-out").innerHTML =
      `<div class="result">Recommended frame size<br><strong>${letter}</strong> (about ${cm} cm)<br><br><a class="btn" href="shop.html?size=${letter}">See size ${letter} frames</a></div>`;
  });
}

// ===== Cart =====
async function initCart() {
  const frames = await loadFrames();
  function render() {
    const cart = getCart();
    if (!cart.length) {
      $("#cart-area").innerHTML =
        '<p>Your cart is empty. <a href="shop.html">Browse frames</a></p>';
      return;
    }
    let total = 0;
    // n = position of the item in the cart, used by the buttons below
    const rows = cart
      .map((i, n) => {
        const f = frames.find((x) => x.id === i.id);
        total += f.price * i.qty;
        return `<tr><td>${f.name}</td><td>${i.size || "-"}</td><td>${peso(f.price)}</td><td class="qty"><button data-dec="${n}" aria-label="Decrease">−</button> ${i.qty} <button data-inc="${n}" aria-label="Increase">+</button></td><td>${peso(f.price * i.qty)}</td><td><button class="btn alt" data-del="${n}">Remove</button></td></tr>`;
      })
      .join("");
    $("#cart-area").innerHTML =
      `<div class="tablewrap"><table><tr><th>Frame</th><th>Size</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr>${rows}</table></div><p class="total">Total: ${peso(total)}</p><button class="btn" id="checkout">Checkout</button>`;
  }
  $("#cart-area").addEventListener("click", (e) => {
    const d = e.target.dataset;
    let cart = getCart();
    if (d.inc !== undefined) cart[d.inc].qty++;
    if (d.dec !== undefined) {
      cart[d.dec].qty--;
      cart = cart.filter((i) => i.qty > 0);
    }
    if (d.del !== undefined) cart.splice(d.del, 1);
    if (e.target.id === "checkout") {
      saveCart([]);
      render();
      $("#cart-area").insertAdjacentHTML(
        "afterbegin",
        '<p class="ok">Order placed! This is a demo, so no payment was taken.</p>',
      );
      return;
    }
    saveCart(cart);
    render();
  });
  render();
}

// ===== Contact form validation =====
function initContact() {
  $("#contact-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#name").value.trim(),
      email = $("#email").value.trim(),
      msg = $("#message").value.trim();
    const errs = {
      name: name.length < 2 ? "Please enter your name." : "",
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? ""
        : "Enter a valid email like name@email.com.",
      message: msg.length < 10 ? "Message must be at least 10 characters." : "",
    };
    for (const k in errs) $("#" + k + "-err").textContent = errs[k];
    if (Object.values(errs).some(Boolean)) return;
    const saved = JSON.parse(localStorage.getItem("tw-inquiries") || "[]");
    saved.push({
      name,
      email,
      topic: $("#topic").value,
      msg,
      date: new Date().toISOString(),
    });
    localStorage.setItem("tw-inquiries", JSON.stringify(saved));
    e.target.reset();
    $("#sent").innerHTML =
      `<p class="ok">Thanks, ${name}! We'll reply to ${email} soon.</p>`;
  });
}

// ===== Start: run the right init for the page =====
buildLayout();
({
  home: initHome,
  shop: initShop,
  fit: initFit,
  cart: initCart,
  contact: initContact,
})[
  document.body.dataset.page === "index" ? "home" : document.body.dataset.page
]();
