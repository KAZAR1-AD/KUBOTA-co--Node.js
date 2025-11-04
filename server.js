// server.js

// 必要なモジュールを読み込む
const express = require('express');
const app = express();
// 環境変数PORTがあればそれを使用し、なければ8080を使用
//各個人でかぶらないように変更してください
//default const port = process.env.PORT || 8080;
const port = 8080;

// ===================================
// ★ DB接続とDAOのインポート (追加/変更)
// ===================================
require('./database'); // database.jsを読み込み、MySQL接続プールを初期化
const ReportDAO = require('./dao/ReportDAO'); // 作成したDAOをインポート

// ===================================
// 1. EJSテンプレートエンジンの設定
// ===================================

// テンプレートエンジンをEJSに設定
app.set('view engine', 'ejs');

// テンプレートファイル（.ejsファイル）はプロジェクトルートの 'views' フォルダにあると指定
app.set('views', './views');

// ===================================
// ★ 2. ミドルウェアの設定 (追加/変更)
// ===================================

// 'public'ディレクトリ内のファイルを、ブラウザに直接公開する (既存)
app.use(express.static('public')); 
//＠これ使わないかも
//＠これつかわないとCSS読み込めない

// POSTリクエストのフォームデータを解析するミドルウェア
app.use(express.urlencoded({ extended: true }));
// JSONデータを解析するミドルウェア
app.use(express.json());
// body-parserミドルウェアの設定 (既存)
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())


// ===================================
// 3. ルーティングの設定
// ===================================

// ルートパス ("/") へのGETリクエストに対するハンドラ（ホームページ）(既存)
app.get('/', (req, res) => {
    // テンプレートに渡す動的なデータ
    const viewData = {
        isLoggedIn: false, // ユーザーのログイン状態
        //ログインしてるかどうかチェックしたい

        heading: 'Node.js Express EJSデモ',
        items: ['牛乳を買う', 'ブログを書く', 'Expressの勉強', 'ユーザー様向け情報'],
        currentTime: new Date().toLocaleString('ja-JP') // 現在時刻
    };

    // 'views/FIN001.ejs'をレンダリングし、viewDataを渡す
    res.render('FIN001', viewData);
});

// ----------------------------------------------------
// アンカータグの href="/FIN002" に対応するルート
// ----------------------------------------------------
//表示はかえたい/FIN002
app.get('/fin002', (req, res) => {
    // 1. 必要ならここでデータを取得・準備する処理（例: データベースからデータを取得）
        const viewData = {
        pageTitle: 'FIN002ページ',
        description: 'これはFIN002ページの説明です。',
        };
    // 2. FIN002.ejs テンプレートをレンダリングして、クライアントに送信する
    res.render('FIN002', viewData);
});

// ----------------------------------------------------
// アンカータグの href="/FIN003" に対応するルート
// ----------------------------------------------------
//表示はかえたい/FIN003
app.get('/FIN003', (req, res) => {
    // 1. 必要ならここでデータを取得・準備する処理（例: データベースからデータを取得）
        const viewData = {
        pageTitle: 'FIN002ページ',
        description: 'これはFIN002ページの説明です。',
        };
    // 2. FIN002.ejs テンプレートをレンダリングして、クライアントに送信する
    res.render('FIN003', viewData);
});

// 新規登録フォームの POST リクエスト処理
app.post('/register-confirm', (req, res) => {
    
    // req.body から入力データを受け取る
    const userData = {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirm_password
    };
    
    console.log('新規登録データを受信:', userData);
    
    // ここで以下の処理を実行します:
    // 1. バリデーション（パスワード一致確認、形式チェックなど）
    // 2. データベースへの登録処理（パスワードのハッシュ化も行う）
    
    // 処理が成功した場合、次の画面（FIN004）へリダイレクト
    // 重要なデータ（IDなど）があれば、セッションなどで保持します。
    res.redirect('/FIN004'); 
});

// FIN004 画面を表示する GET ルートも定義しておく必要があります
app.get('/FIN004', (req, res) => {
    // データを確認画面へ渡すなど
    const viewData = {
        username: 'サンプルユーザー', // 例として固定値
        email:  'sammple@email.com', // 例として固定値
        password: '********', // パスワードは表示しない
        confirmPassword: '********' // パスワードは表示しない
    };

    res.render('FIN004',viewData );
});


// ★ レポート詳細を表示する動的なルート (DAOを利用) (追加)
app.get('/report/:id', async (req, res) => {
    const id = req.params.id; // URLからIDを取得 (例: '5')

    // IDが数字であることを確認
    if (isNaN(id)) {
        return res.status(400).send('無効なレポートIDです。');
    }

    try {
        // ReportDAOを使ってMySQLからデータを取得
        const reportData = await ReportDAO.findByReportId(id);

        if (!reportData) {
            // データが見つからなかった場合は404エラー
            return res.status(404).send(`<h1>404 Not Found</h1><p>レポート FIN${String(id).padStart(3, '0')} は見つかりませんでした。</p>`);
        }

        // 取得したデータとviews/report_detail.ejsテンプレートを結合してレンダリング
        res.render('report_detail', { 
            pageTitle: reportData.title || `レポート #${id}`, 
            report: reportData // テンプレートにデータを渡す
        });

    } catch (err) {
        console.error('レポート取得処理エラー:', err);
        // データベース接続エラーなど
        res.status(500).send('サーバー内部エラーが発生しました。データベース接続を確認してください。');
    }
});


// ユーザー情報を示す動的なルートの例 (既存)
app.get('/users/:name', (req, res) => {
    // ... (既存のコード)
    res.send(`
        <!DOCTYPE html>
        <html lang="ja">
        <head><title>ユーザーページ</title></head>
        <body>
            <h1>Hello, ${req.params.name}!</h1>
            <p>これは動的なユーザーページです。</p>
            <p><a href="/">ホームに戻る</a></p>
        </body>
        </html>
    `);
});

// 存在しないページへのアクセスに対するエラーハンドリング（404 Not Found）(既存)
app.use((req, res, next) => {
    res.status(404).send("<h1>404 Not Found</h1><p>指定されたページは見つかりませんでした。</p>");
});


// ===================================
// 4. サーバーの起動
// ===================================

app.listen(port, () => {
    console.log(`サーバーが起動しました: http://localhost:${port}`);
    console.log(`アクセス: http://localhost:${port}`);
    console.log(`動的レポート例: http://localhost:8080/report/5 (MySQLデータが必要)`);
});