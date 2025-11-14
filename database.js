// 必要なモジュールを読み込む
const mysql = require('mysql2/promise');
// ⚠️ データベース接続情報 ⚠️
// 環境に合わせて、以下の情報を正確に設定してください。
const pool = mysql.createPool({
    host: '172.16.198.201',      // データベースサーバーのホスト名
    user: 'db_editor',// データベースユーザー名
    password: '047642', // データベースパスワード
    database: 'kubota_corp', // 使用するデータベース名
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

/**
 * 接続プールを使用してクエリを実行する関数
 * @param {string} sql - 実行するSQLクエリ
 * @param {Array<any>} params - クエリパラメータ
 * @returns {Promise<[rows: Array<any>, fields: Array<any>]>}
 */
exports.query = async (sql, params) => {
    try {
        // pool.queryは [rows, fields] のタプルを返します
        const [rows, fields] = await pool.query(sql, params);
        return [rows, fields];
    } catch (error) {
        console.error('MySQL Query Error:', error);
        // エラーを呼び出し元に再スロー
        throw error;
    }
};

// 接続テスト
pool.getConnection()
    .then(connection => {
        console.log('✅ MySQL接続プールが正常に作成されました。');
        connection.release();
    })
    .catch(err => {
        console.error('❌ MySQL接続エラー:', err.message);
        console.error('データベースのクレデンシャル（host, user, password, database）を確認してください。');
    });

module.exports = pool; // UserDAOがpool.queryを使用できるようにpoolをエクスポート