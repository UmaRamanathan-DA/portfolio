async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function updateCartBadge(count) {
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = count;
    el.hidden = count === 0;
  });
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

async function addToCart(productId, button) {
  if (button) button.disabled = true;
  try {
    const data = await api("/api/cart/add", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, quantity: 1 }),
    });
    updateCartBadge(data.cart.item_count);
    showToast("Added to cart");
  } catch (err) {
    showToast(err.message);
  } finally {
    if (button) button.disabled = false;
  }
}

document.addEventListener("click", (event) => {
  const addBtn = event.target.closest("[data-add-to-cart]");
  if (addBtn) {
    event.preventDefault();
    addToCart(addBtn.dataset.addToCart, addBtn);
  }
});

window.shopApi = { api, updateCartBadge, showToast, addToCart };
