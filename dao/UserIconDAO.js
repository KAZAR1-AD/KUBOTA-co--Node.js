const { query: dbQuery } = require('../database');

/**
 * table_user_icon へのアクセスを担当するデータアクセスオブジェクト (DAO)
 */
class UserIconDAO {

    /**
     * ユーザーIDに関連付けられたアイコンのURLを取得します。
     * @param {number} profilePhotoId - table_user_icon.profile_photo_id
     * @returns {Promise<string|null>} - アイコンのURL (photo_address) または null
     */
    async getIconUrlByPhotoId(profilePhotoId) {
        if (!profilePhotoId) {
            return null; // IDがない場合は検索しない
        }

        // SQLインジェクションを防ぐため、プリペアドステートメントを使用
        const sql = `
            SELECT photo_address
            FROM table_user_icon
            WHERE profile_photo_id = ?
        `;

        try {
            // dbQuery の内部で pool.query() が呼ばれていることを想定
            const [rows] = await dbQuery(sql, [profilePhotoId]);

            // 結果が存在し、かつ photo_address が設定されている場合
            if (rows && rows.length > 0 && rows[0].photo_address) {
                // データベースから取得したURLを返す
                return rows[0].photo_address;
            }

            return null;

        } catch (error) {
            // エラーをログに出力し、上位層にエラーを再スロー
            console.error("[UserIconDAO.getIconUrlByPhotoId] アイコンURL取得中にエラー:", error.message);
            throw new Error("アイコン情報の取得に失敗しました。データベース接続を確認してください。");
        }
    }

    /**
     * table_user_icon に保存されているすべてのアイコンのIDとURLを取得します。
     * @returns {Promise<Array<{profile_photo_id: number, photo_address: string}>>} -
     * アイコン情報の配列、またはエラー時は空の配列。
     */
    async getAllIcons() {
        const sql = `
            SELECT profile_photo_id, photo_address
            FROM table_user_icon
        `;

        try {
            // dbQuery の内部で pool.query() が呼ばれていることを想定
            const [rows] = await dbQuery(sql);

            // 結果が存在しない、または空の場合は空の配列を返す
            if (!rows || rows.length === 0) {
                return [];
            }

            // 取得したレコードの配列をそのまま返す
            // { profile_photo_id: 1, photo_address: 'url1' }, ...
            return rows;

        } catch (error) {
            // エラーをログに出力
            console.error("[UserIconDAO.getAllIcons] すべてのアイコンの取得中にエラー:", error.message);

            // 上位層への影響を考慮し、処理を続行可能にするため、エラー時は空の配列を返すか、
            // または `getIconUrlByPhotoId` と同様にエラーを再スローすることも検討
            // ここでは、データがないことを示すために空の配列を返すアプローチを採用します。
            throw new Error("すべてのアイコン情報の取得に失敗しました。データベース接続を確認してください。");
        }
    }

    // 必要に応じて、アイコンの登録や削除などのメソッドもここに追加
}

module.exports = new UserIconDAO(); // インスタンス化してエクスポート