// db.js のエクスポートされたquery関数をインポート
// ⚠️ 実際のファイルパスに合わせて調整してください
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
            const [rows] = await dbQuery(sql, [profilePhotoId]);

            // 結果が存在し、かつ photo_address が設定されている場合
            if (rows && rows.length > 0 && rows[0].photo_address) {
                // データベースから取得したURLを返す
                return rows[0].photo_address;
            }
            
            return null;

        } catch (error) {
            // エラーをログに出力し、上位層にエラーを再スロー
            console.error("【UserIconDAO】アイコンURL取得中にエラー:", error.message);
            throw new Error("アイコン情報の取得に失敗しました。データベースを確認してください。"); 
        }
    }

    // 必要に応じて、アイコンの登録や削除などのメソッドもここに追加
}

module.exports = new UserIconDAO(); // インスタンス化してエクスポート