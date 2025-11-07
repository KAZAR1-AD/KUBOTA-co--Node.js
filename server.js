// server.js
//後で消す
// 必要なモジュールを読み込む
const express = require('express');
const app = express();
const session = require('express-session');
const path = require('path');

// ===================================
// 0. ダミーDAOの定義 (実際には別途ファイルで実装が必要です)
// ===================================
const UserDAO = {
    authenticateUser: async (id, pw) => ({ user_id: 1, user_name: 'テストユーザー', email: 'test@example.com' }),
    registerUser: async (name, email, pw) => ({ success: true, userId: 2 }),
    updateUsername: async (id, newName) => true,
    updateEmail: async (id, newEmail) => true,
    updatePassword: async (id, currentPw, newPw) => true,
};
const ReportDAO = { findByReportId: async (id) => ({ title: 'Dummy Report', data: {} }) };


// 環境変数PORTがあればそれを使用し、なければ8080を使用
const port = process.env.PORT || 8080;


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
        secure: false, 
        maxAge: 1000 * 60 * 60 * 24 // 24時間
    }
}));


// ===================================
// 2. 共通処理とミドルウェア
// ===================================

/**
 * ログインユーザーの共通データ (isLoggedIn, userName, userId, email) を取得し、
 * セッションのエラー/メッセージを削除する。
 */
const getCommonViewData = (req) => {
    const isLoggedIn = !!req.session.user;
    
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
// 3. ルーティングの設定
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
        req.session.error = 'システムエラーが発生しました。';
        return res.redirect('/FIN002');
    }
});

// ----------------------------------------------------
// FIN003 (新規登録), FIN004 (ホーム/確認) ルートは省略...
// ----------------------------------------------------

// ----------------------------------------------------
// /logout: ログアウト処理 (POST)
// ----------------------------------------------------
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('ログアウト中にエラーが発生:', err);
            return res.status(500).send('ログアウトエラー');
        }
        res.redirect('/FIN002'); 
    });
});

// ----------------------------------------------------
// /search: お店検索ページの表示 (FIN006) (GET) - 依頼通り未修正で配置
// ----------------------------------------------------
app.get('/search', (req, res) => {
    // 🚨 注意: res.render('/FIN006', ...) は Express のパス指定として正しくありません。
    res.render('/FIN006', { pageTitle: 'お店検索' }); 
});


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
// FIN_Profile_Edit: ユーザー名/メールアドレス変更画面 (GET) - 共通化
// ----------------------------------------------------
app.get('/FIN_Profile_Edit/:mode', requireLogin, (req, res) => {
    const mode = req.params.mode; 
    const viewData = getCommonViewData(req);
    
    let pageTitle, labelName;

    if (mode === 'username') {
        pageTitle = 'ユーザー名変更';
        labelName = 'ユーザー名';
    } else if (mode === 'email') {
        pageTitle = 'メールアドレス変更';
        labelName = 'メールアドレス';
    } else {
        req.session.error = '不正な変更モードです。';
        return res.redirect('/FIN009');
    }

    res.render('FIN_Profile_Edit', { 
        pageTitle: pageTitle,
        labelName: labelName,
        mode: mode,
        ...viewData
    });
});

// ----------------------------------------------------
// FIN014: パスワード変更画面 (GET)
// ----------------------------------------------------
app.get('/FIN014', requireLogin, (req, res) => {
    const viewData = getCommonViewData(req);
    res.render('FIN014', { pageTitle: 'パスワード変更', ...viewData });
});


// ----------------------------------------------------
// 更新処理 (POST) - 完了後FIN009へ共通リダイレクト
// ----------------------------------------------------

app.post('/update-username', requireLogin, async (req, res) => {
    const { newUsername } = req.body;
    
    try {
        // 1. DB更新
        await UserDAO.updateUsername(req.session.user.id, newUsername);
        // 2. セッション更新
        req.session.user.name = newUsername; 
        
        req.session.message = `ユーザー名を「${newUsername}」に変更しました。`;
        return res.redirect('/FIN009'); 
    } catch (e) {
        req.session.error = 'ユーザー名の更新中にエラーが発生しました。';
        return res.redirect('/FIN_Profile_Edit/username'); 
    }
});

app.post('/update-email', requireLogin, async (req, res) => {
    const { newEmail } = req.body;
    
    try {
        // 1. DB更新
        await UserDAO.updateEmail(req.session.user.id, newEmail);
        // 2. セッション更新
        req.session.user.email = newEmail; 
        
        req.session.message = `メールアドレスを「${newEmail}」に変更しました。`;
        return res.redirect('/FIN009');
    } catch (e) {
        req.session.error = 'メールアドレスの更新中にエラーが発生しました。';
        return res.redirect('/FIN_Profile_Edit/email'); 
    }
});

app.post('/update-password', requireLogin, async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // **TODO:** パスワードのバリデーション、現在のパスワード認証、DB更新処理を実装
    
    try {
        await UserDAO.updatePassword(req.session.user.id, currentPassword, newPassword);
        req.session.message = 'パスワードの変更が完了しました。';
        return res.redirect('/FIN009');
    } catch (e) {
        req.session.error = 'パスワードの更新中にエラーが発生しました。';
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