const db = require('../database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// user_idを生成するためのヘルパー関数を定義
const generateRandomId = () => {
    // 8桁のランダムな数字IDを生成 (INT型であると想定)
    // 10,000,000から99,999,999まで
    return Math.floor(10000000 + Math.random() * 90000000);
};

// 認証に必要なテーブルとカラム名を定義
const USER_TABLE = 'table_user';
const AUTH_FIELDS = 'user_id, password, user_name, email';
const DEFAULT_PROFILE_PHOTO_ID = 999; // table_user_icon の初期値を想定
// ⚠️ SALT_ROUNDS 定数は削除しました。bcryptのhashメソッド内で直接強度を10と指定します。

class UserDAO {
    
    /**
     * ログインIDとパスワードでユーザー認証を行う
     * ... (変更なし)
     */
    async authenticateUser(loginId, plainPassword) {
        let connection;
        try {
            connection = await db.getConnection();
            const sql = `
                SELECT ${AUTH_FIELDS} 
                FROM ${USER_TABLE} 
                WHERE email = ? OR user_id = ?
            `;

            const [rows] = await connection.execute(sql, [loginId, loginId]);

            if (rows.length === 0) {
                console.log(`[DAO-AUTH] ❌ 認証失敗: ログインID ${loginId} のユーザーが見つかりませんでした。`);
                return null;
            }

            const user = rows[0];
            const isMatch = await bcrypt.compare(plainPassword, user.password);

            if (isMatch) {
                const { password, ...userInfo } = user;
                console.log(`[DAO-AUTH] ✅ 認証成功: UserID ${userInfo.user_id} (${userInfo.email})`);
                return userInfo;
            } else {
                console.log(`[DAO-AUTH] ❌ 認証失敗: UserID ${user.user_id} のパスワードが一致しませんでした。`);
                return null;
            }

        } catch (error) {
            console.error('【UserDAO.js】認証処理でデータベースエラーが発生:', error.message);
            throw new Error('データベース認証処理中に予期せぬエラーが発生しました。');
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * user_idがデータベースに既に存在するか確認する
     * ... (変更なし)
     */
    async isUserIdExists(userId) {
        let connection;
        try {
            connection = await db.getConnection();
            const sql = `SELECT COUNT(*) AS count FROM ${USER_TABLE} WHERE user_id = ?`;
            const [rows] = await connection.execute(sql, [userId]);
            return rows[0].count > 0;
        } catch (error) {
            console.error('[DAO-CHECK] 💣 ID衝突チェック中にDBエラー:', error.message);
            throw new Error('ID衝突チェック中に予期せぬエラーが発生しました。');
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * 新規ユーザーをデータベースに登録する 
     */
    async registerUser(username, email, plainPassword) {
        const MAX_RETRIES = 5;
        let connection;

        try {
            // 1. メールアドレスの重複チェック
            const existingUser = await this.findByEmail(email);
            if (existingUser) {
                console.log(`[DAO-REG] ❌ 登録失敗: メールアドレス ${email} は既に使用されています。`);
                return { success: false, message: 'このメールアドレスは既に使用されています。' };
            }

            // 2. パスワードのハッシュ化 (強度を10で指定)
            // 💡 bcryptはこの処理内で自動的にソルトを生成し、ハッシュに埋め込みます。
            const hashedPassword = await bcrypt.hash(plainPassword, 10); 
            
            // 3. ユニークな user_id の生成ループ (変更なし)
            let userId = null;
            let retries = 0;

            while (retries < MAX_RETRIES) {
                const newId = generateRandomId(); 
                const exists = await this.isUserIdExists(newId); 

                if (!exists) {
                    userId = newId; 
                    break;
                }
                retries++;
                console.warn(`[DAO-REG] ⚠️ ID ${newId} は既に存在します。リトライ回数: ${retries}`);
            }

            if (userId === null) {
                console.error('[DAO-REG] ❌ ユニークIDの生成に失敗しました。最大リトライ回数を超過しました。');
                return { success: false, message: 'IDの生成に失敗しました。時間をおいて再試行してください。' };
            }
            
            // 4. データベースに挿入
            connection = await db.getConnection();
            const sql = `
                INSERT INTO ${USER_TABLE} (user_id, user_name, email, password, profile_photo_id) 
                VALUES (?, ?, ?, ?, ?)
            `;
            
            await connection.execute(sql, [
                userId, 
                username,
                email,
                hashedPassword,
                DEFAULT_PROFILE_PHOTO_ID
            ]);

            console.log(`[DAO-REG] ✅ 登録成功: New UserID ${userId} (${email})`); 
            
            return { success: true, userId: userId };

        } catch (error) {
            console.error(`[DAO-REG] ❌ 登録処理でデータベースエラーが発生 (${email}):`, error.message);
            throw new Error('新規登録処理中に予期せぬデータベースエラーが発生しました。');
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * メールアドレスでユーザーを検索する (内部重複チェック用)
     * ... (変更なし)
     */
    async findByEmail(email) {
        let connection;
        try {
            connection = await db.getConnection();
            const sql = `SELECT user_id FROM ${USER_TABLE} WHERE email = ?`;
            const [rows] = await connection.execute(sql, [email]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('【UserDAO.js】findByEmailエラー:', error.message);
            throw new Error('メールアドレス検索中に予期せぬエラーが発生しました。');
        } finally {
            if (connection) connection.release();
        }
    }
    
    // ===============================================
    // ユーザー情報更新メソッド (FIN009 関連)
    // ===============================================

    /**
     * ユーザー名を更新する
     * ... (変更なし)
     */
    async updateUsername(userId, newUsername) {
        let connection;
        try {
            connection = await db.getConnection();
            const sql = `
                UPDATE ${USER_TABLE} SET user_name = ?, updated_at = NOW() 
                WHERE user_id = ?
            `;
            
            const [result] = await connection.execute(sql, [newUsername, userId]);
            console.log(`[DAO-UPDATE] ✅ UserID ${userId} のユーザー名を更新しました。`);
            return result.affectedRows === 1;
        } catch (error) {
            console.error(`[DAO-UPDATE] ❌ UserID ${userId} のユーザー名更新エラー:`, error.message);
            throw new Error("ユーザー名の更新に失敗しました。");
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * メールアドレスを更新する
     * ... (変更なし)
     */
    async updateEmail(userId, newEmail) {
        let connection;
        try {
            // 1. メールアドレスの重複チェック
            const existingUser = await this.findByEmail(newEmail);
            if (existingUser && existingUser.user_id !== userId) {
                 throw new Error("このメールアドレスは既に他のユーザーに使用されています。");
            }
            
            connection = await db.getConnection();
            const sql = `
                UPDATE ${USER_TABLE} SET email = ?, updated_at = NOW() 
                WHERE user_id = ?
            `;
            
            const [result] = await connection.execute(sql, [newEmail, userId]);
            console.log(`[DAO-UPDATE] ✅ UserID ${userId} のメールアドレスを更新しました。`);
            return result.affectedRows === 1;
        } catch (error) {
            console.error(`[DAO-UPDATE] ❌ UserID ${userId} のメールアドレス更新エラー:`, error.message);
            // データベースエラーの場合、具体的なメッセージは外部に出さず、一般的なエラーを投げる
            throw new Error(error.message.includes("既に") ? error.message : "メールアドレスの更新に失敗しました。");
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * パスワードを更新する
     */
    async updatePassword(userId, currentPassword, newPassword) {
        let connection;
        try {
            connection = await db.getConnection();
            
            // 1. 現在のハッシュ化されたパスワードを取得
            const userSql = `SELECT password FROM ${USER_TABLE} WHERE user_id = ?`;
            const [userRows] = await connection.execute(userSql, [userId]);
            
            if (userRows.length === 0) {
                throw new Error("更新対象のユーザーが見つかりません。");
            }

            const hashedPassword = userRows[0].password;

            // 2. 現在のパスワードを検証
            const isMatch = await bcrypt.compare(currentPassword, hashedPassword);
            if (!isMatch) {
                console.log(`[DAO-UPDATE] ❌ UserID ${userId} パスワード更新失敗: 現在のパスワードが不一致。`);
                return false; 
            }

            // 3. 新しいパスワードをハッシュ化 (強度を10で指定)
            // 💡 bcryptはこの処理内で自動的にソルトを生成し、ハッシュに埋め込みます。
            const newHashedPassword = await bcrypt.hash(newPassword, 10);

            // 4. DBを更新
            const updateSql = `
                UPDATE ${USER_TABLE} SET password = ?, updated_at = NOW() 
                WHERE user_id = ?
            `;
            const [updateResult] = await connection.execute(updateSql, [newHashedPassword, userId]);
            
            console.log(`[DAO-UPDATE] ✅ UserID ${userId} のパスワードを更新しました。`);
            return updateResult.affectedRows === 1;

        } catch (error) {
            console.error(`[DAO-UPDATE] ❌ UserID ${userId} パスワード更新処理エラー:`, error.message);
            throw new Error("パスワードの更新に失敗しました。");
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = new UserDAO();