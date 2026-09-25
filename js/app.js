const WA_NUMBER = "963986056357";

let products = []
let currentProduct = null;
let pendingOrder = null;
let orderMode = null;
let cart = JSON.parse(
localStorage.getItem("zumurda_cart") || "[]"
);
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function openModal(id) {
    const modal = document.getElementById(id);

    if (!modal) {
        console.error("Modal not found:", id);
        return;
    }
    modal.classList.remove("hidden");
}

/* ================================
الأسعار
===================================*/

function money(n) {
return new Intl.NumberFormat("en-US").format(n) + " ل.س";
}

function categoryLabel(category) {
    const labels = {
        makeup: "مكياج",
        care: "عناية",
        perfume: "عطور",
        accessories: "إكسسوارات",
        gifts: "هدايا",
        boxes: "بوكسات",
        offers: "عروض",
        weddings: "أعراس",
        parties: "حفلات"
    };

    return labels[category] || category || "";
}
function discountPercent(price, oldPrice) {
const current = Number(price);
const old = Number(oldPrice);

if (!old || old <= current || current < 0) {  
    return 0;  
}  

return Math.round(((old - current) / old) * 100);
}

/* ================================
السلة
================================ */

function saveCart() {
localStorage.setItem(
"zumurda_cart",
JSON.stringify(cart)
);
}

function addToCart(productId, quantity = 1) {
const product = products.find(
(p) => String(p.id) === String(productId)
);
console.log("ADD TO CART:", productId);
console.log("PRODUCTS:", products);

if (!product) {  
toast("لم يتم العثور على المنتج ❌");  
return;

}

const existing = cart.find(  
    (item) =>  
    String(item.id) === String(product.id)  
);  

if (existing) {  
    existing.quantity += quantity;  
} else {  
    cart.push({  
        id: product.id,  
        name: product.name,  
        price: product.price,  
        price_usd: product.price_usd,  
        quantity: quantity  
    });  
}  
  
saveCart();

updateCartCount();
toast("تمت إضافة المنتج إلى السلة 🛍");
}

function removeFromCart(productId) {
cart = cart.filter(
(item) =>
String(item.id) !== String(productId)
);

saveCart();

}

function updateCartQuantity(productId, quantity) {
const item = cart.find(
(item) =>
String(item.id) === String(productId)
);

if (!item) {  
    return;  
}  

item.quantity = Math.max(  
    1,  
    Number(quantity) || 1  
);  

saveCart();

}

function clearCart() {
cart = [];

saveCart();

}

function cartCount() {
return cart.reduce(
(total, item) =>
total + Number(item.quantity || 0),
0
);
}
function updateCartCount() {
const counter = $("#cartCount");

if (!counter) {  
    return;  
}  

counter.textContent = cartCount();

}
/* ================================
توحيد بيانات المنتج
================================ */

function normalizeProduct(p) {
return {
id: String(p.id),
name: p.name || "",
category: p.category || "",
categoryName: categoryLabel(p.category),
price: Number(p.price || 0),
price_usd: p.price_usd ?? null,
old_price: p.old_price ?? null,
description: p.description || "",
tag: p.tag || "",
recipients: Array.isArray(p.recipients)
? p.recipients: [],
occasions: Array.isArray(p.occasions)
? p.occasions: [],
budget: p.budget || "medium",
image: p.image_url || "",
featured: Boolean(p.featured),
stock: Number(p.stock || 0),
is_active: p.is_active !== false,
slug: p.slug || ""
};
}

/* ================================
تحميل المنتجات من Supabase
================================ */

async function loadProductsFromSupabase() {
const db = window.supabaseClient;

if (!db) {  
    console.error("Supabase client غير موجود.");  

    products =  
    typeof DEFAULT_PRODUCTS !== "undefined"  
    ? DEFAULT_PRODUCTS: [];  

    return;  
}  

const {  
    data,  
    error  
} = await db  
.from("products")  
.select("*")  
.eq("is_active", true)  
.order("created_at", {  
    ascending: false  
});  

if (error) {  
    console.error(  
        "فشل تحميل المنتجات من Supabase:",  
        error  
    );  

    products =  
    typeof DEFAULT_PRODUCTS !== "undefined"  
    ? DEFAULT_PRODUCTS: [];  

    toast(  
        "تعذر تحميل المنتجات، تم استخدام المنتجات الاحتياطية."  
    );  

    return;  
}  

products = (data || []).map(normalizeProduct);  

if (!products.length) {  
    products =  
    typeof DEFAULT_PRODUCTS !== "undefined"  
    ? DEFAULT_PRODUCTS: [];  
}

}

/* ================================
بطاقة المنتج
================================ */

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

        ${  
          p.price_usd  
            ? `  
              <span class="price-usd">  
                ≈ $${Number(p.price_usd).toFixed(2)}  
              </span>  
            `  
            : ""  
        }  

      </div>  

      <button  
        class="cart-btn"  
        data-add-cart="${p.id}"  
      >  
        🛍 أضيفي للسلة  
      </button>  

      <button  
        class="order-btn"  
        data-order="${p.id}"  
      >  
        اطلبي عبر واتساب  
      </button>  

      <button  
        class="share-btn"  
        title="نسخ رابط المنتج"  
        data-share="${p.id}"  
      >  
        🔗 رابط المنتج  
      </button>  

    </div>  

  </div>  

</article>

`;
}

function render(list = products, target = "#productsGrid") {
const grid = $(target);

if (!grid) {  
    return;  
}  

grid.innerHTML = list  
    .map(card)  
    .join("");

}

function renderCart() {
const items = $("#cartItems");
const empty = $("#cartEmpty");
const summary = $("#cartSummary");

const totalQuantity = $("#cartTotalQuantity");  
const totalPrice = $("#cartTotalPrice");  

if (!items || !empty || !summary) {  
    return;  
}  

if (!cart.length) {  
    items.innerHTML = "";  
    empty.classList.remove("hidden");  
    summary.classList.add("hidden");  

    if (totalQuantity) {  
        totalQuantity.textContent = "0";  
    }  

    if (totalPrice) {  
        totalPrice.innerHTML = `  
            <span>0 ل.س</span>  
            <small>≈ $0.00</small>  
        `;  
    }  

    return;  
}  

empty.classList.add("hidden");  
summary.classList.remove("hidden");  

items.innerHTML = cart.map((item) => {  
    const quantity = Number(item.quantity || 1);  

    const total =  
        Number(item.price || 0) * quantity;  

    const usd = item.price_usd  
        ? Number(item.price_usd)  
        : null;  

    const totalUsd = usd  
        ? usd * quantity  
        : null;  

    const product = products.find(  
        (p) =>  
            String(p.id) ===  
            String(item.id)  
    );  

    const image = product?.image || "";  

    return `  
        <div class="cart-item">  

            <div class="cart-item-image">  
                <img  
                    src="${image}"  
                    alt="${item.name}"  
                    loading="lazy"  
                >  
            </div>  

            <div class="cart-item-info">  

                <strong>  
                    ${item.name}  
                </strong>  

                <div class="cart-item-price">  
                    ${money(item.price)}  
                </div>  

                ${  
    usd
        ? `  
            <div class="cart-item-usd">  
                ≈ $${usd.toFixed(2)}
            </div>  
        `  
        : ""  
}

            </div>  

            <div class="cart-item-actions">  

                <button  
                    type="button"  
                    data-cart-minus="${item.id}"  
                    aria-label="تقليل الكمية"  
                >  
                    −  
                </button>  

                <span>  
                    ${quantity}  
                </span>  

                <button  
                    type="button"  
                    data-cart-plus="${item.id}"  
                    aria-label="زيادة الكمية"  
                >  
                    +  
                </button>  

            </div>  

            <div class="cart-item-total">  

                <strong>  
                    ${money(total)}  
                </strong>  

                ${  
                    totalUsd  
                        ? `  
                            <small>
    ≈ $${totalUsd.toFixed(2)}
</small>
                            
                        `  
                        : ""  
                }  

            </div>  

        </div>  
    `;  
}).join("");  

const quantityTotal = cart.reduce(  
    (total, item) =>  
        total + Number(item.quantity || 0),  
    0  
);  

const priceTotal = cart.reduce(  
    (total, item) =>  
        total +  
        Number(item.price || 0) *  
        Number(item.quantity || 0),  
    0  
);  

const usdTotal = cart.reduce(  
    (total, item) =>  
        total +  
        Number(item.price_usd || 0) *  
        Number(item.quantity || 0),  
    0  
);  

if (totalQuantity) {  
    totalQuantity.textContent = quantityTotal;  
}  

if (totalPrice) {  
    totalPrice.innerHTML = `  
        <span>${money(priceTotal)}</span>  
        <small>≈ $${usdTotal.toFixed(2)}</small>  
    `;  
}

}

updateCartCount();

/* ================================  
نافذة الطلب  
================================ */  

function closeModal(id) {
    const modal = document.getElementById(id);

    if (!modal) return;

    modal.classList.add("hidden");

    if (id === "orderModal") {
        currentProduct = null;
        pendingOrder = null;
    }
}
function openOrder(id) {

    console.log("OPEN ORDER START:", id);

    orderMode = "product";

    currentProduct = products.find(
        (p) => String(p.id) === String(id)
    );

    console.log("CURRENT PRODUCT:", currentProduct);

    if (!currentProduct) {
        console.error("PRODUCT NOT FOUND:", id);
        return;
    }

    const orderModal = document.getElementById("orderModal");
    const selectedProduct = $("#selectedProduct");
    const orderForm = $("#orderForm");
    const quantityField = $("#singleQuantityField");
    const formStep = $("#orderFormStep");
    const reviewStep = $("#reviewStep");

    console.log("ORDER MODAL:", orderModal);
    console.log("SELECTED PRODUCT:", selectedProduct);

    if (!orderModal || !selectedProduct || !orderForm) {
        console.error("ORDER ELEMENT MISSING");
        return;
    }

    quantityField?.classList.remove("hidden");

    selectedProduct.innerHTML = `
        <img
            src="${currentProduct.image}"
            alt="${currentProduct.name}"
        >

        <div>
            <strong>${currentProduct.name}</strong>

            <small>
                ${money(currentProduct.price)} •
                ${currentProduct.categoryName}
            </small>
        </div>
    `;

    orderForm.reset();

    const quantity = orderForm.querySelector(
        '[name="quantity"]'
    );

    if (quantity) {
        quantity.value = 1;
    }

    $("#locationStatus").textContent = "";

    formStep?.classList.remove("hidden");
    reviewStep?.classList.add("hidden");

    $(".order-progress span:nth-of-type(2)")
        ?.classList.remove("active");

    orderModal.classList.remove("hidden");
console.log("DISPLAY:", getComputedStyle(orderModal).display);
console.log("VISIBILITY:", getComputedStyle(orderModal).visibility);
console.log("OPACITY:", getComputedStyle(orderModal).opacity);
console.log("Z-INDEX:", getComputedStyle(orderModal).zIndex);
console.log("RECT:", orderModal.getBoundingClientRect());

const orderBox = orderModal.querySelector(".modal");
let parent = orderModal;

while (parent && parent !== document.body) {

    console.log(
        "PARENT:",
        parent.tagName,
        parent.id,
        parent.className,
        "DISPLAY:",
        getComputedStyle(parent).display,
        "VISIBILITY:",
        getComputedStyle(parent).visibility,
        "RECT:",
        parent.getBoundingClientRect()
    );

    parent = parent.parentElement;
}
console.log("ORDER BOX:", orderBox);
console.log(
    "ORDER BOX DISPLAY:",
    orderBox ? getComputedStyle(orderBox).display : "NONE"
);
console.log(
    "ORDER BOX RECT:",
    orderBox ? orderBox.getBoundingClientRect() : "NONE"
);
    console.log(
        "ORDER MODAL OPENED:",
        !orderModal.classList.contains("hidden")
    );
}
/* ================================
تصفية المنتجات
================================ */

function filter(cat) {  
$$(".category-pill").forEach((button) => {  
button.classList.toggle(  
"active",  
button.dataset.category === cat  
);  
});  

render(  
cat === "all"  
? products: products.filter(  
(p) => p.category === cat  
)  
);  
}  

/* ================================  
فتح منتج مباشر  
================================ */  

function directProduct() {  
const id = new URLSearchParams(  
location.search  
).get("product");  

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
`[data-id = "${id}"]`  
);  

if (!element) {  
return;  
}  

element.scrollIntoView({  
behavior: "smooth",  
block: "center"  
});  

element.animate(  
[{  
boxShadow:  
"0 0 0 4px #a15e75"  
},  
{  
boxShadow: ""  
}],  
{  
duration: 1400  
}  
);  
},  
300);  
}  

/* ================================  
GIFT FINDER — النسخة الأصلية  
================================ */  

function finder() {  
const recipient = $(  
"#finderRecipient"  
);  

const occasion = $(  
"#finderOccasion"  
);  

const budget = $(  
"#finderBudget"  
);  

const grid = $(  
"#finderGrid"  
);  

if (  
!recipient ||  
!occasion ||  
!budget ||  
!grid  
) {  
return;  
}  

const r = recipient.value;  
const o = occasion.value;  
const b = budget.value;  

const score = (p) => {  
return (  
(r === "all"  
? 0: (p.recipients || []).includes(r)  
? 4: 0) +  

(o === "all"  
? 0: (p.occasions || []).includes(o)  
? 3: 0) +  

(b === "all"  
? 0: p.budget === b  
? 4: 0)  
);  
};  

const out = [...products]  
.sort(  
(a, c) =>  
score(c) - score(a)  
)  
.slice(0, 3);  

render(  
out,  
"#finderGrid"  
);  

grid.scrollIntoView({  
behavior: "smooth",  
block: "start"  
});  
}  

/* ================================  
Finder الأصلي:  
إظهار الخطوات بالتدريج  
================================ */  

function initFinder() {  
const recipient = $(  
"#finderRecipient"  
);  

const occasion = $(  
"#finderOccasion"  
);  

const budget = $(  
"#finderBudget"  
);  

const recipientStep = $(  
"#finderStepRecipient"  
);  

const occasionStep = $(  
"#finderStepOccasion"  
);  

const budgetStep = $(  
"#finderStepBudget"  
);  

const findGiftBtn = $(  
"#findGiftBtn"  
);  

if (  
!recipient ||  
!occasion ||  
!budget ||  
!recipientStep ||  
!occasionStep ||  
!budgetStep ||  
!findGiftBtn  
) {  
return;  
}  

function update() {  
if (  
recipient.value !== "all"  
) {  
occasionStep.hidden = false;  
} else {  
occasionStep.hidden = true;  
budgetStep.hidden = true;  

occasion.value = "all";  
budget.value = "all";  
}  

if (  
occasion.value !== "all"  
) {  
budgetStep.hidden = false;  
} else {  
budgetStep.hidden = true;  

budget.value = "all";  
}  

const ready =  
recipient.value !== "all" &&  
occasion.value !== "all" &&  
budget.value !== "all";  

findGiftBtn.hidden = !ready;  
}  

recipient.addEventListener(  
"change",  
update  
);  

occasion.addEventListener(  
"change",  
update  
);  

budget.addEventListener(  
"change",  
update  
);  

occasionStep.hidden = true;  
budgetStep.hidden = true;  
findGiftBtn.hidden = true;  
}  

/* ================================  
Toast  
================================ */

function toast(t) {
const x = document.createElement("div");

x.textContent = t;  
x.style.position = "fixed";  
x.style.left = "50%";  
x.style.bottom = "24px";  
x.style.transform = "translateX(-50%)";  
x.style.padding = "12px 20px";  
x.style.background = "#ffffff";  
x.style.color = "#5f555a";  
x.style.border = "1px solid #d9c5cc";  
x.style.borderRadius = "12px";  
x.style.fontFamily = "Cairo, sans-serif";  
x.style.fontSize = "12px";  
x.style.fontWeight = "700";  
x.style.boxShadow = "0 10px 30px rgba(0,0,0,.2)";  
x.style.zIndex = "2147483647";  
x.style.display = "block";  
x.style.visibility = "visible";  
x.style.opacity = "1";  
x.style.pointerEvents = "none";  
x.style.direction = "rtl";  

document.body.appendChild(x);  

setTimeout(() => {  
    x.remove();  
}, 2600);

}
/* ================================
WhatsApp
================================ */

function makeWhatsApp() {
const o = pendingOrder;

if (!o) {  
    return;  
}  

let msg = `مرحباً زمردة 👋🌸

أرغب بطلب:

`;

// طلب من السلة  
if (Array.isArray(o.cart) && o.cart.length) {  

    o.cart.forEach((item, index) => {  

        const quantity =  
            Number(item.quantity || 1);  

        const price =  
            Number(item.price || 0);  

        const usd =  
            item.price_usd  
                ? Number(item.price_usd)  
                : null;  

        const total =  
            price * quantity;  

        const totalUsd =  
            usd  
                ? usd * quantity  
                : null;  

        const productUrl =  
            location.origin +  
            location.pathname +  
            "?product=" +  
            encodeURIComponent(item.id);  

        msg += `${index + 1}. ${item.name}

السعر: ${money(price)}${
usd
? ` ≈ $${usd.toFixed(2)}`
: ""
}
الكمية: ${quantity}
الإجمالي: ${money(total)}${
totalUsd
? ` ≈ $${totalUsd.toFixed(2)}`
: ""
}
رابط المنتج: ${productUrl}

`;
});

const cartTotal =  
        o.cart.reduce(  
            (sum, item) =>  
                sum +  
                Number(item.price || 0) *  
                Number(item.quantity || 0),  
            0  
        );  

    const cartTotalUsd =  
        o.cart.reduce(  
            (sum, item) =>  
                sum +  
                (  
                    item.price_usd  
                        ? Number(item.price_usd)  
                        : 0  
                ) *  
                Number(item.quantity || 0),  
            0  
        );  

    msg += `إجمالي الطلب: ${money(cartTotal)}${  
        cartTotalUsd  
            ? ` ≈ $${cartTotalUsd.toFixed(2)}`  
            : ""  
    }

`;

} else {  

    // طلب منتج واحد  
    if (!o.product) {  
        return;  
    }  

    const p = o.product;  

    const quantity =  
        Number(o.quantity || 1);  

    const price =  
        Number(p.price || 0);  

    const usd =  
        p.price_usd  
            ? Number(p.price_usd)  
            : null;  

    const total =  
        price * quantity;  

    const totalUsd =  
        usd  
            ? usd * quantity  
            : null;  

    const productUrl =  
        location.origin +  
        location.pathname +  
        "?product=" +  
        encodeURIComponent(p.id);  

    msg += `المنتج: ${p.name}

السعر: ${money(price)}${
usd
? ` ≈ $${usd.toFixed(2)}`
: ""
}
الكمية: ${quantity}

رابط المنتج: ${productUrl}

`;
}

msg += `بيانات الزبون:

الاسم: ${o.name}
الهاتف: ${o.phone}
المنطقة/المدينة: ${o.area}
العنوان: ${o.address}
الملاحظات: ${o.notes || "لا يوجد"}`;

if (o.location) {  
    msg += `

الموقع الحالي:
${o.location.lat}, ${o.location.lng}`;
}

location.href =  
    `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
$("#orderFormStep")
    .classList.add("hidden");

$("#reviewStep")
    .classList.remove("hidden");

$(".order-progress span:nth-of-type(2)")
    ?.classList.add("active");
}/* ================================
أحداث الضغط
================================ */

document.addEventListener(
"click",
(e) => {
if (e.target.closest("[data-add-cart]")) {
const button =
e.target.closest("[data-add-cart]");

const productId =  
    button.dataset.addCart;  

addToCart(productId);  

return;

}
if (e.target.closest("[data-cart-plus]")) {
const button =
e.target.closest("[data-cart-plus]");

const productId =  
    button.dataset.cartPlus;  

const item = cart.find(  
    (item) =>  
        String(item.id) ===  
        String(productId)  
);  

if (item) {  
    updateCartQuantity(  
        productId,  
        Number(item.quantity || 1) + 1  
    );  

    renderCart();  
}  

return;

}

if (e.target.closest("[data-cart-minus]")) {
const button =
e.target.closest("[data-cart-minus]");

const productId =  
    button.dataset.cartMinus;  

const item = cart.find(  
    (item) =>  
        String(item.id) ===  
        String(productId)  
);  

if (item) {  
    updateCartQuantity(  
        productId,  
        Number(item.quantity || 1) - 1  
    );  

    renderCart();  
}  

return;

}
if (e.target.closest("#cartBtn")) {

    openModal("cartModal");

    renderCart();

    return;
}
if (e.target.closest("#clearCartBtn")) {

const clearModal =  
    document.getElementById("clearCartModal");  

console.log("CLEAR MODAL:", clearModal);  

if (clearModal) {  

    clearModal.classList.remove("hidden");  

    console.log(  
        "CLASS:",  
        clearModal.className  
    );  

    console.log(  
        "DISPLAY:",  
        getComputedStyle(clearModal).display  
    );  

    console.log(  
        "VISIBILITY:",  
        getComputedStyle(clearModal).visibility  
    );  

    console.log(  
        "OPACITY:",  
        getComputedStyle(clearModal).opacity  
    );  

    console.log(  
        "RECT:",  
        clearModal.getBoundingClientRect()  
    );  
}  

return;

}
if (e.target.closest("#confirmClearCart")) {

clearCart();  
renderCart();  
  

$("#clearCartModal")?.classList.add("hidden");  

toast("تم إفراغ السلة 🛍");  

return;

}

if (e.target.closest("#cartOrderBtn")) {

if (!cart.length) {  
    toast("السلة فارغة حالياً 🛍");  
    return;  
}  
orderMode = "cart";
currentProduct = null;  
$("#singleQuantityField")?.classList.add("hidden");  

$("#selectedProduct").innerHTML = `  
    <div>  
        <strong>طلب من السلة 🛍</strong>  
        <small>  
            ${cart.length} منتجات في السلة  
        </small>  
    </div>  
`;  

$("#orderForm")?.reset();  

const quantity = $(  
    "#orderForm [name=quantity]"  
);  

if (quantity) {  
    quantity.value = 1;  
}  

$("#locationStatus").textContent = "";  

$("#orderFormStep")  
    .classList.remove("hidden");  

$("#reviewStep")  
    .classList.add("hidden");  

$("#orderModal")  
    .classList.remove("hidden");  

return;

}
const order =
e.target.closest(
"[data-order]"
);

const share =
e.target.closest(
"[data-share]"
);

const cat =
e.target.closest(
"[data-category]"
);

const close =
e.target.closest(
"[data-close]"
);
if (order) {

    console.log(
        "ORDER BUTTON CLICKED:",
        order.dataset.order
    );

    openOrder(
        order.dataset.order
    );
}

if (share) {
const u =
location.origin +
location.pathname +
"?product=" +
encodeURIComponent(
share.dataset.share
);

navigator.clipboard
?.writeText(u)
.then(() => {
toast(
"تم نسخ رابط المنتج"
);
});
}

if (cat) {
filter(
cat.dataset.category
);
}

if (close) {
closeModal(
close.dataset.close
);
}

if (
e.target.id ===
"searchBtn"
) {
$("#searchModal")
?.classList.remove(
"hidden"
);

setTimeout(() => {
$("#searchInput")?.focus();
}, 100);
}

if (
e.target.id ===
"sendWhatsApp"
) {
makeWhatsApp();
}

if (
e.target.id ===
"backToForm"
) {
$("#reviewStep")
?.classList.add(
"hidden"
);

$("#orderFormStep")
?.classList.remove(
"hidden"
);
}
}
);
/* ================================
نموذج الطلب
================================ */

$("#orderForm")?.addEventListener(
    "submit",
    (e) => {
        e.preventDefault();

        const d = Object.fromEntries(
            new FormData(e.currentTarget)
        );

        d.quantity = Math.max(
            1,
            Number(d.quantity) || 1
        );

        // إذا كان الطلب من السلة
        if (orderMode === "cart") {

            pendingOrder = {
                ...d,
                cart: cart.map((item) => ({
                    ...item,
                    quantity: Number(item.quantity || 1)
                })),
                location:
                    pendingOrder?.location || null
            };

            const total = cart.reduce(
                (sum, item) =>
                    sum +
                    Number(item.price || 0) *
                    Number(item.quantity || 0),
                0
            );

            const totalUsd = cart.reduce(
                (sum, item) =>
                    sum +
                    Number(item.price_usd || 0) *
                    Number(item.quantity || 0),
                0
            );

            $("#reviewBox").innerHTML = `
                <b>الطلب من السلة 🛍</b><br><br>

                ${cart.map((item) => `
                    <div style="margin-bottom:12px;">
                        <b>${item.name}</b><br>
                        الكمية: ${item.quantity}<br>
                        السعر: ${money(item.price)}<br>
                        الإجمالي:
                        ${money(
                            Number(item.price || 0) *
                            Number(item.quantity || 0)
                        )}
                    </div>
                `).join("")}

                <div class="total">
                    الإجمالي: ${money(total)}
                    ${
                        totalUsd
                            ? ` ≈ $${totalUsd.toFixed(2)}`
                            : ""
                    }
                </div>

                <br>

                <b>بيانات الزبون</b><br>
                الاسم: ${d.name}<br>
                الهاتف: ${d.phone}<br>
                المنطقة: ${d.area}<br>
                العنوان: ${d.address}<br>
                الملاحظات: ${d.notes || "لا يوجد"}
            `;

        } else if (orderMode === "product") {

            // الطلب الفردي
            if (!currentProduct) {
                return;
            }

            pendingOrder = {
                ...d,
                product: currentProduct,
                location:
                    pendingOrder?.location || null
            };

            const total =
                currentProduct.price *
                d.quantity;

            $("#reviewBox").innerHTML = `
                <b>${currentProduct.name}</b><br>

                الكمية: ${d.quantity}<br>
                الاسم: ${d.name}<br>
                الهاتف: ${d.phone}<br>
                المنطقة: ${d.area}<br>
                العنوان: ${d.address}<br>
                الملاحظات: ${d.notes || "لا يوجد"}

                <div class="total">
                    الإجمالي: ${money(total)}
                </div>
            `;
        }
    
        $("#orderFormStep")?.classList.add("hidden");
        $("#reviewStep")?.classList.remove("hidden");
        $(".order-progress span:nth-of-type(2)")
            ?.classList.add("active");
    }
);


/* ================================
الموقع
================================ */

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

                pendingOrder =
                    pendingOrder || {};

                pendingOrder.location = {
                    lat: pos.coords.latitude.toFixed(6),
                    lng: pos.coords.longitude.toFixed(6)
                };

                $("#locationStatus").textContent =
                    "تم حفظ الموقع. سيُرسل بعد تأكيد الطلب.";

                toast(
                    "تم تحديد موقعك بنجاح"
                );
            },
            () => {

                $("#locationStatus").textContent =
                    "تعذر تحديد الموقع، يمكنك كتابة العنوان يدوياً.";
            }
        );
    }
);


/* ================================
البحث
================================ */

$("#searchInput")?.addEventListener(
    "input",
    (e) => {

        const q =
            e.target.value.trim().toLowerCase();

        const results =
            $("#searchResults");

        if (!results) {
            return;
        }

        results.innerHTML = q
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

                                <small>
                                    — ${money(p.price)}
                                </small>
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


/* ================================
زر Finder
================================ */

$("#findGiftBtn")?.addEventListener(
    "click",
    finder
);


/* ================================
القائمة
================================ */

$("#menuBtn")?.addEventListener(
    "click",
    () => {

        $("#mainNav")?.classList.toggle(
            "open"
        );

    }
);


/* ================================
الخلفية المتحركة
================================ */

window.addEventListener(
    "mousemove",
    (e) => {

        const one =
            document.querySelector(
                ".ambient-one"
            );

        const two =
            document.querySelector(
                ".ambient-two"
            );

        if (one) {

            one.style.transform =
                `translate(${
                    (e.clientX / innerWidth - 0.5) * 35
                }px, ${
                    (e.clientY / innerHeight - 0.5) * 25
                }px)`;
        }

        if (two) {

            two.style.transform =
                `translate(${
                    (e.clientX / innerWidth - 0.5) * -25
                }px, ${
                    (e.clientY / innerHeight - 0.5) * -18
                }px)`;
        }

    }
);


/* ================================
تشغيل الموقع
================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadProductsFromSupabase();

        render();

        directProduct();
    }
);