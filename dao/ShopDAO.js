const db = require('../database');

const STORE_TABLE = 'table_shop';

class ShopDAO {
    
    /**
     * 距離IDをメートルに変換するヘルパー関数
     */
    convertDistanceToMeters(distanceId) {
        switch (String(distanceId)) {
            case '2': return 500;  // 500m以内
            case '3': return 1000; // 1km以内
            case '4': return 3000; // 3km以内
            default: return null;  // 指定なし
        }
    }

    /**
     * 検索条件（予算、距離、ジャンル）に基づいて店舗を検索する
     * @param {Object} criteria - { userId, budget, distance, genre }
     */
    async searchShops(criteria) {
        try {
            // 1. ベースとなるSQL
            let sql = ``;
            const params = [];

            // ログインしている場合にユーザーのお気に入りテーブルを外部結合する
            // ログインしてない場合はベースのSQLに WHERE 1=1 を追加するだけ
            if (criteria.userId !== null) {
                sql += `SELECT 
                            s.shop_id,
                            s.shop_name,
                            s.budget,
                            s.distance,
                            s.genre,
                            s.photo_address,
                            s.address,
                            s.google_map_link,
                            CASE WHEN fav.user_id IS NULL THEN false ELSE true END AS is_favorite
                        FROM ${STORE_TABLE} s
                        LEFT OUTER JOIN (SELECT * FROM table_favorite WHERE user_id = ?) AS fav 
                        ON s.shop_id = fav.shop_id 
                        WHERE 1=1`;
                params.push(criteria.userId);
            } else {
                sql += `SELECT * FROM ${STORE_TABLE} WHERE 1=1`;
            }

            // 2. 予算の条件追加 (budget以下)
            if (criteria.budget) {
                sql += ` AND budget <= ?`;
                // フロントエンドの仕様に合わせて+1000のバッファを持たせるか、そのまま使うか調整してください
                // 今回は元のコードに合わせて +1000 しています
                params.push(Number(criteria.budget) + 1000);
            }

            // 3. 距離の条件追加 (distance以下)
            const maxDistance = this.convertDistanceToMeters(criteria.distance);
            if (maxDistance !== null) {
                // データベースのdistanceカラムが「メートル(INT)」で保存されている前提
                sql += ` AND distance <= ?`;
                params.push(maxDistance);
            }

            // 4. ジャンルの条件追加 (複数選択対応: IN句を使用)
            // criteria.genre が配列 ['和食', '洋食'] またはカンマ区切り文字列で来ることを想定
            let genres = criteria.genre;
            
            // 文字列なら配列に変換
            if (typeof genres === 'string' && genres.trim() !== '') {
                genres = genres.split(','); 
            }

            // 配列かつ中身がある場合のみ検索条件に追加
            if (Array.isArray(genres) && genres.length > 0) {
                // 配列の数だけ '?' を作る (例: 2つなら "?, ?")
                const placeholders = genres.map(() => '?').join(', ');
                sql += ` AND genre IN (${placeholders})`;
                params.push(...genres);
            }

            console.log('[ShopDAO.js] 実行SQL:', sql);
            console.log('[ShopDAO.js] パラメータ:', params);

            // 5. クエリ実行
            const [rows] = await db.query(sql, params);

            if (rows.length === 0) {
                console.log(`[ShopDAO.js] ❌ 条件に合う店舗が見つかりませんでした。`);
                return []; // EJS側でforEachできるよう空配列を返すのが安全
            }

            console.log(`[ShopDAO.js] ✅ 取得成功: ${rows.length}件の店舗が見つかりました。`);
            return rows;

        } catch (error) {
            console.error('[ShopDAO.js] 検索エラー:', error.message);
            throw error;
        }
    }

    // 全件取得用（必要であれば残す）
    async findAll() {
        return this.searchShops({});
    }
}

module.exports = new ShopDAO();