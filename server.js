// 必要なモジュールを読み込む
const express = require('express');
const app = express();
const session = require('express-session');
const path = require('path');
// const crypto = require('crypto'); // ダミー用 - 削除

// ===================================
// 0. DAOの読み込み（本番環境用）
//    - ⚠️ 実際のファイルパスに合わせて調整してください。
// ===================================
// 実際には、プロジェクト構造に応じてパスを修正する必要があります
const UserDAO = require('./dao/UserDAO'); 
const ReportDAO = require('./dao/ReportDAO');


// 環境変数PORTがあればそれを使用し、なければ8080を使用
const port = 8585;


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

// --- FIN001: ルートパス ("/") へのGETリクエスト (Welcome画面) ---
app.get('/', (req, res) => {
    const viewData = getCommonViewData(req);
    res.render('FIN001', { ...viewData, pageTitle: 'ウェルカム' });
});

// ----------------------------------------------------
// FIN002: ログイン画面の表示 (GET)
// ----------------------------------------------------
app.get('/FIN002', (req, res) => {
    const viewData = getCommonViewData(req);

    res.render('FIN002', {
        pageTitle: 'ログイン',
        error: viewData.error,
        message: viewData.message,
    });
});

// ----------------------------------------------------
// /login: ログイン認証処理 (POST)
// ----------------------------------------------------
app.post('/login', async (req, res) => {
    const { login_id, password } = req.body;
    
    // 入力値の簡易バリデーション
    if (!login_id || !password) {
        req.session.error = 'IDとパスワードを入力してください。';
        return res.redirect('/FIN002');
    }

    try {
        // UserDAO.authenticateUser は { user_id, user_name, email } または null を返すことを期待
        const user = await UserDAO.authenticateUser(login_id, password);

        if (user) {
            // 認証成功: セッションにユーザー情報を保存し、FIN004へリダイレクト
            req.session.user = { id: user.user_id, name: user.user_name, email: user.email };
            req.session.message = `おかえりなさい、${user.user_name}さん！`;
            return res.redirect('/FIN004'); 
        } else {
            // 認証失敗
            req.session.error = 'ID/メールアドレスまたはパスワードが正しくありません。';
            return res.redirect('/FIN002');
        }
    } catch (error) {
        console.error('ログイン処理エラー:', error);
        req.session.error = 'システムエラーが発生しました。';
        return res.redirect('/FIN002');
    }
});

// ----------------------------------------------------
// ⭐ FIN003: 新規登録画面の表示 (GET) ⭐
// ----------------------------------------------------
app.get('/FIN003', (req, res) => {
    const viewData = getCommonViewData(req);
    res.render('FIN003', {
        pageTitle: '新規登録',
        ...viewData
    });
});

// ----------------------------------------------------
// ⭐ /register-final: 新規登録処理 (POST) ⭐
// ----------------------------------------------------
app.post('/register-final', async (req, res) => {
    const { username, email, password, confirm_password } = req.body;

    // 簡易バリデーション
    if (!username || !email || !password || !confirm_password) {
        req.session.error = 'すべてのフィールドを入力してください。';
        return res.redirect('/FIN003');
    }

    if (password !== confirm_password) {
        req.session.error = 'パスワードと確認用パスワードが一致しません。';
        return res.redirect('/FIN003');
    }
    
    try {
        // UserDAO.registerUser は { success: true/false, userId: id, message: msg } を返すことを期待
        const result = await UserDAO.registerUser(username, email, password);

        if (result.success) {
            // 登録成功: ユーザーを即座にログイン状態にし、FIN004へリダイレクト
            // 登録成功時に UserDAO が userId を返すことを前提としています
            req.session.user = { id: result.userId, name: username, email: email };
            req.session.message = '新規登録が完了しました！早速始めましょう。'; 
            return res.redirect('/FIN004'); 
        } else {
            // 登録失敗 (例: メールアドレス重複など)
            req.session.error = result.message || '登録に失敗しました。';
            return res.redirect('/FIN003'); 
        }
    } catch (error) {
        console.error('新規登録処理エラー:', error);
        req.session.error = 'システムエラーが発生しました。';
        return res.redirect('/FIN003');
    }
});


// ----------------------------------------------------
// ⭐ FIN004: ホーム画面/登録完了確認画面 (GET) ⭐
// ----------------------------------------------------
app.get('/FIN004', requireLogin, (req, res) => {
    const viewData = getCommonViewData(req);
    // FIN004はログイン後のトップ画面を想定
    res.render('FIN004', {
        pageTitle: 'ホーム',
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
        res.redirect('/FIN002'); 
    });
});

// ----------------------------------------------------
// /search: お店検索ページの表示 (FIN006) (GET)
// ----------------------------------------------------
app.get('/search', (req, res) => {
    const viewData = getCommonViewData(req);
    // FIN006 テンプレートをレンダリングすることを想定
    res.render('FIN006', getCommonViewData(req)); 
});

// ----------------------------------------------------
// /search: お店検索処理 (POST)
// ----------------------------------------------------
app.post('/search', (req, res) => {
    // 検索処理の実装をここに追加
    console.log(req.body);
    res.send('検索機能は未実装です。');
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
    
    let pageTitle, labelName, actionUrl;

    if (mode === 'username') {
        pageTitle = 'ユーザー名変更';
        labelName = '新しいユーザー名';
        actionUrl = '/update-username';
    } else if (mode === 'email') {
        pageTitle = 'メールアドレス変更';
        labelName = '新しいメールアドレス';
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
app.get('/FIN014', requireLogin, (req, res) => {
    const viewData = getCommonViewData(req);
    res.render('FIN014', { pageTitle: 'パスワード変更', ...viewData });
});


// ----------------------------------------------------
// 更新処理 (POST) - 完了後FIN009へ共通リダイレクト
// ----------------------------------------------------

app.post('/update-username', requireLogin, async (req, res) => {
    const { newValue } = req.body; // フォームフィールド名を newValue に統一
    
    if (!newValue) {
        req.session.error = '新しいユーザー名を入力してください。';
        return res.redirect('/FIN_Profile_Edit/username');
    }

    try {
        // 1. DB更新
        // UserDAO.updateUsername は 成功/失敗に応じて true/false または例外を返すことを期待
        await UserDAO.updateUsername(req.session.user.id, newValue);
        // 2. セッション更新
        req.session.user.name = newValue; 
        
        req.session.message = `ユーザー名を「${newValue}」に変更しました。`;
        return res.redirect('/FIN009'); 
    } catch (e) {
        console.error('ユーザー名更新エラー:', e);
        req.session.error = 'ユーザー名の更新中にエラーが発生しました。';
        return res.redirect('/FIN_Profile_Edit/username'); 
    }
});

app.post('/update-email', requireLogin, async (req, res) => {
    const { newValue } = req.body; // フォームフィールド名を newValue に統一
    
    if (!newValue) {
        req.session.error = '新しいメールアドレスを入力してください。';
        return res.redirect('/FIN_Profile_Edit/email');
    }
    
    try {
        // 1. DB更新
        // UserDAO.updateEmail は 成功/失敗に応じて true/false または例外を返すことを期待
        await UserDAO.updateEmail(req.session.user.id, newValue);
        // 2. セッション更新
        req.session.user.email = newValue; 
        
        req.session.message = `メールアドレスを「${newValue}」に変更しました。`;
        return res.redirect('/FIN009');
    } catch (e) {
        console.error('メールアドレス更新エラー:', e);
        req.session.error = 'メールアドレスの更新中にエラーが発生しました。';
        return res.redirect('/FIN_Profile_Edit/email'); 
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
            res.redirect('/FIN002'); 
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