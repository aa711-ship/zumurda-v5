const WA_NUMBER="963986056357", STORAGE_KEY="zumurda_products_v1";
let products=loadProducts(), currentProduct=null, pendingOrder=null;

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function loadProducts(){try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY));return Array.isArray(x)?x:DEFAULT_PRODUCTS}catch{return DEFAULT_PRODUCTS}}
function money(n){return new Intl.NumberFormat("ar-SY").format(n)+" ل.س"}
function saveProducts(){localStorage.setItem(STORAGE_KEY,JSON.stringify(products))}
function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2600)}
function card(p){return `<article class="product-card" data-id="${p.id}">
<div class="product-image"><img src="${p.image}" alt="${p.name}" loading="lazy"><span class="product-tag">${p.tag||p.categoryName}</span></div>
<div class="product-body"><span class="product-category">${p.categoryName}</span><h3>${p.name}</h3>
<div class="product-bottom"><span class="price">${money(p.price)}</span><button class="order-btn" data-order="${p.id}">اطلبي عبر واتساب</button><button class="share-btn" title="مشاركة" data-share="${p.id}">↗</button></div></div></article>`}
function render(list=products,target="#productsGrid"){const el=$(target);el.innerHTML=list.map(card).join("");$("#emptyState")?.classList.toggle("hidden",list.length>0)}
function openOrder(id){currentProduct=products.find(p=>p.id===id);if(!currentProduct)return;$("#selectedProduct").innerHTML=`<img src="${currentProduct.image}" alt=""><div><strong>${currentProduct.name}</strong><small>${money(currentProduct.price)} • ${currentProduct.categoryName}</small></div>`;$("#orderForm").reset();$("#orderForm [name=quantity]").value=1;$("#locationStatus").textContent="";$("#orderFormStep").classList.remove("hidden");$("#reviewStep").classList.add("hidden");$("#orderModal").classList.remove("hidden")}
function closeModal(id){$("#"+id)?.classList.add("hidden")}
function filter(cat){$$(".category-pill").forEach(b=>b.classList.toggle("active",b.dataset.category===cat));render(cat==="all"?products:products.filter(p=>p.category===cat))}
function directProduct(){const id=new URLSearchParams(location.search).get("product");if(id){const p=products.find(x=>x.id===id);if(p){setTimeout(()=>{document.querySelector(`[data-id="${id}"]`)?.scrollIntoView({behavior:"smooth",block:"center"});document.querySelector(`[data-id="${id}"]`)?.animate([{boxShadow:"0 0 0 4px #a15e75"},{boxShadow:""}],{duration:1400})},300)}}}
function finder(){const r=$("#finderRecipient").value,o=$("#finderOccasion").value,b=$("#finderBudget").value;let score=p=>(r==="all"?0:(p.recipients||[]).includes(r)?4:0)+(o==="all"?0:(p.occasions||[]).includes(o)?3:0)+(b==="all"?0:p.budget===b?4:0);const out=[...products].sort((a,c)=>score(c)-score(a)).slice(0,3);render(out,"#finderGrid");$("#finderResults").classList.remove("hidden");$("#finderResults")[0]?.scrollIntoView?.({behavior:"smooth"})}
function makeWhatsApp(){const o=pendingOrder,p=o.product,total=p.price*o.quantity;let msg=`مرحباً زمردة 🌿\nأرغب بطلب:\n\nالمنتج: ${p.name}\nالسعر: ${money(p.price)}\nالكمية: ${o.quantity}\nالإجمالي: ${money(total)}\n\nبيانات الزبون:\nالاسم: ${o.name}\nالهاتف: ${o.phone}\nالمنطقة/المدينة: ${o.area}\nالعنوان: ${o.address}\nالملاحظات: ${o.notes||"لا يوجد"}`;if(o.location)msg+=`\nالموقع الحالي: ${o.location.lat}, ${o.location.lng}`;msg+=`\n\nرابط المنتج: ${location.origin+location.pathname}?product=${encodeURIComponent(p.id)}`;location.href=`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`}
document.addEventListener("click",e=>{
 const order=e.target.closest("[data-order]"),share=e.target.closest("[data-share]"),cat=e.target.closest("[data-category]"),close=e.target.closest("[data-close]");
 if(order)openOrder(order.dataset.order);
 if(share){const u=location.origin+location.pathname+"?product="+encodeURIComponent(share.dataset.share);navigator.clipboard?.writeText(u).then(()=>toast("تم نسخ رابط المنتج"))}
 if(cat)filter(cat.dataset.category);
 if(close)closeModal(close.dataset.close);
 if(e.target.id==="searchBtn"){$("#searchModal").classList.remove("hidden");setTimeout(()=>$("#searchInput").focus(),100)}
 if(e.target.id==="sendWhatsApp")makeWhatsApp();
 if(e.target.id==="backToForm"){$("#reviewStep").classList.add("hidden");$("#orderFormStep").classList.remove("hidden")}
});
$("#orderForm").addEventListener("submit",e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));d.quantity=Math.max(1,+d.quantity||1);pendingOrder={...d,product:currentProduct};const total=currentProduct.price*d.quantity;$("#reviewBox").innerHTML=`<b>${currentProduct.name}</b><br>الكمية: ${d.quantity}<br>الاسم: ${d.name}<br>الهاتف: ${d.phone}<br>المنطقة: ${d.area}<br>العنوان: ${d.address}<br>الملاحظات: ${d.notes||"لا يوجد"}<div class="total">الإجمالي: ${money(total)}</div>`;$("#orderFormStep").classList.add("hidden");$("#reviewStep").classList.remove("hidden");$(".order-progress span:nth-of-type(2)").classList.add("active")});
$("#locationBtn").addEventListener("click",()=>{if(!navigator.geolocation){$("#locationStatus").textContent="المتصفح لا يدعم تحديد الموقع.";return}$("#locationStatus").textContent="جارٍ تحديد موقعك…";navigator.geolocation.getCurrentPosition(pos=>{pendingOrder=pendingOrder||{};pendingOrder.location={lat:pos.coords.latitude.toFixed(6),lng:pos.coords.longitude.toFixed(6)};$("#locationStatus").textContent="تم حفظ الموقع. سيُرسل بعد تأكيد الطلب.";toast("تم تحديد موقعك بنجاح")},()=>$("#locationStatus").textContent="تعذر تحديد الموقع، يمكنك كتابة العنوان يدوياً.")});
$("#searchInput").addEventListener("input",e=>{const q=e.target.value.trim().toLowerCase();$("#searchResults").innerHTML=q?products.filter(p=>(p.name+" "+p.categoryName).toLowerCase().includes(q)).slice(0,6).map(p=>`<div class="search-result"><span>${p.name}<small> — ${money(p.price)}</small></span><button data-order="${p.id}">اطلبي</button></div>`).join(""):""});
$("#findGiftBtn").addEventListener("click",finder);
$("#menuBtn").addEventListener("click",()=>$("#mainNav").classList.toggle("open"));
window.addEventListener("mousemove",e=>{document.querySelector(".ambient-one").style.transform=`translate(${(e.clientX/innerWidth-.5)*35}px,${(e.clientY/innerHeight-.5)*25}px)`;document.querySelector(".ambient-two").style.transform=`translate(${(e.clientX/innerWidth-.5)*-25}px,${(e.clientY/innerHeight-.5)*-18}px)`});
render();directProduct();