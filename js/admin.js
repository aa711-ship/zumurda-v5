const db = window.supabaseClient;
const BUCKET = "product-images";

const loginScreen = document.querySelector("#loginScreen");
const adminContent = document.querySelector("#adminContent");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const logoutBtn = document.querySelector("#logoutBtn");

let list = [];
let editingId = null;

async function showAdminSession() {
  const { data, error } = await db.auth.getSession();

  if (error) {
    console.error(error);
    return false;
  }

  if (data.session) {
    loginScreen?.classList.add("hidden");
    adminContent?.classList.remove("hidden");
    return true;
  }

  loginScreen?.classList.remove("hidden");
  adminContent?.classList.add("hidden");
  return false;
}

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = String(
    loginForm.querySelector('[name="email"]').value || ""
  ).trim();

  const password = String(
    loginForm.querySelector('[name="password"]').value || ""
  );

  loginMessage.textContent = "جارٍ تسجيل الدخول...";

  const { error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error(error);
    loginMessage.textContent = "بيانات الدخول غير صحيحة.";
    return;
  }

  loginMessage.textContent = "";

  const loggedIn = await showAdminSession();

  if (loggedIn) {
    await loadProducts();
  }
});

logoutBtn?.addEventListener("click", async () => {
  logoutBtn.disabled = true;
  logoutBtn.textContent = "جارٍ تسجيل الخروج...";

  const { error } = await db.auth.signOut();

  if (error) {
    console.error(error);

    alert("تعذر تسجيل الخروج:\n" + error.message);

    logoutBtn.disabled = false;
    logoutBtn.textContent = "تسجيل الخروج";
    return;
  }

  adminContent?.classList.add("hidden");
  loginScreen?.classList.remove("hidden");

  logoutBtn.disabled = false;
  logoutBtn.textContent = "تسجيل الخروج";
});

function label(c) {
  return ({
    makeup: "مكياج",
    care: "عناية",
    perfume: "عطور",
    accessories: "إكسسوارات",
    gifts: "هدايا",
    boxes: "بوكسات",
    offers: "عروض"
  })[c] || c;
}

function makeSlug(name) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug}-${Date.now()}`;
}

function money(n) {
  return new Intl.NumberFormat("ar-SY").format(n) + " ل.س";
}

async function loadProducts() {
  const { data, error } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    alert("تعذر تحميل المنتجات:\n" + error.message);
    return;
  }

  list = data || [];
  render();
}

function render() {
  const productCount = document.querySelector("#productCount");

  if (productCount) {
    productCount.textContent = list.length;
  }

  const adminProducts = document.querySelector("#adminProducts");

  if (!adminProducts) {
    return;
  }

  adminProducts.innerHTML = list
    .map(
      (p) => `
      <div class="admin-item">
        <img src="${p.image_url || ""}" alt="${p.name || ""}">

        <div>
          <strong>${p.name || ""}</strong>

          <small>
            ${label(p.category)} • ${money(p.price || 0)}
            ${
              p.old_price
                ? ` • السعر القديم: ${money(p.old_price)}`
                : ""
            }
          </small>

          ${
            p.featured
              ? `<small>⭐ منتج مميز</small>`
              : ""
          }
        </div>

        <div class="item-actions">
          <button data-edit="${p.id}">
            تعديل
          </button>

          <button
            class="delete"
            data-delete="${p.id}"
          >
            حذف
          </button>
        </div>
      </div>
    `
    )
    .join("");
}

function resetForm() {
  const form = document.querySelector("#productForm");

  if (!form) {
    return;
  }

  form.reset();

  editingId = null;

  document.querySelector("#formTitle").textContent =
    "إضافة منتج";

  const imageInput = form.querySelector('[name="image"]');

  if (imageInput) {
    imageInput.required = true;
  }

  const stockInput = form.querySelector('[name="stock"]');

  if (stockInput) {
    stockInput.value = 0;
  }

  const featuredInput = form.querySelector('[name="featured"]');

  if (featuredInput) {
    featuredInput.value = "false";
  }

  form
    .querySelectorAll('input[name="recipients"]')
    .forEach((input) => {
      input.checked = false;
    });

  form
    .querySelectorAll('input[name="occasions"]')
    .forEach((input) => {
      input.checked = false;
    });
}

async function uploadImage(file) {
  if (!file) {
    throw new Error("لم يتم اختيار صورة.");
  }

  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowed.includes(file.type)) {
    throw new Error(
      "نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP."
    );
  }

  const extension = file.name
    .split(".")
    .pop()
    .toLowerCase();

  const fileName =
    `products/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (uploadError) {
    throw new Error(
      "فشل رفع الصورة: " + uploadError.message
    );
  }

  const { data } = db.storage
    .from(BUCKET)
    .getPublicUrl(fileName);

  return data.publicUrl;
}

document
  .querySelector("#productForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = String(
      formData.get("name") || ""
    ).trim();

    const category = String(
      formData.get("category") || ""
    ).trim();

    const price = Number(
      formData.get("price") || 0
    );

    const oldPriceValue = String(
      formData.get("old_price") || ""
    ).trim();

    const old_price =
      oldPriceValue === ""
        ? null
        : Number(oldPriceValue);

    const description = String(
      formData.get("description") || ""
    ).trim();

    const tag = String(
      formData.get("tag") || ""
    ).trim();

    const budget = String(
      formData.get("budget") || "medium"
    );

    const stock = Number(
      formData.get("stock") || 0
    );

    const featured =
      formData.get("featured") === "true";

    const recipients = [
      ...form.querySelectorAll(
        'input[name="recipients"]:checked'
      )
    ].map((input) => input.value);

    const occasions = [
      ...form.querySelectorAll(
        'input[name="occasions"]:checked'
      )
    ].map((input) => input.value);

    const imageFile = formData.get("image");

    if (!name) {
      alert("اكتب اسم المنتج.");
      return;
    }

    if (!price || price < 0) {
      alert("أدخل سعراً صحيحاً.");
      return;
    }

    if (
      old_price !== null &&
      (Number.isNaN(old_price) || old_price < 0)
    ) {
      alert("أدخل السعر القديم بشكل صحيح.");
      return;
    }

    if (
      old_price !== null &&
      old_price <= price
    ) {
      alert(
        "السعر القديم يجب أن يكون أعلى من السعر الحالي."
      );
      return;
    }

    if (stock < 0 || Number.isNaN(stock)) {
      alert("أدخل كمية مخزون صحيحة.");
      return;
    }

    if (!editingId && (!imageFile || !imageFile.name)) {
      alert("اختر صورة للمنتج.");
      return;
    }

    const submitButton = form.querySelector(
      'button[type="submit"]'
    );

    submitButton.disabled = true;
    submitButton.textContent = "جارٍ الحفظ...";

    try {
      let imageUrl = null;

      if (imageFile && imageFile.name) {
        imageUrl = await uploadImage(imageFile);
      }

      const productData = {
        name,
        category,
        price,
        old_price,
        description,
        tag,
        budget,
        stock,
        featured,
        recipients,
        occasions,
        is_active: true
      };

      if (!editingId) {
        productData.slug = makeSlug(name);
      }

      if (imageUrl) {
        productData.image_url = imageUrl;
      }

      if (editingId) {
        const { error } = await db
          .from("products")
          .update(productData)
          .eq("id", editingId);

        if (error) {
          throw new Error(error.message);
        }

        alert("تم تعديل المنتج بنجاح.");
      } else {
        const { error } = await db
          .from("products")
          .insert(productData);

        if (error) {
          throw new Error(error.message);
        }

        alert("تمت إضافة المنتج بنجاح.");
      }

      resetForm();

      await loadProducts();

    } catch (error) {
      console.error(error);

      alert(
        "حدث خطأ:\n" +
        error.message
      );

    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "حفظ المنتج";
    }
  });

document
  .querySelector("#adminProducts")
  ?.addEventListener("click", async (e) => {

    const editButton =
      e.target.closest("[data-edit]");

    const deleteButton =
      e.target.closest("[data-delete]");


    if (editButton) {

      const product = list.find(
        (p) =>
          String(p.id) ===
          String(editButton.dataset.edit)
      );

      if (!product) {
        return;
      }

      editingId = product.id;

      const form =
        document.querySelector("#productForm");

      form.querySelector('[name="name"]').value =
        product.name || "";

      form.querySelector('[name="category"]').value =
        product.category || "";

      form.querySelector('[name="price"]').value =
        product.price ?? "";

      form.querySelector('[name="old_price"]').value =
        product.old_price ?? "";

      form.querySelector('[name="description"]').value =
        product.description || "";

      form.querySelector('[name="tag"]').value =
        product.tag || "";

      form.querySelector('[name="budget"]').value =
        product.budget || "medium";

      form.querySelector('[name="stock"]').value =
        product.stock ?? 0;

      form.querySelector('[name="featured"]').value =
        product.featured ? "true" : "false";


      form
        .querySelectorAll(
          'input[name="recipients"]'
        )
        .forEach((input) => {

          input.checked =
            Array.isArray(product.recipients) &&
            product.recipients.includes(
              input.value
            );

        });


      form
        .querySelectorAll(
          'input[name="occasions"]'
        )
        .forEach((input) => {

          input.checked =
            Array.isArray(product.occasions) &&
            product.occasions.includes(
              input.value
            );

        });


      const imageInput =
        form.querySelector('[name="image"]');

      if (imageInput) {
        imageInput.required = false;
        imageInput.value = "";
      }


      document.querySelector("#formTitle").textContent =
        "تعديل منتج";


      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

      return;
    }


    if (deleteButton) {

      const id =
        deleteButton.dataset.delete;

      const confirmed = confirm(
        "هل تريد حذف هذا المنتج نهائياً؟"
      );

      if (!confirmed) {
        return;
      }

      deleteButton.disabled = true;

      const { error } = await db
        .from("products")
        .delete()
        .eq("id", id);

      if (error) {

        alert(
          "تعذر حذف المنتج:\n" +
          error.message
        );

        deleteButton.disabled = false;

        return;
      }

      await loadProducts();
    }
  });


document
  .querySelector("#cancelEdit")
  ?.addEventListener(
    "click",
    resetForm
  );


async function initAdmin() {

  const loggedIn =
    await showAdminSession();

  if (loggedIn) {
    await loadProducts();
  }
}


initAdmin();