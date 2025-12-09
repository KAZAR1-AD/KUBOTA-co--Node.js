/**
 * @typedef {object} Database
 * @property {(sql: string, params: any[]) => Promise<any>} execute - INSERT/UPDATE/DELETEを実行する（DB操作の抽象化）
 * @property {(sql: string, params: any[]) => Promise<any[]>} query - SELECTを実行し、結果行の配列を返す（DB操作の抽象化）
 */

/**
 * 🤝 friendship テーブルのデータアクセスオブジェクト (DAO)
 * テーブル構造の制約に基づき、ユーザーIDのソートを内部で処理します。
 */
class FriendshipDAO {
    /**
     * @param {Database} db - データベース接続オブジェクト（例: MySQL/PostgreSQLクライアント）
     */
    constructor(db) {
        // データベース接続インスタンスを保持
        this.db = db;
    }

    // ---------------------------------------------
    // 内部ヘルパーメソッド
    // ---------------------------------------------

    /**
     * 2つのユーザーIDを受け取り、`user_id_small`と`user_id_large`にソートします。
     * @private
     * @param {number} userIdA ユーザーAのID
     * @param {number} userIdB ユーザーBのID
     * @returns {{small: number, large: number}} ソートされたIDペア
     * @throws {Error} 自己フレンドシップ（IDが同一）が検出された場合
     */
    getOrderedUserIds(userIdA, userIdB) {
        if (userIdA === userIdB) {
            // DBのCHECK制約（no_self_friend）に相当するチェック
            throw new Error("エラー: 自分自身とのフレンドシップは許可されていません。");
        }
        return {
            small: Math.min(userIdA, userIdB),
            large: Math.max(userIdA, userIdB)
        };
    }

    // ---------------------------------------------
    // DAO操作メソッド
    // ---------------------------------------------

    /**
     * 🤝 新しいフレンドシップを作成 (INSERT) します。
     * @param {number} userIdA ユーザーAのID
     * @param {number} userIdB ユーザーBのID
     * @returns {Promise<void>}
     */
    async createFriendship(userIdA, userIdB) {
        // 常に small, large の順序で処理
        const { small, large } = this.getOrderedUserIds(userIdA, userIdB);

        const sql = `
            INSERT INTO friendship (user_id_small, user_id_large)
            VALUES (?, ?)
        `;
        // DBドライバのexecuteメソッドを使ってSQLを実行（トランザクションはここでは省略）
        await this.db.execute(sql, [small, large]);
    }

    /**
     * 💔 指定したユーザー間のフレンドシップを削除 (DELETE) します。
     * @param {number} userIdA ユーザーAのID
     * @param {number} userIdB ユーザーBのID
     * @returns {Promise<void>}
     */
    async deleteFriendship(userIdA, userIdB) {
        // 常に small, large の順序で処理
        const { small, large } = this.getOrderedUserIds(userIdA, userIdB);

        const sql = `
            DELETE FROM friendship
            WHERE user_id_small = ? AND user_id_large = ?
        `;
        await this.db.execute(sql, [small, large]);
    }

    /**
     * 👥 特定のユーザーIDを持つすべてのフレンドのIDを取得 (SELECT) します。
     * @param {number} userId 基準となるユーザーID
     * @returns {Promise<number[]>} フレンドのIDの配列
     */
    async findFriendsByUserId(userId) {

        // ユーザーIDが small/large のどちらに格納されていても、
        // もう一方のID（フレンドID）を取得できるようにSQLのCASE文を使用
        const sql = `
            SELECT
                CASE
                    WHEN user_id_small = ? THEN user_id_large
                    ELSE user_id_small
                END AS friend_id
            FROM friendship
            WHERE user_id_small = ? OR user_id_large = ?
        `;

        // SQL実行: パラメータ [userId (CASE), userId (WHERE small), userId (WHERE large)]
        const rows = await this.db.query(sql, [userId, userId, userId]);

        // 取得した結果から friend_id の値のみを抽出し、数値配列として返却
        return rows.map(row => row.friend_id);
    }
}

module.exports = FriendshipDAO;