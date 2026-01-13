(() => {
    // ------------------------------
    // userId をサーバー側で埋め込む
    // <script> const USER_ID = "xxx"; </script>
    // ------------------------------
    if (typeof USER_ID === 'undefined') {
      console.error('USER_ID が未定義です');
      return;
    }
  
    let favorites = new Set();
    let prevFavorites = new Set();
    let debounceTimer = null;
  
    const bc = new BroadcastChannel("favorites_sync");
  
    // --- BroadcastChannel 受信 ---
    bc.onmessage = (event) => {
      const { added = [], removed = [] } = event.data || {};
      let updated = false;
  
      added.forEach(id => { if (!favorites.has(id)) { favorites.add(id); updated = true; }});
      removed.forEach(id => { if (favorites.has(id)) { favorites.delete(id); updated = true; }});
  
      if (updated) updateDOM();
    };
  
    // --- DOM 更新 ---
    function updateDOM() {
      document.querySelectorAll(".toggle-star").forEach(img => {
        const shopId = img.dataset.shopId;
        if (!shopId) return;
  
        const isFav = favorites.has(shopId);
        img.dataset.isFav = isFav ? "1" : "0";
        img.src = isFav ? img.dataset.on : img.dataset.off;
      });
    }
  
    // --- 差分計算 ---
    function calcDiff() {
      const added = [], removed = [];
      favorites.forEach(id => { if (!prevFavorites.has(id)) added.push(id); });
      prevFavorites.forEach(id => { if (!favorites.has(id)) removed.push(id); });
      return { added, removed };
    }
  
    // --- サーバー同期 ---
    async function syncDiff() {
      const { added, removed } = calcDiff();
      if (added.length === 0 && removed.length === 0) return;
  
      try {
        const res = await fetch("/api/favorites/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: USER_ID, added, removed })
        });
  
        if (!res.ok) { console.error(await res.text()); return; }
  
        prevFavorites = new Set(favorites);
        bc.postMessage({ added, removed });
        console.log("favorites synced:", { added, removed });
  
      } catch (err) { console.error(err); }
    }
  
    function debounceSync() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(syncDiff, 500);
    }
  
    // --- トグル ---
    function toggleFavorite(shopId) {
      if (favorites.has(shopId)) favorites.delete(shopId);
      else favorites.add(shopId);
  
      updateDOM();
      debounceSync();
    }
  
    // --- イベント委譲 ---
    document.addEventListener("click", (e) => {
      const img = e.target.closest(".toggle-star");
      if (!img) return;
  
      const shopId = img.dataset.shopId;
      if (!shopId) return;
  
      toggleFavorite(shopId);
    });
  
    // --- 初期ロード ---
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelectorAll(".toggle-star").forEach(img => {
        if (img.dataset.isFav === "1") favorites.add(img.dataset.shopId);
      });
      prevFavorites = new Set(favorites);
    });
  
})();
  