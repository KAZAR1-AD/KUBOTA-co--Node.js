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
                console.log(`[DAO-AUTH] ❌ 認証失敗: ログインID ${loginId} のユーザーが見つかりませんでした。`); // ★ ログ追加
                return null;
            }

            const user = rows[0];
            const isMatch = await bcrypt.compare(plainPassword, user.password);

            if (isMatch) {
                const { password, ...userInfo } = user;
                console.log(`[DAO-AUTH] ✅ 認証成功: UserID ${userInfo.user_id} (${userInfo.email})`); // ★ ログ追加
                return userInfo;
            } else {
                console.log(`[DAO-AUTH] ❌ 認証失敗: UserID ${user.user_id} のパスワードが一致しませんでした。`); // ★ ログ追加
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
         * @param {number} userId - チェックするID
         * @returns {Promise<boolean>} - 存在すれば true
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
     * 新規ユーザーをデータベースに登録する (パスワードをハッシュ化して保存)
     * @param {string} username - ユーザー名 (user_name)
     * @param {string} email - メールアドレス (email)
     * @param {string} plainPassword - 平文のパスワード
     * @returns {number | null} 登録成功時は新しい user_id、失敗時は null
     */
    async registerUser(username, email, plainPassword) {
        const MAX_RETRIES = 5; // ID生成の最大リトライ回数
        let connection;

        try {
            // 1. メールアドレスの重複チェック
            const existingUser = await this.findByEmail(email);
            if (existingUser) {
                console.log(`[DAO-REG] ❌ 登録失敗: メールアドレス ${email} は既に使用されています。`);
                return { success: false, message: 'このメールアドレスは既に使用されています。' };
            }

            // 2. パスワードのハッシュ化
            const hashedPassword = await bcrypt.hash(plainPassword, 10);
            
            // --- ★ ID生成と衝突チェックのロジックを挿入 ★ ---
            
            // 3. ユニークな user_id の生成ループ
            let userId = null;
            let retries = 0;

            while (retries < MAX_RETRIES) {
                // generateRandomId 関数はクラス外で定義されている必要があります
                const newId = generateRandomId(); 
                // isUserIdExists メソッドは UserDAO クラス内に定義されている必要があります
                const exists = await this.isUserIdExists(newId); 

                if (!exists) {
                    userId = newId; // ユニークなIDが見つかった
                    break;
                }
                retries++;
                console.warn(`[DAO-REG] ⚠️ ID ${newId} は既に存在します。リトライ回数: ${retries}`);
            }

            if (userId === null) {
                console.error('[DAO-REG] ❌ ユニークIDの生成に失敗しました。最大リトライ回数を超過しました。');
                return { success: false, message: 'IDの生成に失敗しました。時間をおいて再試行してください。' };
            }
            
            // --- ★ 挿入ロジックここまで ★ ---
            
            // 4. データベースに挿入（ID生成ロジックの後に実行）
            connection = await db.getConnection();
            const sql = `
                INSERT INTO ${USER_TABLE} (user_id, user_name, email, password, profile_photo_id) 
                VALUES (?, ?, ?, ?, ?)
            `; // ★ user_id をクエリに含めるようSQLを修正 ★
            
            // user_id を引数の先頭に追加
            await connection.execute(sql, [
                userId, // ★ 生成した user_id を渡す
                username,
                email,
                hashedPassword,
                DEFAULT_PROFILE_PHOTO_ID
            ]);

            // 挿入成功
            // AUTO_INCREMENTではないため、result.insertId は使用せず、生成したIDを返す
            console.log(`[DAO-REG] ✅ 登録成功: New UserID ${userId} (${email})`); 
            
            return { success: true, userId: userId };

        } catch (error) {
            console.error(`[DAO-REG] ❌ 登録処理でデータベースエラーが発生 (${email}):`, error.message);
            // データベースエラーの場合、具体的なメッセージは外部に出さず、一般的なエラーを投げる
            throw new Error('新規登録処理中に予期せぬデータベースエラーが発生しました。');
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * メールアドレスでユーザーを検索する (内部重複チェック用)
     */
    async findByEmail(email) {
        let connection;
        try {
            connection = await db.getConnection();
            const sql = `SELECT user_id FROM ${USER_TABLE} WHERE email = ?`;
            const [rows] = await connection.execute(sql, [email]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            // エラーは上位で処理されるため、ここではロギングのみ
            console.error('【UserDAO.js】findByEmailエラー:', error.message);
            return null;
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = new UserDAO();