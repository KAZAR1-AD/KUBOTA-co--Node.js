const db = require('../database');

const STORE_TABLE = 'table_shop';

class ShopDAO {
    /**
     * お店データをすべて表示する
     */
    async findAll() {
        try {
            const [rows] = await db.query(`SELECT * FROM ${STORE_TABLE}`);
            if (rows.length === 0) {
                console.log(`[ShopDAO.js] ❌ 店舗情報が見つかりません。`);
                return null;
            }
            console.log(`[ShopDAO.js] ✅ 取得成功: 店舗情報を正常に取得しました。`);
            return rows;
        } catch (error) {
            console.error('[ShopDAO.js] 店舗情報取得エラー:', error.message);
            throw error;
        }
    }

    /**
     * 予算でお店を検索する
     */
    async findByBudget(budget) {
        budget = Number(budget);
        try {
            const [rows] = await db.query(
                `SELECT * FROM ${STORE_TABLE} WHERE budget <= ?`,
                [budget + 1000]
            );
            if (rows.length === 0) {
                console.log(`[ShopDAO.js] ❌ 予算${budget}円の店舗情報が見つかりません。`);
                return null;
            }
            console.log(`[ShopDAO.js] ✅ 取得成功: 予算${budget}円の店舗情報を正常に取得しました。`);
            return rows;
        } catch (error) {
            console.error('[ShopDAO.js] 予算による店舗情報取得エラー:', error.message);
            throw error;
        }
    }

    /**
     * 距離をメートルに変換
     */
    convertDistance(distance) {
        switch (distance) {
            case '2': return 500;
            case '3': return 1000;
            case '4': return 3000;
            default: return 1;
        }
    }

    /**
     * ジャンル文字列を SQL 用に変換
     */
    commaToOr(str) {
        if (!str) return "";
        return str.split(',').map(s => s.trim()).filter(Boolean).join('" OR "');
    }

    /**
     * 予算と距離で検索
     */
    async findByDistance(budget, distance) {
        distance = this.convertDistance(distance);
        if (distance === 1) {
            return this.findByBudget(budget);
        }
        try {
            const [rows] = await db.query(
                `SELECT * FROM ${STORE_TABLE} WHERE budget <= ? AND distance <= ?`,
                [budget + 1000, distance]
            );
            if (rows.length === 0) return null;
            return rows;
        } catch (error) {
            console.error('[ShopDAO.js] 距離による検索エラー:', error.message);
            throw error;
        }
    }

    /**
     * 予算とジャンルで検索
     */
    async findByGenre(budget, genre) {
        genre = this.commaToOr(genre);
        try {
            const [rows] = await db.query(
                `SELECT * FROM ${STORE_TABLE} WHERE budget <= ? AND genre = ?`,
                [budget + 1000, genre]
            );
            if (rows.length === 0) return null;
            return rows;
        } catch (error) {
            console.error('[ShopDAO.js] ジャンルによる検索エラー:', error.message);
            throw error;
        }
    }

    /**
     * 予算・距離・ジャンルで検索
     */
    async findByOptions(budget, distance, genre) {
        distance = this.convertDistance(distance);
        genre = this.commaToOr(genre);

        if (distance === 1 && genre === "") {
            return this.findByBudget(budget);

        // ジャンル指定なし
        } else if (genre === "") {
            return this.findByDistance(budget, distance);

        // 距離指定なし
        } else if (distance === 1) {
            return this.findByGenre(budget, genre);

        // 全指定
        } else {
            const sql = `
                SELECT * FROM ${STORE_TABLE}
                WHERE budget <= ? 
                AND distance <= ? 
                AND genre = ?
                `
            try {
                const [rows] = await db.query(sql, [budget + 1000, distance, genre]);
                if (rows.length === 0) return null;
                return rows;
            } catch (error) {
                console.error('[ShopDAO.js] 複数条件検索エラー:', error.message);
                throw error;
            }
        }

        // let conditions = ['budget <= ?'];
        // let params = [budget + 1000];

        // if (distance !== 1) {
        //     conditions.push('distance <= ?');
        //     params.push(distance);
        // }
        // if (genre !== "") {
        //     conditions.push('genre = ?');
        //     params.push(genre);
        // }

        // const sql = `SELECT * FROM ${STORE_TABLE} WHERE ${conditions.join(' AND ')}`;

        // try {
        //     const [rows] = await db.query(sql, params);
        //     if (rows.length === 0) return null;
        //     return rows;
        // } catch (error) {
        //     console.error('[ShopDAO.js] 複数条件検索エラー:', error.message);
        //     throw error;
        // }
    }
}

module.exports = new ShopDAO();