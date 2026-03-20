// 家庭积分管理系统 V2 前端

const API_BASE = '';
let currentUser = null; // { type: 'admin' | 'child', data: {...} }
let children = [];

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', function() {
    loadChildrenForSelect();
    checkLoginState();
});

function checkLoginState() {
    // 从sessionStorage恢复登录状态
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        if (currentUser.type === 'admin') {
            showAdminHome();
        } else if (currentUser.type === 'child') {
            showChildHome();
        }
    }
}

function saveLoginState() {
    if (currentUser) {
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
        sessionStorage.removeItem('currentUser');
    }
}

// ===== 登录 =====
async function loadChildrenForSelect() {
    try {
        const res = await fetch(API_BASE + '/api/children');
        const data = await res.json();
        if (data.success) {
            const select = document.getElementById('child-select');
            select.innerHTML = '<option value="">选择孩子</option>';
            data.children.forEach(c => {
                select.innerHTML += `<option value="${c.name}">${c.name}</option>`;
            });
        }
    } catch (err) {
        console.error(err);
    }
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('请输入用户名和密码');
        return;
    }
    
    try {
        const res = await fetch(API_BASE + '/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password})
        });
        const data = await res.json();
        if (data.success) {
            currentUser = { type: 'admin', data: data.admin };
            saveLoginState();
            showAdminHome();
        } else {
            alert(data.message || '登录失败');
        }
    } catch (err) {
        alert('登录失败: ' + err.message);
    }
}

async function childLogin() {
    const name = document.getElementById('child-select').value;
    const password = document.getElementById('child-password').value;
    
    if (!name || !password) {
        alert('请选择孩子并输入密码');
        return;
    }
    
    try {
        const res = await fetch(API_BASE + '/api/child/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name, password})
        });
        const data = await res.json();
        if (data.success) {
            currentUser = { type: 'child', data: data.child };
            saveLoginState();
            showChildHome();
        } else {
            alert(data.message || '登录失败');
        }
    } catch (err) {
        alert('登录失败: ' + err.message);
    }
}

function logout() {
    currentUser = null;
    saveLoginState();
    children = [];
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('admin-home').classList.add('hidden');
    document.getElementById('child-home').classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('child-password').value = '';
    // 重置到孩子登录
    showChildLogin();
}

function showAdminLogin() {
    document.getElementById('admin-login').style.display = 'block';
    document.getElementById('child-select').closest('.login-form').style.display = 'none';
}

function showChildLogin() {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('child-select').closest('.login-form').style.display = 'block';
}

function showAdminHome() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('admin-home').classList.remove('hidden');
    showAdminTab('home');
    loadAdminData();
}

function showChildHome() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('child-home').classList.remove('hidden');
    document.getElementById('child-name-display').textContent = currentUser.data.name;
    document.getElementById('child-points').textContent = currentUser.data.points;
    loadChildData();
}

// ===== 加载管理员数据 =====
async function loadAdminData() {
    await Promise.all([
        loadChildren(),
        loadPointItems(),
        loadRewards(),
        loadRules()
    ]);
    // 加载记录时预先填充孩子筛选下拉框
    loadAllRecords();
}

async function loadChildren() {
    try {
        const res = await fetch(API_BASE + '/api/children');
        const data = await res.json();
        if (data.success) {
            children = data.children;
            renderChildrenList();
            // 同时更新登录选择框和孩子筛选下拉框
            loadChildrenForSelect();
            
            // 更新记录页的孩子筛选下拉框
            const childSelect = document.getElementById('filter-child');
            if (childSelect) {
                childSelect.innerHTML = '<option value="">全部孩子</option>';
                children.forEach(c => {
                    childSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
                });
            }
        }
    } catch (err) {
        console.error(err);
    }
}

function renderChildrenList() {
    const container = document.getElementById('children-list');
    container.innerHTML = children.map(c => `
        <div class="child-card">
            <div class="child-header">
                <h3>${c.name}</h3>
                <span class="age-badge">${c.age}岁</span>
                <span class="points-badge ${c.points >= 0 ? 'positive' : 'negative'}">${c.points}分</span>
            </div>
            <div class="child-actions">
                <button class="btn btn-success btn-sm" onclick="showAdjustPoints(${c.id}, '${c.name}')">➕ 加分</button>
                <button class="btn btn-danger btn-sm" onclick="showAdjustPoints(${c.id}, '${c.name}')">➖ 扣分</button>
                <button class="btn btn-outline btn-sm" onclick="editChild(${c.id}, '${c.name}', ${c.age}, '${c.password}')">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteChild(${c.id})">🗑️</button>
            </div>
        </div>
    `).join('') || '<p class="empty">暂无孩子，请添加</p>';
}

async function loadPointItems() {
    try {
        const res = await fetch(API_BASE + '/api/point-items');
        const data = await res.json();
        if (data.success) {
            const bonusItems = data.items.filter(i => i.is_bonus);
            const deductItems = data.items.filter(i => !i.is_bonus);
            
            document.getElementById('bonus-items-list').innerHTML = bonusItems.map(i => `
                <div class="item">
                    <div class="item-info">
                        <span class="item-name">${i.name}</span>
                        <span class="item-category">${i.category}</span>
                    </div>
                    <span class="points plus">+${i.points}</span>
                    <button class="btn-sm" onclick="editItem(${i.id}, '${i.name}', ${i.points}, '${i.category}', ${i.is_bonus})">编辑</button>
                    <button class="btn-sm btn-danger" onclick="deleteItem(${i.id})">删除</button>
                </div>
            `).join('') || '<p class="empty">暂无加分项目</p>';
            
            document.getElementById('deduct-items-list').innerHTML = deductItems.map(i => `
                <div class="item">
                    <div class="item-info">
                        <span class="item-name">${i.name}</span>
                        <span class="item-category">${i.category}</span>
                    </div>
                    <span class="points minus">${i.points}</span>
                    <button class="btn-sm" onclick="editItem(${i.id}, '${i.name}', ${i.points}, '${i.category}', ${i.is_bonus})">编辑</button>
                    <button class="btn-sm btn-danger" onclick="deleteItem(${i.id})">删除</button>
                </div>
            `).join('') || '<p class="empty">暂无扣分项目</p>';
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadRewards() {
    try {
        const res = await fetch(API_BASE + '/api/rewards');
        const data = await res.json();
        if (data.success) {
            document.getElementById('rewards-list').innerHTML = data.rewards.map(r => `
                <div class="item">
                    <div class="item-info">
                        <span class="item-name">${r.name}</span>
                        <span class="item-category">${r.category}</span>
                    </div>
                    <span class="points">${r.points_required}积分</span>
                    <button class="btn-sm" onclick="editReward(${r.id}, '${r.name}', ${r.points_required}, '${r.category}')">编辑</button>
                    <button class="btn-sm btn-danger" onclick="deleteReward(${r.id})">删除</button>
                </div>
            `).join('') || '<p class="empty">暂无奖励</p>';
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadRules() {
    try {
        const res = await fetch(API_BASE + '/api/rules');
        const data = await res.json();
        if (data.success && data.rules) {
            document.getElementById('rule-daily-limit').value = data.rules.daily_limit;
            document.getElementById('rule-deduct-limit').value = data.rules.deduct_limit;
            document.getElementById('rule-allow-negative').checked = data.rules.allow_negative;
        }
    } catch (err) {
        console.error(err);
    }
}

let recordsPage = 1;
const RECORDS_PER_PAGE = 10;

async function loadAllRecords() {
    const childId = document.getElementById('filter-child').value;
    const type = document.getElementById('filter-type').value;
    const dateStart = document.getElementById('filter-date-start').value;
    const dateEnd = document.getElementById('filter-date-end').value;
    
    try {
        const res = await fetch(API_BASE + '/api/all-records');
        const data = await res.json();
        if (data.success) {
            let records = data.records;
            
            if (childId) records = records.filter(r => r.child_id == childId);
            if (type) {
                if (type === 'bonus') records = records.filter(r => r.points > 0 && !r.item_name.startsWith('兑换:'));
                else if (type === 'deduct') records = records.filter(r => r.points < 0 && !r.item_name.startsWith('兑换:'));
                else if (type === 'redeem') records = records.filter(r => r.item_name.startsWith('兑换:'));
            }
            if (dateStart) {
                const start = new Date(dateStart).getTime() / 1000;
                records = records.filter(r => r.timestamp >= start);
            }
            if (dateEnd) {
                const end = new Date(dateEnd).getTime() / 1000 + 86400;
                records = records.filter(r => r.timestamp <= end);
            }
            
            const totalPages = Math.ceil(records.length / RECORDS_PER_PAGE);
            const start = (recordsPage - 1) * RECORDS_PER_PAGE;
            const pageRecords = records.slice(start, start + RECORDS_PER_PAGE);
            
            document.getElementById('all-records').innerHTML = pageRecords.map(r => {
                const time = new Date(r.timestamp * 1000).toLocaleDateString('zh-CN');
                const typeClass = r.points > 0 ? 'plus' : 'minus';
                return `<div class="record-item">
                    <span>${r.child_name} - ${r.item_name}</span>
                    <span class="points ${typeClass}">${r.points > 0 ? '+' : ''}${r.points}</span>
                    <small>${time}</small>
                </div>`;
            }).join('') || '<p class="empty">暂无记录</p>';
            
            if (totalPages > 1) {
                document.getElementById('all-records').innerHTML += `<div class="pagination">
                    <button onclick="changePage(-1)" ${recordsPage === 1 ? 'disabled' : ''}>上一页</button>
                    <span>${recordsPage}/${totalPages}</span>
                    <button onclick="changePage(1)" ${recordsPage >= totalPages ? 'disabled' : ''}>下一页</button>
                </div>`;
            }
            
            window.recordsData = records;
            window.totalPages = totalPages;
            
            const childSelect = document.getElementById('filter-child');
            if (childSelect.options.length <= 1) {
                children.forEach(c => {
                    childSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
                });
            }
        }
    } catch (err) {
        console.error(err);
    }
}

function changePage(delta) {
    recordsPage += delta;
    loadAllRecords();
}

// ===== 加载孩子数据 =====
async function loadChildData() {
    await Promise.all([
        loadChildBonusItems(),
        loadChildDeductItems(),
        loadChildRewards(),
        loadChildRecords()
    ]);
}

async function loadChildBonusItems() {
    try {
        const res = await fetch(API_BASE + '/api/point-items');
        const data = await res.json();
        if (data.success) {
            const bonusItems = data.items.filter(i => i.is_bonus);
            document.getElementById('child-bonus-items').innerHTML = bonusItems.map(i => {
                return `<button class="btn btn-success btn-lg" onclick="executeItem(${i.id}, '${i.name}', ${i.points})">${i.name} (+${i.points})</button>`;
            }).join('') || '<p class="empty">暂无奖励积分项目</p>';
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadChildDeductItems() {
    try {
        const res = await fetch(API_BASE + '/api/point-items');
        const data = await res.json();
        if (data.success) {
            const deductItems = data.items.filter(i => !i.is_bonus);
            document.getElementById('child-deduct-items').innerHTML = deductItems.map(i => {
                return `<button class="btn btn-danger btn-lg" onclick="executeItem(${i.id}, '${i.name}', ${i.points})">${i.name} (${i.points})</button>`;
            }).join('') || '<p class="empty">暂无处罚积分项目</p>';
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadChildRewards() {
    try {
        const res = await fetch(API_BASE + '/api/rewards');
        const data = await res.json();
        if (data.success) {
            document.getElementById('child-rewards').innerHTML = data.rewards.map(r => {
                const canRedeem = currentUser.data.points >= r.points_required;
                return `<div class="item">
                    <div class="item-info">
                        <span class="item-name">${r.name}</span>
                        <span class="points ${canRedeem ? 'plus' : ''}">${r.points_required}积分</span>
                    </div>
                    <button class="btn ${canRedeem ? 'btn-success' : 'btn-disabled'}" 
                            onclick="${canRedeem ? 'redeemReward(' + r.id + ', \'' + r.name + '\', ' + r.points_required + ')' : ''}"
                            ${!canRedeem ? 'disabled' : ''}>
                        ${canRedeem ? '兑换' : '不足'}
                    </button>
                </div>`;
            }).join('') || '<p class="empty">暂无可兑换奖励</p>';
        }
    } catch (err) {
        console.error(err);
    }
}

let childRecordsPage = 1;
const CHILD_RECORDS_PER_PAGE = 10;

async function loadChildRecords() {
    try {
        const res = await fetch(API_BASE + '/api/records/' + currentUser.data.id);
        const data = await res.json();
        if (data.success) {
            const records = data.records;
            const totalPages = Math.ceil(records.length / CHILD_RECORDS_PER_PAGE);
            const start = (childRecordsPage - 1) * CHILD_RECORDS_PER_PAGE;
            const pageRecords = records.slice(start, start + CHILD_RECORDS_PER_PAGE);
            
            document.getElementById('child-records').innerHTML = pageRecords.map(r => {
                const time = new Date(r.timestamp * 1000).toLocaleDateString('zh-CN');
                return `<div class="record-item">
                    <span>${r.item_name}</span>
                    <span class="points ${r.points > 0 ? 'plus' : 'minus'}">${r.points > 0 ? '+' : ''}${r.points}</span>
                    <small>${time}</small>
                </div>`;
            }).join('') || '<p class="empty">暂无记录</p>';
            
            if (totalPages > 1) {
                document.getElementById('child-records').innerHTML += `<div class="pagination">
                    <button onclick="changeChildPage(-1)" ${childRecordsPage === 1 ? 'disabled' : ''}>上一页</button>
                    <span>${childRecordsPage}/${totalPages}</span>
                    <button onclick="changeChildPage(1)" ${childRecordsPage >= totalPages ? 'disabled' : ''}>下一页</button>
                </div>`;
            }
        }
    } catch (err) {
        console.error(err);
    }
}

function changeChildPage(delta) {
    childRecordsPage += delta;
    loadChildRecords();
}

// ===== Tab切换 =====
function showAdminTab(tab) {
    document.querySelectorAll('#admin-home .nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('#admin-home .tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === 'tab-' + tab);
    });
}

function showChildTab(tab) {
    document.querySelectorAll('#child-home .child-tabs .nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('#child-home .tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === 'child-' + tab);
    });
}

function showItemSubTab(subtab) {
    document.querySelectorAll('#tab-settings .sub-tabs .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.subtab === subtab);
    });
    document.getElementById('bonus-items-list').classList.toggle('hidden', subtab !== 'bonus');
    document.getElementById('deduct-items-list').classList.toggle('hidden', subtab !== 'deduct');
}

// ===== 弹窗操作 =====
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ===== 折叠操作（同时只能打开一个）=====
function toggleSection(el) {
    if (el.classList.contains('collapsed')) {
        document.querySelectorAll('.collapsible').forEach(s => s.classList.add('collapsed'));
        el.classList.remove('collapsed');
    } else {
        el.classList.add('collapsed');
    }
}

function updateChildPasswordHint() {
    // 密码框留空提示用户
}

function showAddItem() {
    document.getElementById('item-id').value = '';
    document.getElementById('item-name').value = '';
    document.getElementById('item-points').value = '10';
    document.getElementById('item-category').value = '学习';
    document.getElementById('item-is-bonus').checked = true;
    document.getElementById('item-modal-title').textContent = '添加项目';
    document.getElementById('item-modal').classList.add('active');
}

function editItem(id, name, points, category, isBonus) {
    document.getElementById('item-id').value = id;
    document.getElementById('item-name').value = name;
    document.getElementById('item-points').value = points;
    document.getElementById('item-category').value = category;
    document.getElementById('item-is-bonus').checked = isBonus;
    document.getElementById('item-modal-title').textContent = '编辑项目';
    document.getElementById('item-modal').classList.add('active');
}

function showAddReward() {
    document.getElementById('reward-id').value = '';
    document.getElementById('reward-name').value = '';
    document.getElementById('reward-points').value = '100';
    document.getElementById('reward-category').value = '特权';
    document.getElementById('reward-modal-title').textContent = '添加奖励';
    document.getElementById('reward-modal').classList.add('active');
}

function editReward(id, name, pointsRequired, category) {
    document.getElementById('reward-id').value = id;
    document.getElementById('reward-name').value = name;
    document.getElementById('reward-points').value = pointsRequired;
    document.getElementById('reward-category').value = category;
    document.getElementById('reward-modal-title').textContent = '编辑奖励';
    document.getElementById('reward-modal').classList.add('active');
}

function showAddChild() {
    document.getElementById('child-edit-id').value = '';
    document.getElementById('child-edit-name').value = '';
    document.getElementById('child-edit-age').value = '';
    document.getElementById('child-edit-password').value = '';
    document.getElementById('child-modal-title').textContent = '添加孩子';
    document.getElementById('child-modal').classList.add('active');
}

function editChild(id, name, age, password) {
    document.getElementById('child-edit-id').value = id;
    document.getElementById('child-edit-name').value = name;
    document.getElementById('child-edit-age').value = age;
    document.getElementById('child-edit-password').value = '';
    document.getElementById('child-modal-title').textContent = '编辑孩子';
    document.getElementById('child-modal').classList.add('active');
}

function showAdjustPoints(childId, childName) {
    document.getElementById('points-child-id').value = childId;
    document.getElementById('points-child-name').textContent = childName;
    document.getElementById('adjust-points').value = '';
    document.getElementById('adjust-reason').value = '';
    document.getElementById('points-modal').classList.add('active');
}

// ===== 保存操作 =====
async function saveItem() {
    const id = document.getElementById('item-id').value;
    const name = document.getElementById('item-name').value;
    const points = parseInt(document.getElementById('item-points').value);
    const category = document.getElementById('item-category').value;
    const is_bonus = document.getElementById('item-is-bonus').checked;
    
    if (!name || isNaN(points)) {
        alert('请填写完整');
        return;
    }
    
    try {
        const res = await fetch(API_BASE + '/api/point-items', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: id || null, name, points, category, is_bonus})
        });
        const data = await res.json();
        if (data.success) {
            closeModal('item-modal');
            loadPointItems();
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert('保存失败');
    }
}

async function deleteItem(id) {
    if (!confirm('确定删除？')) return;
    try {
        const res = await fetch(API_BASE + '/api/point-items/' + id, {method: 'DELETE'});
        const data = await res.json();
        if (data.success) loadPointItems();
    } catch (err) {
        alert('删除失败');
    }
}

async function saveReward() {
    const id = document.getElementById('reward-id').value;
    const name = document.getElementById('reward-name').value;
    const points_required = parseInt(document.getElementById('reward-points').value);
    const category = document.getElementById('reward-category').value;
    
    if (!name || isNaN(points_required)) {
        alert('请填写完整');
        return;
    }
    
    try {
        const res = await fetch(API_BASE + '/api/rewards', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: id || null, name, points_required, category})
        });
        const data = await res.json();
        if (data.success) {
            closeModal('reward-modal');
            loadRewards();
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert('保存失败');
    }
}

async function deleteReward(id) {
    if (!confirm('确定删除？')) return;
    try {
        const res = await fetch(API_BASE + '/api/rewards/' + id, {method: 'DELETE'});
        const data = await res.json();
        if (data.success) loadRewards();
    } catch (err) {
        alert('删除失败');
    }
}

async function saveChild() {
    const id = document.getElementById('child-edit-id').value;
    const name = document.getElementById('child-edit-name').value;
    const age = parseInt(document.getElementById('child-edit-age').value);
    const password = document.getElementById('child-edit-password').value;
    
    if (!name || !age) {
        alert('请填写姓名和年龄');
        return;
    }
    
    try {
        const res = await fetch(API_BASE + '/api/children', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: id || null, name, age, password: password || null})
        });
        const data = await res.json();
        if (data.success) {
            closeModal('child-modal');
            loadChildren();
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert('保存失败');
    }
}

async function deleteChild(id) {
    if (!confirm('确定删除该孩子？')) return;
    try {
        const res = await fetch(API_BASE + '/api/children/' + id, {method: 'DELETE'});
        const data = await res.json();
        if (data.success) loadChildren();
    } catch (err) {
        alert('删除失败');
    }
}

async function adjustPoints() {
    const childId = document.getElementById('points-child-id').value;
    const points = parseInt(document.getElementById('adjust-points').value);
    const reason = document.getElementById('adjust-reason').value || '手动调整';
    
    if (isNaN(points)) {
        alert('请输入积分');
        return;
    }
    
    try {
        const res = await fetch(API_BASE + '/api/children/' + childId + '/points', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({points, reason})
        });
        const data = await res.json();
        if (data.success) {
            closeModal('points-modal');
            loadChildren();
            loadAllRecords();
            alert(points > 0 ? `已添加 ${points} 积分` : `已扣除 ${Math.abs(points)} 积分`);
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert('操作失败');
    }
}

async function resetChildPoints(id) {
    if (!confirm('确定重置该孩子的积分为0？')) return;
    try {
        const res = await fetch(API_BASE + '/api/children/' + id + '/reset', {method: 'POST'});
        const data = await res.json();
        if (data.success) {
            loadChildren();
            loadAllRecords();
            alert('积分已重置');
        }
    } catch (err) {
        alert('操作失败');
    }
}

async function changePassword() {
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!oldPassword || !newPassword) {
        alert('请填写完整');
        return;
    }
    if (newPassword !== confirmPassword) {
        alert('两次密码不一致');
        return;
    }
    
    try {
        const res = await fetch(API_BASE + '/api/admin/change-password', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({oldPassword, newPassword})
        });
        const data = await res.json();
        if (data.success) {
            alert('密码已修改，请重新登录');
            logout();
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert('修改失败');
    }
}

async function saveRules() {
    const daily_limit = parseInt(document.getElementById('rule-daily-limit').value);
    const deduct_limit = parseInt(document.getElementById('rule-deduct-limit').value);
    const allow_negative = document.getElementById('rule-allow-negative').checked;
    
    try {
        const res = await fetch(API_BASE + '/api/rules', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({daily_limit, deduct_limit, allow_negative})
        });
        const data = await res.json();
        if (data.success) {
            alert('保存成功');
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert('保存失败');
    }
}

// ===== 孩子操作 =====
async function executeItem(itemId, itemName, points) {
    try {
        const res = await fetch(API_BASE + '/api/records', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({childId: currentUser.data.id, itemName, points})
        });
        const data = await res.json();
        if (data.success) {
            alert(points > 0 ? `+${points}积分` : `${points}积分`);
            // 直接使用返回的最新积分
            if (data.newPoints !== undefined) {
                currentUser.data.points = data.newPoints;
                saveLoginState();
                document.getElementById('child-points').textContent = currentUser.data.points;
            }
            loadChildBonusItems();
            loadChildDeductItems();
            loadChildRewards();
            loadChildRecords();
        }
    } catch (err) {
        alert('操作失败');
    }
}

async function redeemReward(rewardId, rewardName, pointsRequired) {
    if (!confirm(`确认用${pointsRequired}积分兑换"${rewardName}"？`)) return;
    
    try {
        const res = await fetch(API_BASE + '/api/redeem', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({childId: currentUser.data.id, rewardId})
        });
        const data = await res.json();
        if (data.success) {
            alert('兑换成功！');
            // 直接使用返回的最新积分
            if (data.newPoints !== undefined) {
                currentUser.data.points = data.newPoints;
                saveLoginState();
                document.getElementById('child-points').textContent = currentUser.data.points;
            }
            loadChildRewards();
            loadChildRecords();
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert('兑换失败');
    }
}
