const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'points.db');

let db = null;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 确保数据目录存在
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 数据库初始化
async function initDatabase() {
    const SQL = await initSqlJs();
    
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
        console.log('已加载现有数据库');
    } else {
        db = new SQL.Database();
        console.log('创建新数据库');
    }
    
    // 管理员表
    db.run(`
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `);
    
    // 孩子表
    db.run(`
        CREATE TABLE IF NOT EXISTS child (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER,
            points INTEGER DEFAULT 0,
            password TEXT NOT NULL,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `);
    
    // 积分项目
    db.run(`
        CREATE TABLE IF NOT EXISTS point_item (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            points INTEGER NOT NULL,
            category TEXT,
            is_bonus INTEGER DEFAULT 1,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `);
    
    // 奖励表
    db.run(`
        CREATE TABLE IF NOT EXISTS reward (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            points_required INTEGER NOT NULL,
            category TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `);
    
    // 规则表
    db.run(`
        CREATE TABLE IF NOT EXISTS rules (
            id INTEGER PRIMARY KEY,
            daily_limit INTEGER DEFAULT 50,
            deduct_limit INTEGER DEFAULT 30,
            allow_negative INTEGER DEFAULT 0
        )
    `);
    
    // 记录表
    db.run(`
        CREATE TABLE IF NOT EXISTS record (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            child_id INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            points INTEGER NOT NULL,
            timestamp INTEGER DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (child_id) REFERENCES child(id)
        )
    `);
    
    // 检查是否需要创建默认数据
    const adminCount = db.exec("SELECT COUNT(*) FROM admin")[0]?.values[0][0] || 0;
    if (adminCount === 0) {
        // 创建管理员
        db.run("INSERT INTO admin (id, username, password) VALUES (1, 'admin', '123456')");
        
        // 创建默认孩子
        db.run("INSERT INTO child (name, age, points, password) VALUES (?, ?, ?, ?)", ['孩子1', 11, 0, '111111']);
        db.run("INSERT INTO child (name, age, points, password) VALUES (?, ?, ?, ?)", ['孩子2', 16, 0, '161616']);
        
        // 创建默认积分项目
        db.run("INSERT INTO point_item (name, points, category, is_bonus) VALUES (?, ?, ?, ?)", ['完成作业', 10, '学习', 1]);
        db.run("INSERT INTO point_item (name, points, category, is_bonus) VALUES (?, ?, ?, ?)", ['考试满分', 50, '学习', 1]);
        db.run("INSERT INTO point_item (name, points, category, is_bonus) VALUES (?, ?, ?, ?)", ['阅读课外书', 5, '学习', 1]);
        db.run("INSERT INTO point_item (name, points, category, is_bonus) VALUES (?, ?, ?, ?)", ['整理房间', 5, '生活', 1]);
        db.run("INSERT INTO point_item (name, points, category, is_bonus) VALUES (?, ?, ?, ?)", ['帮忙做家务', 10, '生活', 1]);
        db.run("INSERT INTO point_item (name, points, category, is_bonus) VALUES (?, ?, ?, ?)", ['按时起床', 5, '习惯', 1]);
        db.run("INSERT INTO point_item (name, points, category, is_bonus) VALUES (?, ?, ?, ?)", ['迟到', -5, '生活', 0]);
        db.run("INSERT INTO point_item (name, points, category, is_bonus) VALUES (?, ?, ?, ?)", ['未完成作业', -10, '学习', 0]);
        db.run("INSERT INTO point_item (name, points, category, is_bonus) VALUES (?, ?, ?, ?)", ['玩手机超时', -10, '习惯', 0]);
        
        // 创建默认奖励
        db.run("INSERT INTO reward (name, points_required, category) VALUES (?, ?, ?)", ['玩游戏30分钟', 50, '特权']);
        db.run("INSERT INTO reward (name, points_required, category) VALUES (?, ?, ?)", ['看动画片1小时', 30, '特权']);
        db.run("INSERT INTO reward (name, points_required, category) VALUES (?, ?, ?)", ['去游乐场', 200, '物质']);
        db.run("INSERT INTO reward (name, points_required, category) VALUES (?, ?, ?)", ['买零食', 20, '物质']);
        db.run("INSERT INTO reward (name, points_required, category) VALUES (?, ?, ?)", ['获得玩具', 500, '物质']);
        
        // 创建默认规则
        db.run("INSERT INTO rules (id, daily_limit, deduct_limit, allow_negative) VALUES (1, 50, 30, 0)");
        
        saveDatabase();
        console.log('默认数据创建完成');
    }
}

function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

function saveDbMiddleware(req, res, next) {
    res.on('finish', saveDatabase);
    next();
}
app.use(saveDbMiddleware);

// ===== API 接口 =====

// 管理员登录
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    try {
        const stmt = db.prepare("SELECT * FROM admin WHERE username = ? AND password = ?");
        stmt.bind([username, password]);
        if (stmt.step()) {
            const admin = stmt.getAsObject();
            res.json({ success: true, admin: { id: admin.id, username: admin.username } });
        } else {
            res.json({ success: false, message: '用户名或密码错误' });
        }
        stmt.free();
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 修改管理员密码
app.post('/api/admin/change-password', (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
        const stmt = db.prepare("SELECT * FROM admin WHERE password = ?");
        stmt.bind([oldPassword]);
        if (!stmt.step()) {
            stmt.free();
            res.json({ success: false, message: '原密码错误' });
            return;
        }
        stmt.free();
        
        db.run("UPDATE admin SET password = ? WHERE id = 1", [newPassword]);
        saveDatabase();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 获取所有孩子
app.get('/api/children', (req, res) => {
    try {
        const stmt = db.prepare("SELECT * FROM child ORDER BY id");
        const children = [];
        while (stmt.step()) {
            children.push(stmt.getAsObject());
        }
        stmt.free();
        res.json({ success: true, children });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 添加/编辑孩子
app.post('/api/children', (req, res) => {
    const { id, name, age, password } = req.body;
    try {
        if (id) {
            if (password) {
                db.run("UPDATE child SET name = ?, age = ?, password = ? WHERE id = ?", [name, age, password, id]);
            } else {
                db.run("UPDATE child SET name = ?, age = ? WHERE id = ?", [name, age, id]);
            }
        } else {
            db.run("INSERT INTO child (name, age, points, password) VALUES (?, ?, ?, ?)", [name, age, 0, password || '123456']);
        }
        saveDatabase();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 删除孩子
app.delete('/api/children/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.run("DELETE FROM record WHERE child_id = ?", [id]);
        db.run("DELETE FROM child WHERE id = ?", [id]);
        saveDatabase();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 手动调整孩子积分
app.post('/api/children/:id/points', (req, res) => {
    const { id } = req.params;
    const { points, reason } = req.body;
    try {
        db.run("UPDATE child SET points = points + ? WHERE id = ?", [points, id]);
        db.run("INSERT INTO record (child_id, item_name, points) VALUES (?, ?, ?)", [id, reason || '手动调整', points]);
        saveDatabase();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 重置孩子积分
app.post('/api/children/:id/reset', (req, res) => {
    const { id } = req.params;
    try {
        db.run("UPDATE child SET points = 0 WHERE id = ?", [id]);
        saveDatabase();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 孩子登录
app.post('/api/child/login', (req, res) => {
    const { name, password } = req.body;
    try {
        const stmt = db.prepare("SELECT * FROM child WHERE name = ? AND password = ?");
        stmt.bind([name, password]);
        if (stmt.step()) {
            const child = stmt.getAsObject();
            res.json({ success: true, child: { id: child.id, name: child.name, age: child.age, points: child.points } });
        } else {
            res.json({ success: false, message: '孩子姓名或密码错误' });
        }
        stmt.free();
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 获取积分项目
app.get('/api/point-items', (req, res) => {
    try {
        const stmt = db.prepare("SELECT * FROM point_item ORDER BY is_bonus DESC, id");
        const items = [];
        while (stmt.step()) {
            items.push(stmt.getAsObject());
        }
        stmt.free();
        res.json({ success: true, items });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 添加/编辑积分项目
app.post('/api/point-items', (req, res) => {
    const { id, name, points, category, is_bonus } = req.body;
    try {
        if (id) {
            db.run("UPDATE point_item SET name = ?, points = ?, category = ?, is_bonus = ? WHERE id = ?", [name, points, category, is_bonus ? 1 : 0, id]);
        } else {
            db.run("INSERT INTO point_item (name, points, category, is_bonus) VALUES (?, ?, ?, ?)", [name, points, category, is_bonus ? 1 : 0]);
        }
        saveDatabase();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 删除积分项目
app.delete('/api/point-items/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.run("DELETE FROM point_item WHERE id = ?", [id]);
        saveDatabase();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 获取奖励列表
app.get('/api/rewards', (req, res) => {
    try {
        const stmt = db.prepare("SELECT * FROM reward ORDER BY points_required");
        const rewards = [];
        while (stmt.step()) {
            rewards.push(stmt.getAsObject());
        }
        stmt.free();
        res.json({ success: true, rewards });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 添加/编辑奖励
app.post('/api/rewards', (req, res) => {
    const { id, name, points_required, category } = req.body;
    try {
        if (id) {
            db.run("UPDATE reward SET name = ?, points_required = ?, category = ? WHERE id = ?", [name, points_required, category, id]);
        } else {
            db.run("INSERT INTO reward (name, points_required, category) VALUES (?, ?, ?)", [name, points_required, category]);
        }
        saveDatabase();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 删除奖励
app.delete('/api/rewards/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.run("DELETE FROM reward WHERE id = ?", [id]);
        saveDatabase();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 获取规则
app.get('/api/rules', (req, res) => {
    try {
        const stmt = db.prepare("SELECT * FROM rules WHERE id = 1");
        let rules = null;
        if (stmt.step()) {
            rules = stmt.getAsObject();
        }
        stmt.free();
        res.json({ success: true, rules });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 保存规则
app.post('/api/rules', (req, res) => {
    const { daily_limit, deduct_limit, allow_negative } = req.body;
    try {
        db.run("UPDATE rules SET daily_limit = ?, deduct_limit = ?, allow_negative = ? WHERE id = 1", [daily_limit, deduct_limit, allow_negative ? 1 : 0]);
        saveDatabase();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 添加积分记录（孩子执行项目）
app.post('/api/records', (req, res) => {
    const { childId, itemName, points } = req.body;
    try {
        // 获取规则
        const rulesStmt = db.prepare("SELECT * FROM rules WHERE id = 1");
        let rules = { daily_limit: 50, deduct_limit: 30, allow_negative: 0 };
        if (rulesStmt.step()) {
            rules = rulesStmt.getAsObject();
        }
        rulesStmt.free();
        
        // 获取孩子今天的积分变动
        const today = Math.floor(Date.now() / 1000 / 86400) * 86400;
        const dayStart = today;
        const dayEnd = today + 86400;
        
        const dayStmt = db.prepare("SELECT SUM(points) as day_points FROM record WHERE child_id = ? AND timestamp >= ? AND timestamp < ?");
        dayStmt.bind([childId, dayStart, dayEnd]);
        dayStmt.step();
        const dayResult = dayStmt.getAsObject();
        const dayPoints = dayResult.day_points || 0;
        dayStmt.free();
        
        // 检查规则
        if (points > 0 && rules.daily_limit > 0 && dayPoints + points > rules.daily_limit) {
            res.json({ success: false, message: `今日积分已达上限 ${rules.daily_limit} 分` });
            return;
        }
        
        if (points < 0 && rules.deduct_limit > 0 && dayPoints + points < -rules.deduct_limit) {
            res.json({ success: false, message: `今日扣分已达上限 ${rules.deduct_limit} 分` });
            return;
        }
        
        if (!rules.allow_negative && dayPoints + points < 0) {
            res.json({ success: false, message: '积分不足，无法扣分' });
            return;
        }
        
        // 执行积分变动
        db.run("INSERT INTO record (child_id, item_name, points) VALUES (?, ?, ?)", [childId, itemName, points]);
        db.run("UPDATE child SET points = points + ? WHERE id = ?", [points, childId]);
        
        // 获取更新后的积分
        const stmt = db.prepare("SELECT points FROM child WHERE id = ?");
        stmt.bind([childId]);
        stmt.step();
        const newPoints = stmt.getAsObject().points;
        stmt.free();
        
        saveDatabase();
        res.json({ success: true, newPoints });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 获取单个孩子的记录
app.get('/api/records/:childId', (req, res) => {
    const { childId } = req.params;
    try {
        const stmt = db.prepare("SELECT * FROM record WHERE child_id = ? ORDER BY timestamp DESC LIMIT 100");
        stmt.bind([childId]);
        const records = [];
        while (stmt.step()) {
            records.push(stmt.getAsObject());
        }
        stmt.free();
        res.json({ success: true, records });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 获取所有记录
app.get('/api/all-records', (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT r.*, c.name as child_name 
            FROM record r 
            JOIN child c ON r.child_id = c.id 
            ORDER BY r.timestamp DESC 
            LIMIT 200
        `);
        const records = [];
        while (stmt.step()) {
            records.push(stmt.getAsObject());
        }
        stmt.free();
        res.json({ success: true, records });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 兑换奖励
app.post('/api/redeem', (req, res) => {
    const { childId, rewardId } = req.body;
    try {
        const stmt = db.prepare("SELECT * FROM reward WHERE id = ?");
        stmt.bind([rewardId]);
        if (!stmt.step()) {
            stmt.free();
            res.json({ success: false, message: '奖励不存在' });
            return;
        }
        const reward = stmt.getAsObject();
        stmt.free();
        
        const childStmt = db.prepare("SELECT points FROM child WHERE id = ?");
        childStmt.bind([childId]);
        childStmt.step();
        const child = childStmt.getAsObject();
        childStmt.free();
        
        if (child.points < reward.points_required) {
            res.json({ success: false, message: '积分不足' });
            return;
        }
        
        db.run("UPDATE child SET points = points - ? WHERE id = ?", [reward.points_required, childId]);
        db.run("INSERT INTO record (child_id, item_name, points) VALUES (?, ?, ?)", [childId, `兑换:${reward.name}`, -reward.points_required]);
        
        // 获取更新后的积分
        const newStmt = db.prepare("SELECT points FROM child WHERE id = ?");
        newStmt.bind([childId]);
        newStmt.step();
        const newPoints = newStmt.getAsObject().points;
        newStmt.free();
        
        saveDatabase();
        
        res.json({ success: true, message: '兑换成功', newPoints });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 启动服务器
initDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`家庭积分管理系统已启动: http://0.0.0.0:${PORT}`);
    });
}).catch(err => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
});
