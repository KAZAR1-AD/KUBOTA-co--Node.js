const db = require('../database');

// 必要なテーブルを定義
const STORE_TABLE = 'table_shop';

class ShopDAO {
    /**
     * お店データをすべて表示する
     * @returns {Object|null} - 店舗情報オブジェクト、または見つからなかった場合はnull
     */
    async findAll() {
        let connection;
        try {
            connection = await db.getConnection();
            const sql = `
                SELECT * 
                FROM ${STORE_TABLE} 
            `;

            const [rows] = await connection.execute(sql);

            if (rows.length === 0) {
                console.log(`[DAO-STORE] ❌ 店舗情報が見つかりません。`);
                return null;
            }

            console.log(`[DAO-STORE] ✅ 取得成功: 店舗情報を正常に取得しました。`);
            return rows;

        } catch (error) {
            console.error('【StoreDAO.js】店舗情報取得処理でデータベースエラーが発生:', error.message);
            throw new Error('データベース店舗情報取得処理中に予期せぬエラーが発生しました。');
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = new ShopDAO();