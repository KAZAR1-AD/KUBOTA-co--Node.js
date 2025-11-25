// 実際のデータベース接続オブジェクトを読み込む (database.js - MySQL Pool)
const db = require('../database');
// パスワードのハッシュ化/検証に使うライブラリ (npm install bcrypt を想定)
// ⚠️ このコードを動作させるには、プロジェクトで `npm install bcrypt` が実行されている必要があります。
const bcrypt = require('bcrypt');

// ソルトはランダムに生成されます。bcrypt.hash(password, saltRounds) の形式を使用。
const saltRounds = 10;

/**
 * ログイン認証 (profile_photo_id を返すよう修正)
 * @param {string} login_id - ログインID（またはメールアドレス）
 * @param {string} password - パスワード
 * @returns {Promise<{user_id: number, user_name: string, email: string, profile_photo_id: number} | null>} 認証成功したユーザー情報、またはnull
 */
exports.authenticateUser = async (login_id, password) => {
    console.log(`[UserDAO] 認証処理開始: ID=${login_id}`);

    // 修正: SELECT文に profile_photo_id を追加
    const query = `
SELECT user_id, user_name, email, password, profile_photo_id 
FROM table_user 
WHERE email = ? OR user_id = ?
`;

    try {
        // 1. データベースからユーザーを取得 (MySQL: [rows, fields] が返る)
        const [rows] = await db.query(query, [login_id, login_id]);

        if (rows.length === 0) {
            console.log('[UserDAO] ユーザーが見つかりません。');
            return null;
        }

        const user = rows[0];
        // 修正済み: user.password を使用
        const passwordHash = user.password;

        // 2. パスワードの検証 (⭐ bcrypt.compare が格納されたハッシュからランダムソルトを抽出して比較 ⭐)
        const isMatch = await bcrypt.compare(password, passwordHash);

        if (isMatch) {
            console.log(`[UserDAO] 認証成功: UserID=${user.user_id}`);
            return {
                user_id: user.user_id,
                user_name: user.user_name,
                email: user.email,
                profile_photo_id: user.profile_photo_id // ★ profile_photo_id を追加
            };
        } else {
            console.log('[UserDAO] パスワードが一致しません。');
            return null;
        }

    } catch (error) {
        console.error('[UserDAO] 認証クエリ実行エラー:', error);
        throw new Error('データベース認証エラー');
    }
};

/**
 * 新規ユーザー登録
 * @param {string} username - ユーザー名
 * @param {string} email - メールアドレス
 * @param {string} password - パスワード
 * @returns {Promise<{success: boolean, userId: number, message?: string}>} 登録結果
 */
exports.registerUser = async (username, email, password) => {
    console.log(`[UserDAO] 登録処理開始: Email=${email}`);

    // 1. パスワードのハッシュ化 (⭐ ランダムソルトが自動生成され、ハッシュに結合される ⭐)
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // MySQLで安全にカウントを取得するためのエイリアス
    const checkDuplicateQuery = `SELECT COUNT(*) AS count FROM table_user WHERE email = ?`;
    // 修正済み: カラム名 'password' を使用
    // 注意: 新規登録時は profile_photo_id はNULLまたはデフォルト値がDB側で設定されていることを想定
    const insertQuery = `
INSERT INTO table_user (user_name, email, password) 
VALUES (?, ?, ?) 
`;

    try {
        // メールアドレスの重複チェック (MySQL)
        const [duplicateCheckRows] = await db.query(checkDuplicateQuery, [email]);
        // rows[0].count を使用
        if (duplicateCheckRows.length > 0 && duplicateCheckRows[0].count > 0) {
            return { success: false, userId: null, message: 'このメールアドレスは既に登録されています。' };
        }

        // 2. ユーザー情報の挿入 (MySQL: [result, fields] が返る)
        const [result] = await db.query(insertQuery, [username, email, passwordHash]);

        // MySQLでは通常、挿入されたIDは insertId プロパティで取得
        const newUserId = result.insertId;

        console.log(`[UserDAO] 登録成功: UserID=${newUserId}`);
        return {
            success: true,
            userId: newUserId,
            message: 'ユーザー登録成功'
        };
    } catch (error) {
        console.error('[UserDAO] 登録クエリ実行エラー:', error);

        // エラーコード1062 (ER_DUP_ENTRY) は重複キーエラー
        if (error.code === 'ER_DUP_ENTRY') {
            return { success: false, userId: null, message: 'このメールアドレスは既に登録されています。' };
        }

        throw new Error('データベース登録エラー');
    }
};

/**
 * ユーザーIDからユーザー情報を取得
 * @param {number} user_id - ユーザーID
 * @returns {Promise<{user_id: number, user_name: string, email: string, profile_photo_id: number} | null>} ユーザー情報、またはnull
 */
exports.getUserById = async (user_id) => {
    console.log(`[UserDAO] ユーザー情報取得開始: UserID=${user_id}`);

    // profile_photo_id を追加
    const query = `
SELECT user_id, user_name, email, profile_photo_id 
FROM table_user 
WHERE user_id = ?
`;

    try {
        const [rows] = await db.query(query, [user_id]);

        if (rows.length === 0) {
            console.log('[UserDAO] 指定されたユーザーが見つかりません。');
            return null;
        }

        const user = rows[0];

        console.log(`[UserDAO] ユーザー情報取得成功: UserID=${user.user_id}`);
        return {
            user_id: user.user_id,
            user_name: user.user_name,
            email: user.email,
            profile_photo_id: user.profile_photo_id
        };

    } catch (error) {
        console.error('[UserDAO] ユーザー情報取得クエリ実行エラー:', error);
        throw new Error('データベースエラーによるユーザー情報取得失敗');
    }
};

/**
 * ユーザー名更新
 */
exports.updateUsername = async (userId, newUsername) => {
    console.log(`[UserDAO] ユーザー名更新処理: UserID=${userId}, NewName=${newUsername}`);
    const query = `UPDATE table_user SET user_name = ? WHERE user_id = ?`;

    try {
        // MySQL: UPDATE文の実行
        await db.query(query, [newUsername, userId]);
        console.log('[UserDAO] ユーザー名更新成功。');
        return true;
    } catch (error) {
        console.error('[UserDAO] ユーザー名更新クエリ実行エラー:', error);
        throw new Error('ユーザー名の更新中にエラーが発生しました。');
    }
};

/**
 * メールアドレス更新
 */
exports.updateEmail = async (userId, newEmail) => {
    console.log(`[UserDAO] メールアドレス更新処理: UserID=${userId}, NewEmail=${newEmail}`);
    const query = `UPDATE table_user SET email = ? WHERE user_id = ?`;

    try {
        // MySQL: UPDATE文の実行
        await db.query(query, [newEmail, userId]);
        console.log('[UserDAO] メールアドレス更新成功。');
        return true;
    } catch (error) {
        // MySQLの重複エラーコードを捕捉し、ユーザーフレンドリーなメッセージを投げる
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error('このメールアドレスは既に他のユーザーに使用されています。');
        }
        console.error('[UserDAO] メールアドレス更新クエリ実行エラー:', error);
        throw new Error('メールアドレスの更新中にエラーが発生しました。');
    }
};

/**
 * プロフィール画像ID更新 (追加された関数)
 * @param {number} userId - ユーザーID
 * @param {number | null} photoId - 新しいプロフィール画像のID (nullも許可)
 * @returns {Promise<boolean>} 更新が成功すれば true
 */
exports.updateProfilePhotoId = async (userId, photoId) => {
    console.log(`[UserDAO] プロフィール画像ID更新処理: UserID=${userId}, PhotoID=${photoId}`);
    const query = `UPDATE table_user SET profile_photo_id = ? WHERE user_id = ?`;

    try {
        // MySQL: UPDATE文の実行
        // photoIdがnullの場合でも、適切にDBに渡されます
        await db.query(query, [photoId, userId]);
        console.log('[UserDAO] プロフィール画像ID更新成功。');
        return true;
    } catch (error) {
        console.error('[UserDAO] プロフィール画像ID更新クエリ実行エラー:', error);
        // 外部キー制約エラーなどの可能性も考慮し、汎用的なエラーメッセージを返す
        throw new Error('プロフィール画像の更新中にエラーが発生しました。');
    }
};

/**
 * パスワード更新
 * @returns {Promise<boolean>} 現在のパスワードが正しければ true
 */
exports.updatePassword = async (userId, currentPassword, newPassword) => {
    console.log(`[UserDAO] パスワード更新処理: UserID=${userId}`);

    // 1. 現在のパスワードハッシュを取得 (MySQL)
    // 修正済み: カラム名 'password' を使用
    const fetchHashQuery = `SELECT password FROM table_user WHERE user_id = ?`;
    // 修正済み: カラム名 'password' を使用
    const updatePassQuery = `UPDATE table_user SET password = ? WHERE user_id = ?`;

    try {
        const [rows] = await db.query(fetchHashQuery, [userId]);
        if (rows.length === 0) {
            throw new Error('ユーザーが見つかりません');
        }
        const user = rows[0];
        // 修正済み: user.password を使用
        const storedHash = user.password;

        // 2. 現在のパスワードの検証
        const isMatch = await bcrypt.compare(currentPassword, storedHash);

        if (!isMatch) {
            return false; // 現在のパスワードが正しくない
        }

        // 3. 新しいパスワードのハッシュ化 (⭐ ランダムソルトが自動生成され、ハッシュに結合される ⭐)
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // 4. 新しいハッシュをDBに保存 (MySQL)
        await db.query(updatePassQuery, [newPasswordHash, userId]);

        console.log('[UserDAO] パスワード更新成功。');
        return true;
    } catch (error) {
        console.error('[UserDAO] パスワード更新クエリ実行エラー:', error);
        throw new Error(error.message || 'パスワードの更新中にエラーが発生しました。');
    }
};