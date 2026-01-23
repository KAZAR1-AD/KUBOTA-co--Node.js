const db = require('../database');

class FollowDAO {
    /* followed_id: フォローされるユーザーのID */
    /* follower_id: フォロワーになるユーザーのID */

    // ユーザーをフォローする
    async followUser(followerId, followedId) {
        try {
            if (followerId === followedId) {
                throw new Error('ユーザーは自分自身をフォローできません');
            }
            const sql = 'INSERT INTO relationship (follower_id, followed_id) VALUES (?, ?)';
            console.log('User followed successfully');
            return await db.pool.execute(sql, [followerId, followedId]);
        } catch (err) {
            console.error('[FollowDAO] followUser Error:', err);
            throw err;
        }
    }

    // ユーザーのフォローを解除する
    async unfollowUser(followerId, followedId) {
        try {
            if (followerId === followedId) {
                throw new Error('ユーザーは自分自身のフォローを解除できません');
            }
            const sql = 'DELETE FROM relationship WHERE follower_id = ? AND followed_id = ?';
            console.log('User unfollowed successfully');
            return await db.pool.execute(sql, [followerId, followedId]);
        } catch (err) {
            console.error('[FollowDAO] unfollowUser Error:', err);
            throw err;
        }
    }

    /**
     * 指定したユーザーがフォローしているユーザーのリストを取得する
     * @param {number} followerId - フォロワーのユーザーID
     * @returns {Promise<Array>} フォローしているユーザーのリスト
     */
    async getFollowedUsers(followerId) {
        try {
            const sql = `
                SELECT u.user_id, u.user_name, i.photo_address
                FROM relationship r
                INNER JOIN table_user u ON r.followed_id = u.user_id
                INNER JOIN table_user_icon i ON u.profile_photo_id = i.profile_photo_id
                WHERE r.follower_id = ?
            `;
            const [rows] = await db.pool.query(sql, [followerId]);
            return rows;
        } catch (err) {
            console.error('[FollowDAO] getFollowedUsers Error:', err);
            throw err;
        }
    }

    /**
     * フォロワーを取得する
     * @param {*} followedId - フォローされているユーザーのID
     * @returns 
     */
    async getFollowers(followedId) {
        try {
            const sql = `
                SELECT u.user_id, u.user_name, i.photo_address
                FROM relationship r
                INNER JOIN table_user u ON r.follower_id = u.user_id
                INNER JOIN table_user_icon i ON u.profile_photo_id = i.profile_photo_id
                WHERE r.followed_id = ?
            `;
            const [rows] = await db.pool.query(sql, [followedId]);
            return rows;
        } catch (err) {
            console.error('[FollowDAO] getFollowers Error:', err);
            throw err;
        }
    }

    /**
     * フォローしているか否かを確認する
     * @param {*} followerId 
     * @param {*} followedId 
     * @returns true | false
     */
    async isFollowing(followerId, followedId) {
        try {
            if (followerId === followedId) {
                return false; // 自分自身はフォローできない
            }
            const sql = 'SELECT COUNT(*) AS count FROM relationship WHERE follower_id = ? AND followed_id = ?';
            const [rows] = await db.pool.execute(sql, [followerId, followedId]);
            return rows[0].count > 0;
        } catch (err) {
            console.error('[FollowDAO] isFollowing Error:', err);
            throw err;
        }
    }
}

module.exports = new FollowDAO();