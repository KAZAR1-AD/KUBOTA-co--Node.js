//  ---------------------------------------------------------------------
//  フレンド機能の画面（FIN017）にてフロントエンドの処理を実装
//  ---------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  let tabA = document.getElementsByClassName('fin017-list-container');
  
  let elm = document.createElement('div');
  elm.className = 'fin017-friend-item';

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
    document.getElementById('res-userId').textContent = result.user_id;
    document.getElementById('res-userName').textContent = result.user_name;

  } catch (error) {
    console.error(error);
    alert('エラーが発生しました');
  }
};

searchBtn.addEventListener('click', searchUser);
