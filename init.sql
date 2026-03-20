-- 家庭积分管理系统V2 数据库初始化

-- 创建表
CREATE TABLE IF NOT EXISTS family (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS child (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    age INTEGER,
    points INTEGER DEFAULT 0,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT '👶',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES family(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS point_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    points INTEGER NOT NULL,
    category TEXT DEFAULT 'bonus',
    is_bonus INTEGER DEFAULT 1,
    icon TEXT DEFAULT '⭐',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES family(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reward (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    points_required INTEGER NOT NULL,
    category TEXT DEFAULT 'gift',
    icon TEXT DEFAULT '🎁',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES family(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL UNIQUE,
    daily_limit INTEGER DEFAULT 100,
    deduct_limit INTEGER DEFAULT 50,
    allow_negative INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES family(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    points INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES child(id) ON DELETE CASCADE
);

-- 插入默认测试数据
INSERT INTO family (name, password) VALUES ('测试家庭', '123456');

INSERT INTO child (family_id, name, age, points, password, avatar) 
VALUES (1, '小明', 10, 0, '123456', '👦');

-- 默认积分项目
INSERT INTO point_item (family_id, name, points, category, is_bonus, icon) VALUES
(1, '收拾房间', 10, 'bonus', 1, '🧹'),
(1, '主动洗碗', 15, 'bonus', 1, '🍽️'),
(1, '作业完成', 20, 'bonus', 1, '📚'),
(1, '阅读课外书', 10, 'bonus', 1, '📖'),
(1, '帮助家务', 15, 'bonus', 1, '🧽'),
(1, '迟到', -10, 'deduct', 0, '⏰'),
(1, '不完成作业', -20, 'deduct', 0, '❌'),
(1, '乱扔玩具', -5, 'deduct', 0, '🧸');

-- 默认奖励
INSERT INTO reward (family_id, name, points_required, category, icon) VALUES
(1, '看动画片30分钟', 30, 'entertainment', '📺'),
(1, '玩游戏1小时', 50, 'entertainment', '🎮'),
(1, '买玩具', 100, 'gift', '🎁'),
(1, '去游乐场', 150, 'outdoor', '🎢'),
(1, '零花钱10元', 80, 'money', '💰');

-- 默认规则
INSERT INTO rules (family_id, daily_limit, deduct_limit, allow_negative) 
VALUES (1, 100, 50, 0);
