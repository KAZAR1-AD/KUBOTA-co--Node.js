// server.js

// 必要なモジュールを読み込む
const express = require('express');
const app = express();
const session = require('express-session');
const path = require('path');
// 仮のDAOインポート (実際には実装が必要です)
// const UserDAO = require('./dao/UserDAO'); 
// const ReportDAO = require('./dao/ReportDAO'); 

// 開発用にダミーのDAOオブジェクトを定義（エラーを防ぐため）
const UserDAO = {
    authenticateUser: async (id, pw) => ({ user_id: 1, user_name: 'TestUser', email: 'test@example.com' }),
    registerUser: async (name, email, pw) => ({ success: true, userId: 2 }),
    updateUsername: async (id, newName) => true,
    updateEmail: async (id, newEmail) => true,
    updatePassword: async (id, currentPw, newPw) => true,
};
const ReportDAO = { findByReportId: async (id) => ({ title: 'Dummy Report', data: {} }) };


// 環境変数PORTがあればそれを使用し、なければ8080を使用
const port = process.env.PORT || 8080;


// ===================================
// 1. DB接続とDAOの初期化 (ここではダミー)
// ===================================
// require('./database'); 


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
    secret: 'very_secure_random_string_for_session', 
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, 
        maxAge: 1000 * 60 * 60 * 24 // 24時間
    }
}));


// ===================================
// 3. 共通処理
// ===================================

/**
 * ログインユーザーの共通データ (isLoggedIn, userName, userId, email) を取得する。
 * エラー/メッセージは取得後にセッションから削除する。
 */
const getCommonViewData = (req) => {
    const isLoggedIn = !!req.session.user;
    
    // セッションからエラーとメッセージを取得し、次のリクエストのために削除
    const errorMsg = req.session.error;
    const successMsg = req.session.message;
    delete req.session.error;
    delete req.session.message;

    if (!isLoggedIn) {
        return { 
            isLoggedIn: false, 
            userName: null, 
            userId: null, 
            email: null,
            error: errorMsg,
            message: null
        };
    }
    
    return {
        isLoggedIn: true,
        userName: req.session.user.name,
        userId: req.session.user.id,
        email: req.session.user.email,
        error: errorMsg,
        message: successMsg
    };
};

/**
 * ログイン必須のルートでのアクセス制御 middleware
 */
const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        req.session.error = 'このページにアクセスするにはログインが必要です。';
        return res.redirect('/FIN002');
    }
    next();
};


// ===================================
// 4. ルーティングの設定 (FIN001 - FIN004, 認証)
// ===================================

// --- FIN001: ルートパス ("/") へのGETリクエスト ---
app.get('/', (req, res) => {
    const viewData = getCommonViewData(req);
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
    try {
        const user = await UserDAO.authenticateUser(login_id, password);

        if (user) {
            req.session.user = { id: user.user_id, name: user.user_name, email: user.email };
            return res.redirect('/FIN004'); 
        } else {
            req.session.error = 'ID/メールアドレスまたはパスワードが正しくありません。';
            return res.redirect('/FIN002');
        }
    } catch (error) {
        console.error('ログイン処理中にエラーが発生しました:', error);
        req.session.error = 'システムエラーが発生しました。';
        return res.redirect('/FIN002');
    }
});


// ----------------------------------------------------
// FIN003: 新規登録画面の表示 (GET)
// ----------------------------------------------------
app.get('/FIN003', (req, res) => {
    const viewData = { pageTitle: '新規登録', error: req.session.error };
    delete req.session.error;
    res.render('FIN003', viewData);
});

// ----------------------------------------------------
// /register-confirm & /register-final: 新規登録関連 (省略、前回のコードを参照)
// ----------------------------------------------------


// ----------------------------------------------------
// FIN004: 新規登録内容の確認画面 / ログイン後のホーム画面 (GET)
// ----------------------------------------------------
app.get('/FIN004', (req, res) => {
    if (req.session.user) {
         return res.render('FIN004', {
             pageTitle: 'ホーム画面',
             userName: req.session.user.name, 
             email: req.session.user.email,
             userId: req.session.user.id,
             isLoggedIn: true,
             error: null,
             username: req.session.user.name 
         });
    }
    // (登録確認ロジックは省略)
    res.redirect('/FIN003');
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
        res.redirect('/FIN002'); // ログイン画面へリダイレクト
    });
});

// ----------------------------------------------------
// /search: お店検索ページの表示 (FIN006) (GET) - 修正せずに配置
// ----------------------------------------------------
app.get('/search', (req, res) => {
    // ⚠ 注意: res.render('/FIN006', ...) は Express のパス指定として正しくありません。
    // このままでは動作しない可能性があります。
    res.render('/FIN006', { pageTitle: 'お店検索' }); 
});


// ===================================
// 5. 個人設定関連のルーティング (FIN009以降)
// ===================================

// ----------------------------------------------------
// FIN009: マイページ表示 (GET)
// ----------------------------------------------------
app.get('/FIN009', requireLogin, (req, res) => {
    const viewData = getCommonViewData(req);
    
    res.render('FIN009', {
        pageTitle: 'マイページ',
        ...viewData 
    });
});

// ----------------------------------------------------
// FIN010, FIN012, FIN014: 変更入力画面 (GET)
// ----------------------------------------------------
// メールアドレス変更画面
app.get('/FIN010', requireLogin, (req, res) => {
    const viewData = getCommonViewData(req);
    res.render('FIN010', { pageTitle: 'メールアドレス変更', ...viewData });
});

// ユーザー名変更画面
app.get('/FIN012', requireLogin, (req, res) => {
    const viewData = getCommonViewData(req);
    res.render('FIN012', { pageTitle: 'ユーザー名変更', ...viewData });
});

// パスワード変更画面
app.get('/FIN014', requireLogin, (req, res) => {
    const viewData = getCommonViewData(req);
    res.render('FIN014', { pageTitle: 'パスワード変更', ...viewData });
});


// ----------------------------------------------------
// 更新処理 (POST) - 完了後FIN009へリダイレクト
// ----------------------------------------------------
app.post('/update-username', requireLogin, async (req, res) => {
    const { newUsername } = req.body;
    
    // **TODO:** 1. DBでユーザー名を更新する処理 (await UserDAO.updateUsername(...))
    // 2. 成功したらセッションのユーザー名を更新する
    req.session.user.name = newUsername; 
    
    req.session.message = `ユーザー名を「${newUsername}」に変更しました。`;
    return res.redirect('/FIN009'); 
});

app.post('/update-email', requireLogin, async (req, res) => {
    const { newEmail } = req.body;
    // **TODO:** 1. DBでメールアドレスを更新する処理
    // 2. 成功したらセッションのメールアドレスを更新する
    req.session.user.email = newEmail; 
    
    req.session.message = `メールアドレスを「${newEmail}」に変更しました。`;
    return res.redirect('/FIN009');
});

app.post('/update-password', requireLogin, async (req, res) => {
    // **TODO:** 1. DBでパスワードを更新する処理（現在のパスワード認証も必要）
    
    req.session.message = 'パスワードの変更が完了しました。';
    return res.redirect('/FIN009');
});


// --- 404 Not Found エラーハンドリング ---
app.use((req, res, next) => {
    res.status(404).send("<h1>404 Not Found</h1><p>指定されたページは見つかりませんでした。</p>");
});


// ===================================
// 6. サーバーの起動
// ===================================

app.listen(port, () => {
    console.log(`🚀 サーバーが起動しました: http://localhost:${port}`);
});