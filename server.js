const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3002;
const HOST = '0.0.0.0';
const DB_PATH = path.join(__dirname, 'data', 'points.db');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

let db;

// 初始化数据库
async function initDB() {
    const SQL = await initSqlJs();
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
        // 管理员表
        db.run(`
            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                nickname TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )
        `);
        // 孩子表
        db.run(`
            CREATE TABLE IF NOT EXISTS children (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                age INTEGER,
                points INTEGER DEFAULT 0,
                avatar TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )
        `);
        // 积分项目表（加分项）
        db.run(`
            CREATE TABLE IF NOT EXISTS bonus_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                points INTEGER NOT NULL,
                category TEXT DEFAULT '学习',
                icon TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )
        `);
        // 积分项目表（扣分项）
        db.run(`
            CREATE TABLE IF NOT EXISTS deduct_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                points INTEGER NOT NULL,
                category TEXT DEFAULT '学习',
                icon TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )
        `);
        // 奖励表
        db.run(`
            CREATE TABLE IF NOT EXISTS rewards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                points_required INTEGER NOT NULL,
                category TEXT DEFAULT '物质',
                icon TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )
        `);
        // 记录表
        db.run(`
            CREATE TABLE IF NOT EXISTS records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                child_id INTEGER,
                item_name TEXT,
                points INTEGER,
                type TEXT,
                operator_id INTEGER,
                note TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // 管理员操作日志
        db.run(`
            CREATE TABLE IF NOT EXISTS admin_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER,
                action TEXT,
                detail TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 默认管理员
        db.run("INSERT INTO admins (username, password, nickname) VALUES (?, ?, ?)", ['admin', '123456', '管理员']);
        
        // 默认孩子
        db.run("INSERT INTO children (name, age, points) VALUES (?, ?, ?)", ['萌萌', 11, 0]);
        db.run("INSERT INTO children (name, age, points) VALUES (?, ?, ?)", ['培培', 16, 0]);
        
        // 默认加分项
        db.run("INSERT INTO bonus_items (name, points, category) VALUES (?, ?, ?)", ['完成作业', 10, '学习']);
        db.run("INSERT INTO bonus_items (name, points, category) VALUES (?, ?, ?)", ['考试满分', 50, '学习']);
        db.run("INSERT INTO bonus_items (name, points, category) VALUES (?, ?, ?)", ['阅读课外书', 5, '学习']);
        db.run("INSERT INTO bonus_items (name, points, category) VALUES (?, ?, ?)", ['整理房间', 5, '生活']);
        db.run("INSERT INTO bonus_items (name, points, category) VALUES (?, ?, ?)", ['帮忙做家务', 10, '生活']);
        db.run("INSERT INTO bonus_items (name, points, category) VALUES (?, ?, ?)", ['按时起床', 5, '习惯']);
        
        // 默认扣分项
        db.run("INSERT INTO deduct_items (name, points, category) VALUES (?, ?, ?)", ['迟到', 5, '生活']);
        db.run("INSERT INTO deduct_items (name, points, category) VALUES (?, ?, ?)", ['未完成作业', 10, '学习']);
        db.run("INSERT INTO deduct_items (name, points, category) VALUES (?, ?, ?)", ['玩手机超时', 10, '习惯']);
        
        // 默认奖励
        db.run("INSERT INTO rewards (name, points_required, category) VALUES (?, ?, ?)", ['买零食', 20, '物质']);
        db.run("INSERT INTO rewards (name, points_required, category) VALUES (?, ?, ?)", ['看动画片1小时', 30, '特权']);
        db.run("INSERT INTO rewards (name, points_required, category) VALUES (?, ?, ?)", ['玩游戏30分钟', 50, '特权']);
        db.run("INSERT INTO rewards (name, points_required, category) VALUES (?, ?, ?)", ['去游乐场', 200, '物质']);
        
        saveDatabase();
    }
}

function saveDatabase() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

// ===== API =====

// 管理员登录
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const stmt = db.prepare("SELECT * FROM admins WHERE username = ?");
    stmt.bind([username]);
    if (stmt.step()) {
        const admin = stmt.getAsObject();
        if (password === admin.password) {
            res.json({ success: true, admin: { id: admin.id, nickname: admin.nickname, username: admin.username } });
        } else {
            res.json({ success: false, message: '密码错误' });
        }
    } else {
        res.json({ success: false, message: '用户不存在' });
    }
});

// 修改密码
app.post('/api/admin/password', (req, res) => {
    const { adminId, oldPassword, newPassword } = req.body;
    const stmt = db.prepare("SELECT * FROM admins WHERE id = ?");
    stmt.bind([adminId]);
    if (stmt.step()) {
        const admin = stmt.getAsObject();
        if (oldPassword === admin.password) {
            db.run("UPDATE admins SET password = ? WHERE id = ?", [newPassword, adminId]);
            saveDatabase();
            res.json({ success: true });
        } else {
            res.json({ success: false, message: '原密码错误' });
        }
    } else {
        res.json({ success: false, message: '用户不存在' });
    }
});

// 获取所有孩子
app.get('/api/children', (req, res) => {
    const stmt = db.prepare("SELECT * FROM children ORDER BY id");
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    res.json(results);
});

// 添加/编辑孩子
app.post('/api/children', (req, res) => {
    const { id, name, age, avatar } = req.body;
    if (id) {
        db.run("UPDATE children SET name = ?, age = ?, avatar = ? WHERE id = ?", [name, age, avatar || '', id]);
    } else {
        db.run("INSERT INTO children (name, age, points, avatar) VALUES (?, ?, 0, ?)", [name, age, avatar || '']);
    }
    saveDatabase();
    res.json({ success: true });
});

// 删除孩子
app.delete('/api/children/:id', (req, res) => {
    db.run("DELETE FROM children WHERE id = ?", [req.params.id]);
    saveDatabase();
    res.json({ success: true });
});

// 获取加分项
app.get('/api/bonus-items', (req, res) => {
    const stmt = db.prepare("SELECT * FROM bonus_items ORDER BY id");
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    res.json(results);
});

// 添加/编辑加分项
app.post('/api/bonus-items', (req, res) => {
    const { id, name, points, category, icon } = req.body;
    if (id) {
        db.run("UPDATE bonus_items SET name = ?, points = ?, category = ?, icon = ? WHERE id = ?", [name, points, category, icon || '', id]);
    } else {
        db.run("INSERT INTO bonus_items (name, points, category, icon) VALUES (?, ?, ?, ?)", [name, points, category, icon || '']);
    }
    saveDatabase();
    res.json({ success: true });
});

// 删除加分项
app.delete('/api/bonus-items/:id', (req, res) => {
    db.run("DELETE FROM bonus_items WHERE id = ?", [req.params.id]);
    saveDatabase();
    res.json({ success: true });
});

// 获取扣分项
app.get('/api/deduct-items', (req, res) => {
    const stmt = db.prepare("SELECT * FROM deduct_items ORDER BY id");
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    res.json(results);
});

// 添加/编辑扣分项
app.post('/api/deduct-items', (req, res) => {
    const { id, name, points, category, icon } = req.body;
    if (id) {
        db.run("UPDATE deduct_items SET name = ?, points = ?, category = ?, icon = ? WHERE id = ?", [name, points, category, icon || '', id]);
    } else {
        db.run("INSERT INTO deduct_items (name, points, category, icon) VALUES (?, ?, ?, ?)", [name, points, category, icon || '']);
    }
    saveDatabase();
    res.json({ success: true });
});

// 删除扣分项
app.delete('/api/deduct-items/:id', (req, res) => {
    db.run("DELETE FROM deduct_items WHERE id = ?", [req.params.id]);
    saveDatabase();
    res.json({ success: true });
});

// 获取奖励
app.get('/api/rewards', (req, res) => {
    const stmt = db.prepare("SELECT * FROM rewards ORDER BY points_required");
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    res.json(results);
});

// 添加/编辑奖励
app.post('/api/rewards', (req, res) => {
    const { id, name, points_required, category, icon } = req.body;
    if (id) {
        db.run("UPDATE rewards SET name = ?, points_required = ?, category = ?, icon = ? WHERE id = ?", [name, points_required, category, icon || '', id]);
    } else {
        db.run("INSERT INTO rewards (name, points_required, category, icon) VALUES (?, ?, ?, ?)", [name, points_required, category, icon || '']);
    }
    saveDatabase();
    res.json({ success: true });
});

// 删除奖励
app.delete('/api/rewards/:id', (req, res) => {
    db.run("DELETE FROM rewards WHERE id = ?", [req.params.id]);
    saveDatabase();
    res.json({ success: true });
});

// 积分操作（加分）
app.post('/api/bonus', (req, res) => {
    const { childId, itemId, adminId, note } = req.body;
    
    // 获取加分项
    const itemStmt = db.prepare("SELECT * FROM bonus_items WHERE id = ?");
    itemStmt.bind([itemId]);
    if (!itemStmt.step()) {
        return res.json({ success: false, message: '项目不存在' });
    }
    const item = itemStmt.getAsObject();
    
    // 更新孩子积分
    db.run("UPDATE children SET points = points + ? WHERE id = ?", [item.points, childId]);
    
    // 记录
    db.run("INSERT INTO records (child_id, item_name, points, type, operator_id, note) VALUES (?, ?, ?, '加分', ?, ?)", 
        [childId, item.name, item.points, adminId, note || '']);
    
    // 管理员日志
    const childStmt = db.prepare("SELECT name FROM children WHERE id = ?");
    childStmt.bind([childId]);
    childStmt.step();
    const childName = childStmt.getAsObject().name;
    db.run("INSERT INTO admin_logs (admin_id, action, detail) VALUES (?, '加分', ?)", 
        [adminId, `给 ${childName} 添加 ${item.points} 分：${item.name}`]);
    
    saveDatabase();
    res.json({ success: true, points: item.points });
});

// 积分操作（扣分）
app.post('/api/deduct', (req, res) => {
    const { childId, itemId, adminId, note } = req.body;
    
    // 获取扣分项
    const itemStmt = db.prepare("SELECT * FROM deduct_items WHERE id = ?");
    itemStmt.bind([itemId]);
    if (!itemStmt.step()) {
        return res.json({ success: false, message: '项目不存在' });
    }
    const item = itemStmt.getAsObject();
    
    // 更新孩子积分
    db.run("UPDATE children SET points = points - ? WHERE id = ?", [item.points, childId]);
    
    // 记录
    db.run("INSERT INTO records (child_id, item_name, points, type, operator_id, note) VALUES (?, ?, ?, '扣分', ?, ?)", 
        [childId, item.name, -item.points, adminId, note || '']);
    
    // 管理员日志
    const childStmt = db.prepare("SELECT name FROM children WHERE id = ?");
    childStmt.bind([childId]);
    childStmt.step();
    const childName = childStmt.getAsObject().name;
    db.run("INSERT INTO admin_logs (admin_id, action, detail) VALUES (?, '扣分', ?)", 
        [adminId, `给 ${childName} 扣除 ${item.points} 分：${item.name}`]);
    
    saveDatabase();
    res.json({ success: true, points: -item.points });
});

// 兑换奖励
app.post('/api/redeem', (req, res) => {
    const { childId, rewardId, adminId } = req.body;
    
    // 获取奖励
    const rewardStmt = db.prepare("SELECT * FROM rewards WHERE id = ?");
    rewardStmt.bind([rewardId]);
    if (!rewardStmt.step()) {
        return res.json({ success: false, message: '奖励不存在' });
    }
    const reward = rewardStmt.getAsObject();
    
    // 获取孩子积分
    const childStmt = db.prepare("SELECT * FROM children WHERE id = ?");
    childStmt.bind([childId]);
    if (!childStmt.step()) {
        return res.json({ success: false, message: '孩子不存在' });
    }
    const child = childStmt.getAsObject();
    
    if (child.points < reward.points_required) {
        return res.json({ success: false, message: '积分不足' });
    }
    
    // 扣除积分并记录
    db.run("UPDATE children SET points = points - ? WHERE id = ?", [reward.points_required, childId]);
    db.run("INSERT INTO records (child_id, item_name, points, type, operator_id) VALUES (?, ?, ?, '兑换', ?)", 
        [childId, reward.name, -reward.points_required, adminId]);
    
    saveDatabase();
    res.json({ success: true });
});

// 获取记录
app.get('/api/records', (req, res) => {
    const { childId, type, days } = req.query;
    let sql = "SELECT r.*, c.name as child_name, a.nickname as admin_name FROM records r LEFT JOIN children c ON r.child_id = c.id LEFT JOIN admins a ON r.operator_id = a.id";
    const params = [];
    const conditions = [];
    
    if (childId) {
        conditions.push("r.child_id = ?");
        params.push(childId);
    }
    if (type) {
        conditions.push("r.type = ?");
        params.push(type);
    }
    if (days) {
        conditions.push("r.timestamp >= datetime('now', '-' || ? || ' days')");
        params.push(days);
    }
    
    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }
    sql += " ORDER BY r.timestamp DESC LIMIT 200";
    
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    res.json(results);
});

// 统计API
app.get('/api/statistics', (req, res) => {
    const { childId, days = 30 } = req.query;
    
    // 基本统计
    let stats = {};
    
    // 孩子列表
    const childrenStmt = db.prepare("SELECT * FROM children ORDER BY points DESC");
    const children = [];
    while (childrenStmt.step()) {
        children.push(childrenStmt.getAsObject());
    }
    stats.children = children;
    
    // 积分趋势（按天）
    let trendSql = `
        SELECT date(timestamp) as date, 
               SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as bonus,
               SUM(CASE WHEN points < 0 THEN points ELSE 0 END) as deduct
        FROM records
        WHERE timestamp >= datetime('now', '-' || ? || ' days')
    `;
    const params = [days];
    if (childId) {
        trendSql += " AND child_id = ?";
        params.push(childId);
    }
    trendSql += " GROUP BY date(timestamp) ORDER BY date";
    
    const trendStmt = db.prepare(trendSql);
    trendStmt.bind(params);
    const trend = [];
    while (trendStmt.step()) {
        trend.push(trendStmt.getAsObject());
    }
    stats.trend = trend;
    
    // 分类统计
    let categorySql = `
        SELECT category, SUM(ABS(points)) as total, COUNT(*) as count
        FROM records r
        LEFT JOIN (
            SELECT name, category FROM bonus_items
            UNION ALL
            SELECT name, category FROM deduct_items
        ) i ON r.item_name = i.name
        WHERE r.timestamp >= datetime('now', '-' || ? || ' days')
    `;
    const catParams = [days];
    if (childId) {
        categorySql += " AND r.child_id = ?";
        catParams.push(childId);
    }
    categorySql += " GROUP BY category";
    
    const categoryStmt = db.prepare(categorySql);
    categoryStmt.bind(catParams);
    const categoryStats = [];
    while (categoryStmt.step()) {
        categoryStats.push(categoryStmt.getAsObject());
    }
    stats.category = categoryStats;
    
    // 今日数据
    const todayStmt = db.prepare(`
        SELECT 
            COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) as today_bonus,
            COALESCE(SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END), 0) as today_deduct,
            COUNT(*) as today_count
        FROM records
        WHERE date(timestamp) = date('now')
    `);
    if (todayStmt.step()) {
        stats.today = todayStmt.getAsObject();
    }
    
    res.json(stats);
});

// 管理员日志
app.get('/api/admin/logs', (req, res) => {
    const { adminId, limit = 50 } = req.query;
    let sql = "SELECT l.*, a.nickname FROM admin_logs l LEFT JOIN admins a ON l.admin_id = a.id";
    const params = [];
    if (adminId) {
        sql += " WHERE l.admin_id = ?";
        params.push(adminId);
    }
    sql += " ORDER BY l.timestamp DESC LIMIT ?";
    params.push(limit);
    
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    res.json(results);
});

// 管理员管理
app.get('/api/admins', (req, res) => {
    const stmt = db.prepare("SELECT id, username, nickname, created_at FROM admins");
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    res.json(results);
});

app.post('/api/admins', (req, res) => {
    const { id, username, password, nickname } = req.body;
    if (id) {
        if (password) {
            db.run("UPDATE admins SET username = ?, password = ?, nickname = ? WHERE id = ?", [username, password, nickname, id]);
        } else {
            db.run("UPDATE admins SET username = ?, nickname = ? WHERE id = ?", [username, nickname, id]);
        }
    } else {
        db.run("INSERT INTO admins (username, password, nickname) VALUES (?, ?, ?)", [username, password, nickname]);
    }
    saveDatabase();
    res.json({ success: true });
});

app.delete('/api/admins/:id', (req, res) => {
    if (req.params.id == 1) {
        return res.json({ success: false, message: '不能删除超级管理员' });
    }
    db.run("DELETE FROM admins WHERE id = ?", [req.params.id]);
    saveDatabase();
    res.json({ success: true });
});

app.listen(PORT, HOST, () => {
    console.log(`家庭积分管理系统V3已启动: http://${HOST}:${PORT}`);
    initDB();
});
