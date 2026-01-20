const btn = document.getElementById('searchBtn');
const url = '/api/search-user';
const resArea = document.getElementById('res-area');

const postFetch = async () => {
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
    console.log(result.user);

    // 🔽 ここで画面を書き換える
    resArea.style.display = 'block';
    document.getElementById('res-userId').textContent = result.user.user_id;
    document.getElementById('res-userName').textContent = result.user.user_name;

  } catch (error) {
    console.error(error);
    alert('エラーが発生しました');
  }
};

btn.addEventListener('click', postFetch);
