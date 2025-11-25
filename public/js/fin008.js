// fin008.js

// モーダル関連の要素を取得
const openPhotoModalBtn = document.getElementById("openPhotoModal");
const closePhotoModalBtn = document.getElementById("closePhotoModal");
const photoModal = document.getElementById("photoModal");

// 「写真」(#openPhotoModal) がクリックされたら
// ※ openPhotoModalBtn が null でないことを確認してからイベントリスナーを設定することが推奨されますが、ここでは簡略化します。
if (openPhotoModalBtn) {
    openPhotoModalBtn.addEventListener("click", function(e) {
        e.preventDefault(); // リンク遷移を止める
        photoModal.style.display = "flex"; // モーダルを表示
    });
}


// 「閉じる」(#closePhotoModal) がクリックされたら
if (closePhotoModalBtn) {
    closePhotoModalBtn.addEventListener("click", function() {
        photoModal.style.display = "none"; // モーダルを非表示
    });
}

// モーダルの背景（黒い部分）がクリックされたら
if (photoModal) {
    photoModal.addEventListener("click", function(e) {
        if (e.target === photoModal) { 
            photoModal.style.display = "none"; // モーダルを非表示
        }
    });
}