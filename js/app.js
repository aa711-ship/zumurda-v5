const WA_NUMBER = "963986056357";

let products = [];
let currentProduct = null;
let pendingOrder = null;

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function money(n) {
  return new Intl.NumberFormat("ar-SY").format(n) + " ل.س";
}

function categoryLabel(category) {
  return (
    {
      makeup: "مكياج",
      care: "عناية",
      perfume: "عطور",
      accessories: "إكسسوارات",
      gifts: "هدايا",
      boxes: "بوكسات",
      offers: "عروض",
      weddings: "أعراس",
      parties: "حفلات"
    }[category] || category || ""
  );
}

function discountPercent(price, oldPrice) {
  const current = Number(price);
  const old = Number(oldPrice);

  if (!old || old <= current || current < 0) {
    return 0;
  }

  return Math.round(((old - current) / old) * 100);
}

function normalizeProduct(p) {
  return {
    id: String(p.id),
    name: p.name || "",
    category: p.category || "",
    categoryName: categoryLabel(p.category),
    price: Number(p.price || 0),
    old_price: p.old_price ?? null,
    description: p.description || "",
    tag: p.tag || "",
    recipients: Array.isArray(p.recipients) ? p.recipients : [],
    occasions: Array.isArray(p.occasions) ? p.occasions : [],
    budget: p.budget || "medium",
    image: p.image_url || "",
    featured: Boolean(p.featured),
    stock: Number(p.stock || 0),
    is_active: p.is_active !== false,
    slug: p.slug || ""
  };
}

async function loadProductsFromSupabase() {
  const db = window.supabaseClient;

  if (!db) {
    console.error("Supabase client غير موجود.");
    products = DEFAULT_PRODUCTS;
    return;
  }

  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("فشل تحميل المنتجات من Supabase:", error);

    products = DEFAULT_PRODUCTS;

    toast(
      "تعذر تحميل المنتجات، تم استخدام المنتجات الاحتياطية."
    );

    return;
  }

  products = (data || []).map(normalizeProduct);

  if (!products.length) {
    products = DEFAULT_PRODUCTS;
  }
}

function card(p) {
  const discount = discountPercent(
    p.price,
    p.old_price
  );

  return `
    <article class="product-card" data-id="${p.id}">

      <div class="product-image">

        <img
          src="${p.image || ""}"
          alt="${p.name}"
          loading="lazy"
        >

        <span class="product-tag">
          ${p.tag || p.categoryName}
        </span>

        ${
          discount > 0
            ? `
              <span class="discount-badge">
                خصم ${discount}%
              </span>
            `
            : ""
        }

      </div>


      <div class="product-body">

        <span class="product-category">
          ${p.categoryName}
        </span>

        <h3>${p.name}</h3>

        ${
          p.description
            ? `
              <p class="product-description">
                ${p.description}
              </p>
            `
            : ""
        }


        <div class="product-bottom">

          <div class="price-box">

            ${
              p.old_price &&
              Number(p.old_price) > Number(p.price)
                ? `
                  <span class="old-price">
                    ${money(p.old_price)}
                  </span>
                `
                : ""
            }

            <span class="price">
              ${money(p.price)}
            </span>

          </div>


          <button
            class="order-btn"
            data-order="${p.id}"
          >
            اطلبي عبر واتساب
          </button>


          <button
            class="share-btn"
            title="مشاركة"
            data-share="${p.id}"
          >
            ↗
          </button>

        </div>

      </div>

    </article>
  `;
}

function render(list = products, target = "#productsGrid") {
  const el = $(target);

  if (!el) {
    return;
  }

  el.innerHTML = list.map(card).join("");

  $("#emptyState")?.classList.toggle(
    "hidden",
    list.length > 0
  );
}

function openOrder(id) {
  currentProduct = products.find(
    (p) => String(p.id) === String(id)
  );

  if (!currentProduct) {
    return;
  }

  $("#selectedProduct").innerHTML = `
    <img src="${currentProduct.image}" alt="">

    <div>
      <strong>${currentProduct.name}</strong>

      <small>
        ${money(currentProduct.price)} •
        ${currentProduct.categoryName}
      </small>
    </div>
  `;

  $("#orderForm").reset();

  $("#orderForm [name=quantity]").value = 1;

  $("#locationStatus").textContent = "";

  $("#orderFormStep").classList.remove("hidden");
  $("#reviewStep").classList.add("hidden");
  $("#orderModal").classList.remove("hidden");
}

function closeModal(id) {
  $("#" + id)?.classList.add("hidden");
}

function filter(cat) {
  $$(".category-pill").forEach((b) => {
    b.classList.toggle(
      "active",
      b.dataset.category === cat
    );
  });

  render(
    cat === "all"
      ? products
      : products.filter((p) => p.category === cat)
  );
}

function directProduct() {
  const id = new URLSearchParams(location.search).get(
    "product"
  );

  if (!id) {
    return;
  }

  const product = products.find(
    (p) => String(p.id) === String(id)
  );

  if (!product) {
    return;
  }

  setTimeout(() => {
    const element = document.querySelector(
      `[data-id="${id}"]`
    );

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    element.animate(
      [
        {
          boxShadow: "0 0 0 4px #a15e75"
        },
        {
          boxShadow: ""
        }
      ],
      {
        duration: 1400
      }
    );
  }, 300);
}

function finder() {
  const r = $("#finderRecipient").value;
  const o = $("#finderOccasion").value;
  const b = $("#finderBudget").value;

  const score = (p) =>
    (r === "all"
      ? 0
      : (p.recipients || []).includes(r)
        ? 4
        : 0) +
    (o === "all"
      ? 0
      : (p.occasions || []).includes(o)
        ? 3
        : 0) +
    (b === "all"
      ? 0
      : p.budget === b
        ? 4
        : 0);

  const out = [...products]
    .sort((a, c) => score(c) - score(a))
    .slice(0, 3);

  render(out, "#finderGrid");

  $("#finderResults").classList.remove("hidden");

  $("#finderResults")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function toast(t) {
  const x = $("#toast");

  if (!x) {
    return;
  }

  x.textContent = t;
  x.classList.add("show");

  setTimeout(() => {
    x.classList.remove("show");
  }, 2600);
}

function makeWhatsApp() {
  const o = pendingOrder;
  const p = o.product;

  const total = p.price * o.quantity;

  let msg = `مرحباً زمردة 👋🌸
أرغب بطلب:

المنتج: ${p.name}
السعر: ${money(p.price)}
الكمية: ${o.quantity}
الإجمالي: ${money(total)}

بيانات الزبون:
الاسم: ${o.name}
الهاتف: ${o.phone}
المنطقة/المدينة: ${o.area}
العنوان: ${o.address}
الملاحظات: ${o.notes || "لا يوجد"}`;

  if (o.location) {
    msg += `
الموقع الحالي: ${o.location.lat}, ${o.location.lng}`;
  }

  msg += `

رابط المنتج: ${
    location.origin +
    location.pathname +
    "?product=" +
    encodeURIComponent(p.id)
  }`;

  location.href =
    `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

document.addEventListener("click", (e) => {
  const order = e.target.closest("[data-order]");
  const share = e.target.closest("[data-share]");
  const cat = e.target.closest("[data-category]");
  const close = e.target.closest("[data-close]");

  if (order) {
    openOrder(order.dataset.order);
  }

  if (share) {
    const u =
      location.origin +
      location.pathname +
      "?product=" +
      encodeURIComponent(share.dataset.share);

    navigator.clipboard
      ?.writeText(u)
      .then(() => toast("تم نسخ رابط المنتج"));
  }

  if (cat) {
    filter(cat.dataset.category);
  }

  if (close) {
    closeModal(close.dataset.close);
  }

  if (e.target.id === "searchBtn") {
    $("#searchModal").classList.remove("hidden");

    setTimeout(() => {
      $("#searchInput").focus();
    }, 100);
  }

  if (e.target.id === "sendWhatsApp") {
    makeWhatsApp();
  }

  if (e.target.id === "backToForm") {
    $("#reviewStep").classList.add("hidden");
    $("#orderFormStep").classList.remove("hidden");
  }
});

$("#orderForm")?.addEventListener("submit", (e) => {
  e.preventDefault();

  const d = Object.fromEntries(
    new FormData(e.currentTarget)
  );

  d.quantity = Math.max(
    1,
    Number(d.quantity) || 1
  );

  pendingOrder = {
    ...d,
    product: currentProduct,
    location: pendingOrder?.location || null
  };

  const total =
    currentProduct.price * d.quantity;

  $("#reviewBox").innerHTML = `
    <b>${currentProduct.name}</b>
    <br>
    الكمية: ${d.quantity}
    <br>
    الاسم: ${d.name}
    <br>
    الهاتف: ${d.phone}
    <br>
    المنطقة: ${d.area}
    <br>
    العنوان: ${d.address}
    <br>
    الملاحظات: ${d.notes || "لا يوجد"}

    <div class="total">
      الإجمالي: ${money(total)}
    </div>
  `;

  $("#orderFormStep").classList.add("hidden");
  $("#reviewStep").classList.remove("hidden");

  $(".order-progress span:nth-of-type(2)")
    ?.classList.add("active");
});

$("#locationBtn")?.addEventListener(
  "click",
  () => {
    if (!navigator.geolocation) {
      $("#locationStatus").textContent =
        "المتصفح لا يدعم تحديد الموقع.";

      return;
    }

    $("#locationStatus").textContent =
      "جارٍ تحديد موقعك…";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pendingOrder = pendingOrder || {};

        pendingOrder.location = {
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6)
        };

        $("#locationStatus").textContent =
          "تم حفظ الموقع. سيُرسل بعد تأكيد الطلب.";

        toast("تم تحديد موقعك بنجاح");
      },
      () => {
        $("#locationStatus").textContent =
          "تعذر تحديد الموقع، يمكنك كتابة العنوان يدوياً.";
      }
    );
  }
);

$("#searchInput")?.addEventListener(
  "input",
  (e) => {
    const q = e.target.value
      .trim()
      .toLowerCase();

    $("#searchResults").innerHTML = q
      ? products
          .filter((p) =>
            (
              p.name +
              " " +
              p.categoryName
            )
              .toLowerCase()
              .includes(q)
          )
          .slice(0, 6)
          .map(
            (p) => `
              <div class="search-result">
                <span>
                  ${p.name}
                  <small> — ${money(p.price)}</small>
                </span>

                <button data-order="${p.id}">
                  اطلبي
                </button>
              </div>
            `
          )
          .join("")
      : "";
  }
);

$("#findGiftBtn")?.addEventListener(
  "click",
  finder
);

$("#menuBtn")?.addEventListener(
  "click",
  () => {
    $("#mainNav")?.classList.toggle("open");
  }
);

window.addEventListener("mousemove", (e) => {
  const one = document.querySelector(".ambient-one");
  const two = document.querySelector(".ambient-two");

  if (one) {
    one.style.transform =
      `translate(${(e.clientX / innerWidth - 0.5) * 35}px,` +
      `${(e.clientY / innerHeight - 0.5) * 25}px)`;
  }

  if (two) {
    two.style.transform =
      `translate(${(e.clientX / innerWidth - 0.5) * -25}px,` +
      `${(e.clientY / innerHeight - 0.5) * -18}px)`;
  }
});

async function initStore() {
  await loadProductsFromSupabase();

  render();
  directProduct();
}

initStore();