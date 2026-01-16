const db = require('../database');

class FollowDAO {
    /* followed_id: フォローされるユーザーのID */
    /* follower_id: フォローするユーザーのID */

    // ユーザーをフォローする
    async followUser(followerId, followedId) {
        try {
            const query = 'INSERT INTO relationship (follower_id, followed_id) VALUES (?, ?)';
            await db.execute(query, [followerId, followedId]);
            console.log('User followed successfully');
        } catch (err) {
            console.error('[FollowDAO] followUser Error:', err);
            throw err;
        }
    }

    // ユーザーのフォローを解除する
    async unfollowUser(followerId, followedId) {
        try {
            const query = 'DELETE FROM relationship WHERE follower_id = ? AND followed_id = ?';
            await db.execute(query, [followerId, followedId]);
            console.log('User unfollowed successfully');
        } catch (err) {
            console.error('[FollowDAO] unfollowUser Error:', err);
            throw err;
        }
    }

    // 指定したユーザーがフォローしているユーザーのリストを取得する
    async getFollowedUsers(followerId) {
        try {
            const query = `
                SELECT u.user_id, u.user_name, i.photo_address
                FROM relationship r
                INNER JOIN table_user u ON r.followed_id = u.user_id
                INNER JOIN table_user_icon i ON u.profile_photo_id = i.profile_photo_id
                WHERE r.follower_id = ?
            `;
            const [rows] = await db.execute(query, [followerId]);
            return rows;
        } catch (err) {
            console.error('[FollowDAO] getFollowedUsers Error:', err);
            throw err;
        }
    }

    // 指定したユーザーをフォローしているユーザーのリストを取得する
    async getFollowers(followedId) {
        try {
            const query = `
                SELECT u.user_id, u.user_name, i.photo_address
                FROM relationship r
                INNER JOIN table_user u ON r.follower_id = u.user_id
                INNER JOIN table_user_icon i ON u.profile_photo_id = i.profile_photo_id
                WHERE r.followed_id = ?
            `;
            const [rows] = await db.execute(query, [followedId]);
            return rows;
        } catch (err) {
            console.error('[FollowDAO] getFollowers Error:', err);
            throw err;
        }
    }
}

module.exports = new FollowDAO();