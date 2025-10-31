// server.js

// 必要なモジュールを読み込む
const express = require('express');
const app = express();
// 環境変数PORTがあればそれを使用し、なければ8080を使用
const port = process.env.PORT || 8080;

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

// POSTリクエストのフォームデータを解析するミドルウェア
app.use(express.urlencoded({ extended: true }));
// JSONデータを解析するミドルウェア
app.use(express.json());


// ===================================
// 3. ルーティングの設定
// ===================================

// ルートパス ("/") へのGETリクエストに対するハンドラ（ホームページ）(既存)
app.get('/', (req, res) => {
    // テンプレートに渡す動的なデータ
    const viewData = {
        pageTitle: 'EJSで動的なホームページ (Port 8080)',
        heading: 'Node.js Express EJSデモ',
        items: ['牛乳を買う', 'ブログを書く', 'Expressの勉強', 'ユーザー様向け情報'],
        currentTime: new Date().toLocaleString('ja-JP') // 現在時刻
    };

    // 'views/index.ejs'をレンダリングし、viewDataを渡す
    res.render('index', viewData);
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
    console.log(`アクセス: http://localhost:8080`);
    console.log(`動的レポート例: http://localhost:8080/report/5 (MySQLデータが必要)`);
});