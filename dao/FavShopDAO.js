const db = require('../database');

class FavShopDAO {
    // 既存の同期処理
    async syncFavorites(userId, shopIds) {
        let connection;
        try {
            connection = await db.pool.getConnection();
            await connection.beginTransaction();
            await connection.query('DELETE FROM table_favorite WHERE user_id = ?', [userId]);
            if (shopIds && shopIds.length > 0) {
                const values = shopIds.map(shopId => [userId, shopId]);
                await connection.query('INSERT INTO table_favorite (user_id, shop_id) VALUES ?', [values]);
            }
            await connection.commit();
        } catch (err) {
            if (connection) await connection.rollback();
            throw err;
        } finally {
            if (connection) connection.release();
        }
    }

    // ★ お気に入り店舗の詳細情報を取得 (JOIN使用)
    async getFavoritesByUserId(userId) {
        try {
            const query = `
                SELECT 
                    s.shop_id, 
                    s.shop_name, 
                    s.genre, 
                    s.budget, 
                    s.distance 
                FROM table_favorite f
                JOIN table_shop s ON f.shop_id = s.shop_id
                WHERE f.user_id = ?
                ORDER BY f.surrogate_key DESC
            `;
            const [rows] = await db.pool.query(query, [userId]);
            return rows;
        } catch (err) {
            console.error('[FavShopDAO] getFavoritesByUserId Error:', err);
            throw err;
        }
    }

    // ★ お気に入りから削除
    async removeFavorite(userId, shopId) {
        try {
            const query = 'DELETE FROM table_favorite WHERE user_id = ? AND shop_id = ?';
            await db.pool.query(query, [userId, shopId]);
        } catch (err) {
            console.error('[FavShopDAO] removeFavorite Error:', err);
            throw err;
        }
    }
}

module.exports = new FavShopDAO();