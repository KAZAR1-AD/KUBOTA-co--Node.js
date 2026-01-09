/**
 * @typedef {object} Database
 * @property {(sql: string, params: any[]) => Promise<any>} execute - INSERT/UPDATE/DELETEを実行する（database.jsのexecuteメソッドを想定）
 * @property {(sql: string, params: any[]) => Promise<any[]>} query - SELECTを実行し、結果行の配列を返す（database.jsのqueryメソッドを想定）
 */

/**
 * 🤝 friendship テーブルのデータアクセスオブジェクト (DAO)
 * テーブル構造の制約に基づき、ユーザーIDのソートを内部で処理します。
 */
class FriendshipDAO {
    /**
     * @param {Database} db - データベース接続オブジェクト（database.jsの公開オブジェクト）
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
            throw new Error("DAO Error: Self-friendship is not allowed (userIdA === userIdB).");
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
     * 👁️ 2人のユーザー間にフレンドシップが存在するかどうかを確認します (SELECT)。
     * @param {number} userIdA ユーザーAのID
     * @param {number} userIdB ユーザーBのID
     * @returns {Promise<boolean>} フレンドシップが存在すれば true、そうでなければ false
     */
    async checkFriendshipExists(userIdA, userIdB) {
        if (userIdA === userIdB) return false;

        try {
            const { small, large } = this.getOrderedUserIds(userIdA, userIdB);

            const sql = `
                SELECT 1 
                FROM friendship
                WHERE user_id_small = ? AND user_id_large = ?
            `;

            // database.query は [rows, fields] を返すため、rowsのみを受け取る
            const [rows] = await this.db.query(sql, [small, large]);

            return rows.length > 0;
        } catch (error) {
            // エラーの種類によっては、DAOのエラーとして再スロー
            if (error.message.includes("DAO Error:")) throw error;
            console.error('FriendshipDAO checkFriendshipExists Error:', error);
            throw new Error("データベースでのフレンドシップ存在確認中にエラーが発生しました。");
        }
    }


    /**
     * 🤝 新しいフレンドシップを作成 (INSERT) します。
     * @param {number} userIdA ユーザーAのID
     * @param {number} userIdB ユーザーBのID
     * @returns {Promise<void>}
     */
    async createFriendship(userIdA, userIdB) {
        try {
            // 常に small, large の順序で処理
            const { small, large } = this.getOrderedUserIds(userIdA, userIdB);

            const sql = `
                INSERT INTO friendship (user_id_small, user_id_large)
                VALUES (?, ?)
            `;
            // database.execute を使ってSQLを実行
            await this.db.execute(sql, [small, large]);
        } catch (error) {
            // エラーの種類によっては、DAOのエラーとして再スロー
            if (error.message.includes("DAO Error:")) throw error;
            // データベース固有のエラー（例: UNIQUE制約違反）を捕捉したい場合はここで処理
            console.error('FriendshipDAO createFriendship Error:', error);
            throw new Error("データベースでのフレンドシップ作成中にエラーが発生しました。");
        }
    }

    /**
     * 💔 指定したユーザー間のフレンドシップを削除 (DELETE) します。
     * @param {number} userIdA ユーザーAのID
     * @param {number} userIdB ユーザーBのID
     * @returns {Promise<void>}
     */
    async deleteFriendship(userIdA, userIdB) {
        try {
            // 常に small, large の順序で処理
            const { small, large } = this.getOrderedUserIds(userIdA, userIdB);

            const sql = `
                DELETE FROM friendship
                WHERE user_id_small = ? AND user_id_large = ?
            `;
            await this.db.execute(sql, [small, large]);
        } catch (error) {
            if (error.message.includes("DAO Error:")) throw error;
            console.error('FriendshipDAO deleteFriendship Error:', error);
            throw new Error("データベースでのフレンドシップ削除中にエラーが発生しました。");
        }
    }

    /**
     * 👥 特定のユーザーIDを持つすべてのフレンドのIDを取得 (SELECT) します。
     * @param {number} userId 基準となるユーザーID
     * @returns {Promise<number[]>} フレンドのIDの配列
     */
    async findFriendsByUserId(userId) {
        try {
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
            const [rows] = await this.db.query(sql, [userId, userId, userId]);

            // 取得した結果から friend_id の値のみを抽出し、数値配列として返却
            return rows.map(row => row.friend_id);
        } catch (error) {
            console.error('FriendshipDAO findFriendsByUserId Error:', error);
            throw new Error("データベースでのフレンドID取得中にエラーが発生しました。");
        }
    }
}

module.exports = FriendshipDAO;