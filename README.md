# KUBOTA-co--Node.js

<p>npmで入れたもの</p>

---

<ul>
  <li>Express</li>
  <li>ejs</li>
  <li>MySQL2</li>
  <li>Body-Parser</li>
  <li>bcrypt</li>
  <li>express-session</li>
  <li>config<li>
</ul>

アイコン画像
http://flat-icon-design.com/?paged=22

---

# セットアップ方法

### 1.ubuntuのインストール
  公式サイトで.isoイメージをダウンロード

  [ダウンロード](https://jp.ubuntu.com/download)

  今回開発環境ではUbuntu Desktopを使用していたがUbuntu Serverでも可

  LTS版をダウンロードして使用してください
  
  [参考文献](https://www.kkaneko.jp/tools/ubuntu/ubuntudesktop.html)
  

### 2.管理者ユーザーの作成
  rootユーザーは使用しない

  #### ユーザーの追加
  ```
  sudo adduser USER_NAME
  ```

  #### USER_NAMEさんを、sudoというグループに追加する
  ```
  sudo usermod -aG sudo USER_NAME
  ```
  

  [参考文献](https://www-creators.com/archives/241)

### 3.python3のインストール確認
  ```
  python3 --version
  ```
  入っていない場合はインストール
  ```
  sudo apt update
  sudo apt install python3
  ```

### 4.MySQLのインストール

### 5.UFWの設定

### 6.


---


