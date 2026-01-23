//  ---------------------------------------------------------------------
//  フレンド機能の画面（FIN017）にてフロントエンドの処理を実装
//  ---------------------------------------------------------------------

// フォロー・フォロー解除
document.addEventListener("click", async (e) => {
  const heart = e.target.closest(".fin017-heart");
  if (!heart) return;

  const friendItem = heart.closest(".fin017-friend-item");
  const targetUserId = friendItem.querySelector(".fin017-userid").textContent;
  const isFollowing = heart.dataset.isFollowing === "true";
  const url = isFollowing ? "/api/unfollow" : "/api/follow";

  // 連打防止
  heart.style.pointerEvents = "none";

  try {
      const response = await fetch(url, {
          method: "POST",
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify({ targetUserId })
      });

      if (!response.ok) {
          throw new Error("follow api failed");
      }

      // UI更新
      heart.dataset.isFollowing = (!isFollowing).toString();
      heart.textContent = isFollowing ? "🤍" : "❤️";

  } catch (err) {
      console.error(err);
      alert("フォロー処理に失敗しました");
  } finally {
      heart.style.pointerEvents = "auto";
  }
});



// 検索
const searchBtn = document.getElementById('searchBtn');
const resArea = document.getElementById('res-area');

const searchUser = async () => {
  const url = '/api/search-user';
  const keyword = document.getElementById('search-id').value;

  if (!keyword.trim()) {
    alert('検索IDを入力してください');
    return;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ keyword })
    });

    if (!res.ok) {
      throw new Error('検索失敗');
    }

    const result = await res.json();


    // 🔽 ここで画面を書き換える
    resArea.style.display = 'block';
    resArea.querySelector('.fin017-userid').textContent = result.user_id;
    resArea.querySelector('.fin017-username').textContent = result.user_name;

    const heart = resArea.querySelector('.fin017-heart');
    heart.dataset.isFollowing = result.is_following ? "true" : "false";
    heart.textContent = result.is_following ? '❤️' : '🤍';


  } catch (error) {
    console.error(error);
    alert('エラーが発生しました');
  }
};

searchBtn.addEventListener('click', searchUser);
