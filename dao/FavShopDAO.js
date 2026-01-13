const db = require('../database');

/**
 * お気に入り店舗管理 DAO
 * ちゃっぴーによる実装
 * これから検証します
 */
class FavShopDAO {
    // 差分更新
    async updateDiff(userId, added = [], removed = []) {
        let connection;

        try {
            connection = await db.pool.getConnection();

            await connection.beginTransaction();

            // ---- 追加処理 ----
            if (added.length > 0) {
                const addValues = added.map(shopId => [userId, shopId]);

                // INSERT IGNORE により重複エラーを回避
                await connection.query(
                    'INSERT IGNORE INTO table_favorite (user_id, shop_id) VALUES ?',
                    [addValues]
                );
            }

            // ---- 削除処理 ----
            if (removed.length > 0) {
                await connection.query(
                    'DELETE FROM table_favorite WHERE user_id = ? AND shop_id IN (?)',
                    [userId, removed]
                );
            }

            await connection.commit();
            console.log(`[FavShopDAO] 🔄 Updated diff for user=${userId} (added=${added}, removed=${removed})`);

        } catch (err) {
            if (connection) await connection.rollback();
            console.error('[FavShopDAO] ❌ updateDiff error:', err);
            throw err;
        } finally {
            if (connection) connection.release();
        }
    }

    // 全件更新
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
