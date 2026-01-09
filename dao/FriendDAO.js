// 必要なモジュールと、データベース接続モジュールをインポート
// ⚠️ 実際のファイルパスに合わせて調整してください (例: database.jsがルートにある場合)
const database = require('../database'); 

/**
 * ユーザー検索のためのデータアクセスオブジェクト (DAO)
 * 主にフレンド追加時に検索窓で使用されます。
 */
class FriendDAO {

    /**
     * ユーザーネームまたはログインIDの部分一致でユーザーを検索する
     * @param {string} keyword 検索キーワード
     * @returns {Promise<Array<{id: number, username: string, userId: string, iconId: number}>>} 検索結果のユーザー配列
     */
    static async searchFriends(keyword) {
        // キーワードがない場合、空配列を返す
        if (!keyword || keyword.trim() === '') {
            return [];
        }
        
        // SQLインジェクション防止のため、プリペアドステートメントを使用
        const searchPattern = `%${keyword.trim()}%`; 
        
        // 検索対象テーブルは 'users' と仮定。
        // パフォーマンスのため、結果の上限（LIMIT 100）を設定することが推奨されます。
        const sql = `
            SELECT 
                user_id AS id, 
                user_name AS username, 
                login_id AS userId,
                profile_photo_id AS iconId
            FROM 
                users 
            WHERE 
                user_name LIKE ? OR login_id LIKE ?
            LIMIT 100 
        `;
        
        try {
            // database.query を使用してクエリを実行
            // database.query は [rows, fields] を返すため、rowsのみを受け取る
            const [rows] = await database.query(sql, [searchPattern, searchPattern]);
            
            return rows;
            
        } catch (error) {
            console.error('FriendDAO データベース検索エラー:', error);
            // エラーを再スローし、APIルート（server.js）で500エラーとして処理させる
            throw new Error('フレンド検索中にデータベースエラーが発生しました。');
        }
    }

    // 💡 補足: このDAOは静的メソッド (static) のみを使用しているため、
    // server.jsでのインスタンス化は必須ではありませんが、一貫性のために
    // 他のDAOと同様にインスタンス化の処理を用意しても構いません。
    // 現状の server.js ではインスタンス化せずに static メソッドとして呼び出す想定です。
}

module.exports = FriendDAO;