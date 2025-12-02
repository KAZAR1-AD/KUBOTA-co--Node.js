// 必要なモジュールを読み込む
const express = require('express');
const app = express();
const session = require('express-session');
const path = require('path');

// ===================================
// 0. DAOの読み込み（本番環境用）
//    - ⚠️ 実際のファイルパスに合わせて調整してください。
// ===================================
// 実際には、プロジェクト構造に応じてパスを修正する必要があります
const UserDAO = require('./dao/UserDAO');
const ReportDAO = require('./dao/ReportDAO');
const ShopDAO = require('./dao/ShopDAO');
// ★ 新しく作成したUserIconDAOをインポート ★
const UserIconDAO = require('./dao/UserIconDAO');


// 環境変数PORTがあればそれを使用し、なければ"config/baseport.json"を使用
const config = require('config');
const port = config.get('port');


// ===================================
// 1. ミドルウェアの設定
// ===================================

// EJSテンプレートエンジンの設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 静的ファイル（publicディレクトリ）のホスティング
app.use(express.static(path.join(__dirname, 'public')));

// POSTリクエストのフォームデータ/JSONデータを解析するミドルウェア
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// セッションミドルウェアの設定
app.use(session({
    secret: 'very_secure_random_string_for_session',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // 開発環境向け
        maxAge: 1000 * 60 * 60 * 24 // 24時間
    }
}));

// ブラウザに「画面を保存するな」と命令するミドルウェア
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});

// ★追加：すべての画面で「今のURL」を使えるようにする
app.use((req, res, next) => {
    // res.locals に入れた変数は、すべてのEJSで <%= currentUrl %> として使えます
    res.locals.currentUrl = req.originalUrl;
    next();
});

// ===================================
// 2. 共通処理とミドルウェア
// ===================================

/**
 * ダミーのパスワードマスク関数
 * @param {string} password 
 * @returns {string} 
 */
function maskPassword(password) {
    if (!password) return '';
    // 画面表示用のマスク（文字数に合わせて調整可能）
    return '*'.repeat(password.length > 8 ? 8 : password.length);
}

/**
 * ログインユーザーの共通データ (isLoggedIn, userName, userId, email, profilePhotoId, userIconUrl) を取得し、
 * セッションのエラー/メッセージを削除する。
 * ★ UserIconDAOからアイコンURLを取得する処理を追加 ★
 */
const getCommonViewData = async (req) => { // ★ async を追加
    const isLoggedIn = !!req.session.user;

    const errorMsg = req.session.error;
    const successMsg = req.session.message;
    delete req.session.error;
    delete req.session.message;

    const baseData = {
        isLoggedIn: isLoggedIn,
        userName: isLoggedIn ? req.session.user.name : null,
        userId: isLoggedIn ? req.session.user.id : null,
        email: isLoggedIn ? req.session.user.email : null,
        profilePhotoId: isLoggedIn ? req.session.user.profilePhotoId : null,
        error: errorMsg,
        message: successMsg,
        userIconUrl: '/images/user_icon/default.png' // デフォルトアイコンURL
    };

    if (baseData.isLoggedIn && baseData.profilePhotoId) {
        try {
            // ★ UserIconDAOを使用してアイコンURLを取得 ★
            const url = await UserIconDAO.getIconUrlByPhotoId(baseData.profilePhotoId);
            if (url) {
                baseData.userIconUrl = url;
            }
        } catch (e) {
            console.error('ヘッダー用アイコンURL取得中にエラー:', e.message);
            // エラーが発生してもデフォルトURLで処理を続行する
        }
    }

    return baseData;
};

/**
 * ログイン必須のルートでのアクセス制御 middleware
 */
const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        req.session.error = 'このページにアクセスするにはログインが必要です。';
        return res.redirect('/welcome');
    }
    next();
};


// ===================================
// 3. ルーティングの設定
// ===================================

// --- FIN001: ルートパス ("/") へのGETリクエスト (Welcome画面) ---
app.get('/', async (req, res) => { // ★ async を追加
    const viewData = await getCommonViewData(req); // ★ await を追加
    res.render('FIN001', { ...viewData, pageTitle: '船橋いまなにする？' });
});

// ----------------------------------------------------
// FIN002: ログイン画面の表示 (GET)
// ----------------------------------------------------
app.get('/welcome', async (req, res) => { // ★ async を追加
    const viewData = await getCommonViewData(req); // ★ await を追加

    // クエリパラメータ(?returnUrl=...)があればそれを取得。なければトップページ(/)にする
    const backUrl = req.query.returnUrl || '/';

    res.render('FIN002', {
        pageTitle: 'ログイン',
        error: viewData.error,
        message: viewData.message,
        backUrl: backUrl // ★EJSに「戻る先」を渡す
    });
});

// ----------------------------------------------------
// /login: ログイン認証処理 (POST)
// ----------------------------------------------------
app.post('/login', async (req, res) => {
    const { login_id, password, returnUrl } = req.body;

    // 入力値の簡易バリデーション
    if (!login_id || !password) {
        req.session.error = 'IDとパスワードを入力してください。';
        return res.redirect('/welcome');
    }

    try {
        // UserDAO.authenticateUser は { user_id, user_name, email, profile_photo_id } または null を返すことを期待
        const user = await UserDAO.authenticateUser(login_id, password);

        if (user) {
            // 認証成功: セッションにユーザー情報を保存し、FIN001（ルートパス）へリダイレクト
            req.session.user = {
                id: user.user_id,
                name: user.user_name,
                email: user.email,
                profilePhotoId: user.profile_photo_id // ★ profile_photo_id をセッションに保存
            };
            req.session.message = `おかえりなさい、${user.user_name}さん！`;
            // returnUrl があればそこへ、なければトップページ('/')へリダイレクト
            // 例：FIN006から来たなら '/search' に戻るようになります
            const redirectDestination = returnUrl || '/';
            return res.redirect(redirectDestination);
        } else {
            // 認証失敗
            req.session.error = 'ID/メールアドレスまたはパスワードが正しくありません。';
            return res.redirect('/welcome');
        }
    } catch (error) {
        console.error('ログイン処理エラー:', error);
        req.session.error = 'システムエラーが発生しました。';
        return res.redirect('/welcome');
    }
});

// ----------------------------------------------------
// ⭐ FIN003: 新規登録画面の表示 (GET) ⭐
// ----------------------------------------------------
app.get('/register', async (req, res) => { // ★ async を追加
    const viewData = await getCommonViewData(req); // ★ await を追加
    // 新しいフローでは、最初に戻る際にセッションに一時保存されたデータを削除します
    const formData = req.session.formData || {};
    req.session.formData = null;

    res.render('FIN003', {
        pageTitle: '新規登録',
        ...viewData,
        formData: formData
    });
});

// ----------------------------------------------------
// ⭐ /register-confirm: 新規登録確認処理 (POST) ⭐
// FIN003からデータを受け取り、セッションに保存し、FIN004（確認画面）へ遷移
// ----------------------------------------------------
app.post('/register-confirm', async (req, res) => {
    const { username, email, password, confirm_password } = req.body;
    const viewData = await getCommonViewData(req);
    req.session.formData = { username, email }; // 入力値をセッションに保存

    // 簡易バリデーション
    if (!username || !email || !password || !confirm_password) {
        req.session.error = 'すべてのフィールドを入力してください。';
        return res.redirect('/register');
    }

    if (checkPasswordStrings(password) === false) {
        req.session.error = 'パスワードは英数字8文字以上で設定してください。';
        return res.redirect('/register');
    }

    if (password !== confirm_password) {
        req.session.error = 'パスワードと確認用パスワードが一致しません。';
        return res.redirect('/register');
    }

    try {
        // メールアドレスの重複チェック（FIN003側ではDBアクセスを行わない設計のため、このタイミングでチェック）
        // UserDAOに isEmailTaken メソッドがあると仮定
        const isEmailTaken = await UserDAO.isEmailTaken(email);
        if (isEmailTaken) {
            req.session.error = 'このメールアドレスは既に使用されています。';
            return res.redirect('/register');
        }

        delete req.session.formData; // 重複チェック成功後、フォームデータをセッションから削除

        // 確認画面表示のためにデータをセッションに一時保存
        // 生のパスワードを次のステップのために保持する
        req.session.registerData = { username, email, password };

        // FIN004 (確認画面) をレンダリング
        res.render('FIN004', {
            pageTitle: '登録内容確認',
            ...viewData,
            // 確認画面に必要なデータ
            username: username,
            useremail: email,
            passwordMasked: maskPassword(password),
            // FIN004テンプレートはセッションではなくEJSの変数を使って表示します
        });

    } catch (e) {
        console.error('登録前チェックエラー:', e);
        req.session.error = '登録処理中にエラーが発生しました。';
        return res.redirect('/register');
    }
});

/**
 * パスワード文字列のチェック関数
 * パスワードが英数字８文字以上であればtrueを返す、それ以外はfalseを返す
 * @param {string} password
 * @returns {boolean}
 */
function checkPasswordStrings(password) {
    const regex = new RegExp(/^([a-zA-Z0-9]{8,})$/);
    password = String(password);
    if (regex.test(password)) {
        return true;
    }
    return false;
}


// ----------------------------------------------------
// ⭐ /register-final: 最終登録処理 (POST) ⭐
// FIN004から最終承認を受け取り、DB登録を実行し、FIN005（完了画面）へ遷移
// ----------------------------------------------------
// 既存の旧登録ロジックを、セッションを利用した新しい最終登録ロジックに置き換えます
app.post('/register-final', async (req, res) => {
    // セッションから一時保存された登録データを取得
    const registerData = req.session.registerData;

    // セッションにデータがない場合は、不正なアクセスとしてFIN003に戻す
    if (!registerData) {
        req.session.error = '登録情報が見つかりませんでした。最初からやり直してください。';
        return res.redirect('/register');
    }

    const { username, email, password } = registerData;

    try {
        // UserDAO.registerUser は { success: true/false, userId: id, message: msg } を返すことを期待
        const result = await UserDAO.registerUser(username, email, password);

        if (result.success) {
            // 登録成功: ユーザーを即座にログイン状態にし、FIN005へリダイレクト
            req.session.user = {
                id: result.userId,
                name: username,
                email: email,
                profilePhotoId: null // 登録時は初期値としてnullを設定
            };
            req.session.message = '新規登録が完了しました！早速始めましょう。';

            // 登録データはもう不要なのでセッションから削除
            delete req.session.registerData;

            // 新しい完了画面FIN005へリダイレクト
            return res.redirect('/FIN005');
        } else {
            // 登録失敗 
            req.session.error = result.message || '登録に失敗しました。';
            delete req.session.registerData; // 失敗したので削除
            return res.redirect('/register');
        }
    } catch (error) {
        console.error('新規登録処理エラー:', error);
        req.session.error = 'システムエラーが発生しました。';
        delete req.session.registerData; // 失敗したので削除
        return res.redirect('/register');
    }
});


// ----------------------------------------------------
// ⭐ FIN004: ホーム画面 (GET) - ログイン必須 ⭐
// ----------------------------------------------------
// 既存のログイン後ホーム画面ルートはそのまま残します。
app.get('/FIN004', requireLogin, async (req, res) => { // ★ async を追加
    const viewData = await getCommonViewData(req); // ★ await を追加
    // FIN004はログイン後のトップ画面を想定
    res.render('FIN004', {
        pageTitle: 'ホーム',
        ...viewData
    });
});


// ----------------------------------------------------
// ⭐ FIN005: 登録完了画面 (GET) ⭐
// ----------------------------------------------------
app.get('/FIN005', async (req, res) => {
    // 登録完了後のリダイレクト先。セッションにユーザー情報があるかを確認
    if (!req.session.user) {
        // 不正なアクセスやセッション切れの場合、ログイン画面へ
        req.session.error = '登録完了情報が確認できませんでした。ログインしてください。';
        return res.redirect('/welcome');
    }

    const viewData = await getCommonViewData(req);

    res.render('FIN005', {
        pageTitle: '登録完了',
        ...viewData
    });
});


// ----------------------------------------------------
// /logout: ログアウト処理 (POST)
// ----------------------------------------------------
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('ログアウト中にエラーが発生:', err);
            return res.status(500).send('ログアウトエラー');
        }
        res.redirect('/welcome');
    });
});

// ----------------------------------------------------
// /search: お店検索ページの表示 (FIN006) (GET)
// ----------------------------------------------------
app.get('/search', async (req, res) => { // ★ async を追加
    const viewData = await getCommonViewData(req); // ★ await を追加
    // FIN006 テンプレートをレンダリングすることを想定
    res.render('FIN006', viewData);
});

// ----------------------------------------------------
// /search: お店検索処理 (POST)
// フォームから送られてきた条件をセッションに保存し、結果ページへ転送
// ----------------------------------------------------
app.post('/search', async (req, res) => {
    const { budget, distance, genre } = req.body;

    console.log(budget); // デバッグ用
    console.log(distance); // デバッグ用
    console.log(genre); // デバッグ用

    try {
        const result = await ShopDAO.findByOptions(budget, distance, genre);
        // FIN007をレンダリングする際も共通データを渡す必要があるため、取得
        const viewData = await getCommonViewData(req);
        req.session.shop = result;
        return res.render('FIN007', { ...viewData,  });
    } catch (error) {
        console.error('お店検索処理エラー:', error);
        req.session.error = 'お店の検索中にエラーが発生しました。';
        return res.redirect('/search');
    }
});

// ----------------------------------------------------
// FIN008: メニュー画面 (GET) - /mypage ルート
// ----------------------------------------------------

app.get('/mypage', requireLogin, async (req, res) => { // ★ async を追加

    const viewData = await getCommonViewData(req); // ★ await を追加
    res.render('FIN008', {
        pageTitle: 'メニュー', // 画面名がアイコン設定よりもメニューの方が適切かもしれないため調整
        ...viewData
    });
});

// ----------------------------------------------------
// FIN019: プロフィール画像変更画面 (GET) - ログイン必須 ★ここから追加★
// ----------------------------------------------------
app.get('/changeIcon', requireLogin, async (req, res) => {
    const viewData = await getCommonViewData(req);

    try {
        // UserIconDAO を使って、ユーザーが選択可能な全てのアイコンリストを取得する
        // DAOは [{ id: 1, url: '...', name: '...' }, ...] のような配列を返すと仮定
        const availableIcons = await UserIconDAO.getAllIcons();

        res.render('FIN019_modal', {
            pageTitle: 'プロフィール画像変更',
            ...viewData,
            availableIcons: availableIcons // 選択肢のアイコンリスト
        });
    } catch (e) {
        console.error('FIN019 画面表示エラー（アイコンリスト取得失敗）:', e);
        // エラーが発生した場合は、エラーメッセージをセッションに保存してメニュー画面に戻す
        req.session.error = 'アイコンリストの取得中にエラーが発生しました。';
        res.redirect('/mypage'); 
    }
});
// ----------------------------------------------------
// FIN009: マイページ表示 (GET)
// ----------------------------------------------------
app.get('/FIN009', requireLogin, async (req, res) => { // ★ async を追加
    const viewData = await getCommonViewData(req); // ★ await を追加

    res.render('FIN009', {
        pageTitle: 'マイページ',
        ...viewData
    });
});

// ----------------------------------------------------
// FIN_Profile_Edit: ユーザー名/メールアドレス変更画面 (GET) - 共通化
// ----------------------------------------------------
app.get('/FIN_Profile_Edit/:mode', requireLogin, async (req, res) => { // ★ async を追加
    const mode = req.params.mode;
    const viewData = await getCommonViewData(req); // ★ await を追加

    let pageTitle, labelName, actionUrl;

    if (mode === 'username') {
        pageTitle = 'ユーザー名変更';
        labelName = 'ユーザー名';
        actionUrl = '/update-username';
    } else if (mode === 'email') {
        pageTitle = 'メールアドレス変更';
        labelName = 'メールアドレス';
        actionUrl = '/update-email';
    } else {
        req.session.error = '不正な変更モードです。';
        return res.redirect('/FIN009');
    }

    res.render('FIN_Profile_Edit', {
        pageTitle: pageTitle,
        labelName: labelName,
        mode: mode,
        actionUrl: actionUrl,
        currentValue: (mode === 'username' ? viewData.userName : viewData.email),
        ...viewData
    });
});

// ----------------------------------------------------
// FIN014: パスワード変更画面 (GET)
// ----------------------------------------------------
app.get('/FIN014', requireLogin, async (req, res) => { // ★ async を追加
    const viewData = await getCommonViewData(req); // ★ await を追加
    res.render('FIN014', { pageTitle: 'パスワード変更', ...viewData });
});


// ----------------------------------------------------
// 更新処理 (POST) - 完了後FIN009へ共通リダイレクト
// ----------------------------------------------------

// ユーザー名更新処理
app.post('/update-username', requireLogin, async (req, res) => {
    // フォームからは 'newUsername' という名前でデータが送信されるため、それを取得する
    const { newUsername } = req.body;

    if (!newUsername) {
        req.session.error = '新しいユーザー名を入力してください。';
        return res.redirect('/FIN_Profile_Edit/username');
    }

    try {
        // 1. DB更新
        await UserDAO.updateUsername(req.session.user.id, newUsername);
        // 2. セッション更新
        req.session.user.name = newUsername;

        req.session.message = `ユーザー名を「${newUsername}」に変更しました。`;
        return res.redirect('/FIN009');
    } catch (e) {
        console.error('ユーザー名更新エラー:', e);
        req.session.error = 'ユーザー名の更新中にエラーが発生しました。';
        return res.redirect('/FIN_Profile_Edit/username');
    }
});

// メールアドレス更新処理
app.post('/update-email', requireLogin, async (req, res) => {
    // フォームからは 'newEmail' という名前でデータが送信されるため、それを取得する
    const { newEmail } = req.body;

    if (!newEmail) {
        req.session.error = '新しいメールアドレスを入力してください。';
        return res.redirect('/FIN_Profile_Edit/email');
    }

    try {
        // 1. DB更新
        await UserDAO.updateEmail(req.session.user.id, newEmail);
        // 2. セッション更新
        req.session.user.email = newEmail;

        req.session.message = `メールアドレスを「${newEmail}」に変更しました。`;
        return res.redirect('/FIN009');
    } catch (e) {
        console.error('メールアドレス更新エラー:', e);
        req.session.error = 'メールアドレスの更新中にエラーが発生しました。';
        return res.redirect('/FIN_Profile_Edit/email');
    }
});

// プロフィール画像ID更新処理 (★ 新規追加)
app.post('/update-profile-photo', requireLogin, async (req, res) => {
    // フォームから新しいprofile_photo_idを取得（ここでは 'newPhotoId' と仮定）
    let { newPhotoId } = req.body;

    // newPhotoId が 'null' 文字列、空文字列、または '0' の場合はDBのNULLとして処理
    const photoId = (newPhotoId === null || newPhotoId === '' || newPhotoId === 'null' || newPhotoId === '0')
        ? null
        : parseInt(newPhotoId, 10);

    // 数値でない、かつnullでもない場合はエラー
    if (photoId !== null && (isNaN(photoId) || photoId <= 0)) {
        req.session.error = '不正な画像IDが指定されました。';
        return res.redirect('/mypage');
    }

    try {
        // 1. DB更新 (UserDAOを使用)
        await UserDAO.updateProfilePhotoId(req.session.user.id, photoId);

        // 2. セッション更新
        req.session.user.profilePhotoId = photoId;

        req.session.message = photoId === null ? 'プロフィール画像をリセットしました。' : 'プロフィール画像を変更しました。';
        return res.redirect('/mypage'); // マイページへリダイレクト
    } catch (e) {
        console.error('プロフィール画像ID更新エラー:', e);
        // UserDAOから投げられたデータベースエラーを捕捉
        req.session.error = e.message || 'プロフィール画像の更新中にエラーが発生しました。';
        return res.redirect('/mypage');
    }
});


app.post('/update-password', requireLogin, async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        req.session.error = 'すべてのパスワードフィールドを入力してください。';
        return res.redirect('/FIN014');
    }

    if (newPassword !== confirmPassword) {
        req.session.error = '新しいパスワードと確認用パスワードが一致しません。';
        return res.redirect('/FIN014');
    }

    try {
        // UserDAO.updatePassword は現在のパスワードが正しければ true、そうでなければ false を返すことを期待
        const success = await UserDAO.updatePassword(req.session.user.id, currentPassword, newPassword);

        if (!success) {
            req.session.error = '現在のパスワードが正しくありません。';
            return res.redirect('/FIN014');
        }

        req.session.message = 'パスワードの変更が完了しました。再度ログインしてください。';
        // パスワード変更後はセキュリティのためセッションを破棄し、再ログインを促す
        req.session.destroy(err => {
            if (err) {
                console.error('パスワード変更後のセッション破棄エラー:', err);
                return res.status(500).send('パスワード変更後の処理エラー');
            }
            res.redirect('/welcome');
        });

    } catch (e) {
        console.error('パスワード更新エラー:', e);
        // UserDAOから投げられたデータベースエラーを捕捉
        req.session.error = e.message || 'パスワードの更新中にエラーが発生しました。';
        return res.redirect('/FIN014');
    }
});


// --- 404 Not Found エラーハンドリング ---
app.use((req, res, next) => {
    res.status(404).send("<h1>404 Not Found</h1><p>指定されたページは見つかりませんでした。</p>");
});


// ===================================
// 4. サーバーの起動
// ===================================

app.listen(port, () => {
    console.log(`🚀 サーバーが起動しました: http://localhost:${port}`);
});