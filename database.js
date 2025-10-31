// database.js
//　まだ途中だから作業してくれめんす2025年10月24日
const mysql = require('mysql2/promise');

// データベース接続情報 (🚨 ここをあなたの環境に合わせて修正してください 🚨)
const dbConfig = {
    host: 'localhost',      
    user: 'db_editor', // MySQLのユーザー名
    password: '047642', // MySQLのパスワード
    database: 'kubota_corp', // 使用するデータベース名
    waitForConnections: true,
    connectionLimit: 10, // 同時接続数の上限
    queueLimit: 0
};

// 接続プールを作成
const pool = mysql.createPool(dbConfig);

// プールをエクスポート
module.exports = pool;

// サーバー起動時に接続確認を行う（オプション）
pool.getConnection()
    .then(connection => {
        console.log('✅ MySQL接続プールが正常に作成されました。');
        connection.release(); // 接続をプールに戻す
    })
    .catch(err => {
        console.error('❌ MySQL接続エラー:', err.message);
        // エラーが発生した場合は、DB設定やMySQLサーバーの稼働状況を確認してください。
    });