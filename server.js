// server.js

// 必要なモジュールを読み込む
const express = require('express');
const app = express();
const session = require('express-session');
const path = require('path');
const UserDAO = require('./dao/UserDAO'); // 作成したUserDAOをインポート
const ReportDAO = require('./dao/ReportDAO'); // ReportDAOをインポート

// 環境変数PORTがあればそれを使用し、なければ8080を使用
const port =  8585;


// ===================================
// 1. DB接続とDAOの初期化
// ===================================
require('./database'); // database.jsを読み込み、MySQL接続プールを初期化


// ===================================
// 2. ミドルウェアの設定
// ===================================

// EJSテンプレートエンジンの設定
app.set('view engine', 'ejs');
// viewsディレクトリの場所を指定
app.set('views', path.join(__dirname, 'views'));

// 静的ファイル（publicディレクトリ）のホスティング
app.use(express.static(path.join(__dirname, 'public')));

// POSTリクエストのフォームデータ/JSONデータを解析するミドルウェア
app.use(express.urlencoded({ extended: true })); // フォームデータ
app.use(express.json()); // JSONデータ

// セッションミドルウェアの設定
app.use(session({
    secret: 'very_secure_random_string_for_session', // 秘密鍵を設定
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // 開発環境向け
        maxAge: 1000 * 60 * 60 * 24 // 24時間
    }
}));


// ===================================
// 3. ルーティングの設定 (ここを修正しました)
// ===================================

// --- FIN001: ルートパス ("/") へのGETリクエスト ---
app.get('/', (req, res) => {
    const viewData = {
        isLoggedIn: !!req.session.user, // セッションにユーザー情報があれば true
        userName: req.session.user ? req.session.user.name : null,
    };
    res.render('FIN001', viewData);
});

// ----------------------------------------------------
// FIN002: ログイン画面の表示 (GET)
// ----------------------------------------------------
app.get('/FIN002', (req, res) => {
    const errorMsg = req.session.error;
    delete req.session.error;

    res.render('FIN002', {
        error: errorMsg,
        pageTitle: 'ログイン',
        description: 'IDまたはメールアドレスとパスワードを入力してください。',
    });
});

// ----------------------------------------------------
// /login: ログイン認証処理 (POST)
// ----------------------------------------------------
app.post('/login', async (req, res) => {
    const { login_id, password } = req.body;

    // デバッグ用ログ (本番環境では削除またはログレベルを調整)
    console.log(`[SERVER] 🔐 ログイン試行: login_id=${login_id}`);
    console.log(`[SERVER] 🔐 パスワード: ${password}`);

    if (!login_id || !password) {
        req.session.error = 'ID/メールアドレスとパスワードの両方を入力してください。';
        return res.redirect('/FIN002');
    }

    try {
        const user = await UserDAO.authenticateUser(login_id, password);

        if (user) {
            req.session.user = {
                id: user.user_id,
                name: user.user_name,
                email: user.email
            };
            return res.redirect('/FIN004'); // ログイン成功後はFIN004へ
        } else {
            req.session.error = 'ID/メールアドレスまたはパスワードが正しくありません。';
            return res.redirect('/FIN002');
        }
    } catch (error) {
        console.error('ログイン処理中にエラーが発生しました:', error);
        req.session.error = 'システムエラーが発生しました。時間をおいて再度お試しください。';
        return res.redirect('/FIN002');
    }
});


// ----------------------------------------------------
// FIN003: 新規登録画面の表示 (GET)
// ----------------------------------------------------
app.get('/FIN003', (req, res) => {
    const viewData = {
        pageTitle: '新規登録',
        description: 'ユーザー情報を入力してください。',
        error: req.session.error
    };
    delete req.session.error;
    res.render('FIN003', viewData);
});

// ----------------------------------------------------
// /register-confirm: 新規登録フォームの POST リクエスト処理 (確認画面へリダイレクト)
// ----------------------------------------------------
app.post('/register-confirm', async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    // 1. バリデーションチェック (簡易)
    if (!username || !email || !password || !confirmPassword || password !== confirmPassword) {
        req.session.error = '入力内容に不備があります。';
        return res.redirect('/FIN003');
    }

    // 2. ユーザーデータをセッションに一時保存
    req.session.registrationData = { username, email, password };

    // 3. FIN004（確認画面）へリダイレクト
    return res.redirect('/FIN004');
});


// ----------------------------------------------------
// ★ FIN004: 新規登録内容の確認画面 / ログイン後のホーム画面 (GET)
// ----------------------------------------------------
app.get('/FIN004', (req, res) => {
    // ログイン済みならホーム画面として動作させる
    if (req.session.user) {
         // ここはFIN004をホーム画面として利用する場合のロジック
         return res.render('FIN004', { // FIN004.ejsをホーム画面としても利用
            pageTitle: 'ホーム画面',
            userName: req.session.user.name, 
            email: req.session.user.email,
            userId: req.session.user.id,
            error: null // ホーム画面にエラーは不要
        });
    }

    // 登録確認画面として動作させる
    const regData = req.session.registrationData;
    const errorMsg = req.session.error;
    delete req.session.error;

    if (!regData) {
        req.session.error = '登録セッションが切れました。最初からやり直してください。';
        return res.redirect('/FIN003');
    }

    // 確認画面としてレンダリング (ユーザー情報を表示)
    res.render('FIN004', {
        pageTitle: '登録内容の確認',
        error: errorMsg,
        username: regData.username,
        email: regData.email,
        // FIN004.ejsがホーム画面も兼ねる場合、必要な変数をダミーで設定（例：userName, userId）
        userName: regData.username,
        userId: '未登録'
    });
});

// ----------------------------------------------------
// ★ /register-final: 最終登録処理 (DB保存)
// ----------------------------------------------------
app.post('/register-final', async (req, res) => {
    const regData = req.session.registrationData;

    if (!regData) {
        req.session.error = '登録セッションが切れました。';
        return res.redirect('/FIN003');
    }

    try {
        // DAOを呼び出し、ユーザーを登録
        const result = await UserDAO.registerUser(regData.username, regData.email, regData.password);
        
        if (result.success) {
            // ✅ 登録成功: セッションから一時データを削除し、自動ログイン
            delete req.session.registrationData;
            req.session.user = { id: result.userId, name: regData.username, email: regData.email };
            
            console.log(`[SERVER] 🚀 新規登録完了・自動ログイン: UserID ${result.userId}`);
            
            // ログイン後のFIN004へリダイレクト（ホーム画面として動作）
            return res.redirect('/FIN004'); 
            
        } else {
            // ❌ 登録失敗 (メールアドレス重複など)
            delete req.session.registrationData; // セッションデータは破棄
            req.session.error = result.message || 'ユーザー登録中にエラーが発生しました。';
            return res.redirect('/FIN003');
        }

    } catch (error) {
        console.error('[SERVER] 💣 最終登録処理中にエラー:', error.message);
        delete req.session.registrationData;
        req.session.error = 'システムエラーが発生しました。';
        return res.redirect('/FIN003');
    }
});

// ----------------------------------------------------
// /logout: ログアウト処理 (POST) - ★修正後の正しい配置
// ----------------------------------------------------
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('ログアウト中にエラーが発生:', err);
            return res.status(500).send('ログアウトエラー');
        }
        res.redirect('/FIN002'); // ログイン画面へリダイレクト
    });
});

// ----------------------------------------------------
// /search: お店検索ページの表示 (GET)
// ----------------------------------------------------
// 作りかけです
app.get('/search', (req, res) => {
    res.render('/FIN006', { pageTitle: 'お店検索' });
});


// --- レポート詳細を表示する動的なルート (DAOを利用) ---
app.get('/report/:id', async (req, res) => {
    const id = req.params.id;
    if (isNaN(id)) return res.status(400).send('無効なレポートIDです。');
    try {
        const reportData = await ReportDAO.findByReportId(id);
        if (!reportData) return res.status(404).send(`<h1>404 Not Found</h1>`);
        res.render('report_detail', { pageTitle: reportData.title || `レポート #${id}`, report: reportData });
    } catch (err) {
        console.error('レポート取得処理エラー:', err);
        res.status(500).send('サーバー内部エラーが発生しました。');
    }
});


// --- ユーザー情報を示す動的なルートの例 ---
app.get('/users/:name', (req, res) => {
    res.send(`<h1>Hello, ${req.params.name}!</h1><p><a href="/">ホームに戻る</a></p>`);
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