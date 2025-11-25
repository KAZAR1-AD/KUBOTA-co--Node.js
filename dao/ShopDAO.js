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
                console.log(`[ShopDAO.js] ❌ 店舗情報が見つかりません。`);
                return null;
            }

            console.log(`[ShopDAO.js] ✅ 取得成功: 店舗情報を正常に取得しました。`);
            return rows;

        } catch (error) {
            console.error('[ShopDAO.js] 店舗情報取得処理でデータベースエラーが発生:', error.message);
            throw new Error('データベース店舗情報取得処理中に予期せぬエラーが発生しました。');
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * 予算でお店を検索する
     * @param {number} budget - 予算
     * @returns {Object|null} - 店舗情報オブジェクト、または見つからなかった場合はnull
     */
    async findBybudget(budget) {
        let connection;
        try {
            connection = await db.getConnection();
            const sql = `
                SELECT * 
                FROM ${STORE_TABLE} 
                WHERE budget <= ${budget + 1000}
            `;

            const [rows] = await connection.execute(sql, [budget]);

            if (rows.length === 0) {
                console.log(`[ShopDAO.js] ❌ 予算${budget}円の店舗情報が見つかりません。`);
                return null;
            }

            console.log(`[ShopDAO.js] ✅ 取得成功: 予算${budget}円の店舗情報を正常に取得しました。`);
            return rows;
        } catch (error) {
            console.error('[ShopDAO.js] 予算による店舗情報取得処理でデータベースエラーが発生:', error.message);
            throw new Error('データベース予算による店舗情報取得処理中に予期せぬエラーが発生しました。');
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * 予算と距離でお店を検索する
     * @param {number} budget 
     * @param {number} distance 
     * @returns {Object|null} - 店舗情報オブジェクト、または見つからなかった場合はnull
     */
    async findByDistance(budget, distance) {
        distance = this.convertDistance(distance);
        
        if (distance === 1) {
            return this.findBybudget(budget);
        } else {
            let connection;
            try {
                connection = await db.getConnection();
                const sql = `
                    SELECT * 
                    FROM ${STORE_TABLE} 
                    WHERE budget <= ${budget + 1000}
                    AND distance <= ${distance}
                `;

                const [rows] = await connection.execute(sql, [distance]);

                if (rows.length === 0) {
                    console.log(`[ShopDAO.js] ❌ 予算${budget}円、距離${distance}mの店舗情報が見つかりません。`);
                    return null;
                }

                console.log(`[ShopDAO.js] ✅ 取得成功: 予算${budget}円、距離${distance}mの店舗情報を正常に取得しました。`);
                return rows;
            } catch (error) {
                console.error('[ShopDAO.js] 距離による店舗情報取得処理でデータベースエラーが発生:', error.message);
                throw new Error('データベース距離による店舗情報取得処理中に予期せぬエラーが発生しました。');
            } finally {
                if (connection) connection.release();
            }
        }
    }
        

    /**
     * 複数オプションでお店を検索する
     * @param {number} budget 
     * @param {number} distance  
     * @param {*} genre 
     * @returns {Object|null} - 店舗情報オブジェクト、または見つからなかった場合はnull
     */
    async findByOptions(budget, distance, genre) {
        let connection;
        genre = this.commaToAnd(genre);
        
        // 距離指定なし、ジャンル指定なし
        if (distance === 1 && genre === "") {
            return this.findBybudget(budget);

        // ジャンル指定なし
        } else if (genre === "") {
            return this.findByDistance(budget, distance);

        // すべて指定あり
        } else if (distance !== 1) {
            distance = this.convertDistance(distance);
            try {
                connection = await db.getConnection();
                const sql = `
                    SELECT * 
                    FROM ${STORE_TABLE} 
                    WHERE budget BETWEEN ${budget - 1000} AND ${budget + 1000}
                    AND distance <= ${distance}
                    AND genre = "${genre}"
                `;

                console.log(sql);

                const [rows] = await connection.execute(sql, [distance, genre]);

                if (rows.length === 0) {
                    console.log(`[ShopDAO.js] ❌ 予算${budget}円、距離${distance}m、ジャンル${genre}の店舗情報が見つかりません。`);
                    return null;
                }

                console.log(`[ShopDAO.js] ✅ 取得成功: 予算${budget}円、距離${distance}m、ジャンル${genre}の店舗情報を正常に取得しました。`);
                return rows;
            } catch (error) {
                console.error('[ShopDAO.js] オプションによる店舗情報取得処理でデータベースエラーが発生:', error.message);
                throw new Error('データベースオプションによる店舗情報取得処理中に予期せぬエラーが発生しました。');
            } finally {
                if (connection) connection.release();
            }
        }
    }


    // 距離の値をメートルに変換するヘルパーメソッド
    convertDistance(distance) {
        switch (distance) {
            case '2':
                return 500;
            case '3':
                return 1000;
            case '4':
                return 3000;
            default:
                return 1;
        }
    }

    // ジャンルの値をSQL用に変換するヘルパーメソッド
    // 例: "jp,we" -> "jp AND we"
    commaToAnd(str) {
        if (!str) return "";
        const parts = str
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        return parts.join('" OR "');
      }
}

module.exports = new ShopDAO();