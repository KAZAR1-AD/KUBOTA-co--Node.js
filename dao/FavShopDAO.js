const db = require('../database');

/**
 * お気に入り店舗管理 DAO
 * ちゃっぴーによる実装
 * これから検証します
 */
class FavShopDAO {
    async syncFavorites(userId, shopIds) {
        let connection;
        try {
            connection = await db.pool.getConnection();

            // トランザクションで一括処理
            await connection.beginTransaction();

            // まず既存レコードを全削除
            await connection.query(
                'DELETE FROM table_favorite WHERE user_id = ?',
                [userId]
            );

            if (shopIds.length > 0) {
                // 新しいお気に入りを一括挿入
                const values = shopIds.map(shopId => [userId, shopId]);
                await connection.query(
                    'INSERT INTO table_favorite (user_id, shop_id) VALUES ?',
                    [values]
                );
            }

            await connection.commit();
            console.log(`[FavShopDAO] ✅ Synced favorites for user=${userId}`);
        } catch (err) {
            if (connection) await connection.rollback();
            console.error(err);
            throw err;
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = new FavShopDAO();
