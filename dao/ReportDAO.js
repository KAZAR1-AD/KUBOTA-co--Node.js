// dao/ReportDAO.js

const dbPool = require('../database'); // 接続プールをインポート

class ReportDAO {
    
    // IDに基づいて単一のレポートデータを取得 (FIN001, FIN002, ...に対応)
    async findByReportId(reportId) {
        // 例: 'FIN' + IDで検索できるようにする
        const reportCode = 'FIN' + String(reportId).padStart(3, '0');
        
        // 🚨 テーブル名とカラム名はあなたのMySQLに合わせて修正してください 🚨
        const sql = `SELECT * FROM reports WHERE report_code = ?`; 
        const [rows] = await dbPool.execute(sql, [reportCode]);
        
        return rows.length ? rows[0] : null; // 結果の最初の行を返す
    }

    // 全レポートの一覧を取得
    async findAll() {
        // 🚨 テーブル名とカラム名はあなたのMySQLに合わせて修正してください 🚨
        const sql = 'SELECT report_code, title, summary FROM reports ORDER BY created_at DESC';
        const [rows] = await dbPool.execute(sql);
        return rows;
    }
}

// DAOのインスタンスをエクスポート
module.exports = new ReportDAO();