// 常量定义
const CONSTANTS = {
    // 颜色常量
    COLORS: {
        NONE: 'None',
        GREEN: 'Green',
        PURPLE: 'Purple',
        NONE_ABBREV: 'N',
        GREEN_ABBREV: 'G',
        PURPLE_ABBREV: 'P'
    },
    
    // Motif常量
    MOTIFS: [
        'GPP',
        'PGP',
        'PPG'
    ],
    DEFAULT_MOTIF: 'GPP',
    
    // 评分常量
    RATING_MIN: 1,
    RATING_MAX: 5,
    DEFAULT_DRIVER_RATING: 1,
    DEFAULT_DEFENSE_RATING: 1,
    
    // 分数常量
    AUTO_ROBOT_LEAVE: 3,
    CLASSIFIED_ARTIFACT: 3,
    OVERFLOW_ARTIFACT: 1,
    DEPOT_ARTIFACT: 1,
    PATTERN_MATCH: 2,
    BASE_RETURN_PARTIAL: 5,
    BASE_RETURN_FULL: 10,
    
    // 存储常量
    STORAGE_KEY: 'ftc-scout-data',
    USERS_STORAGE_KEY: 'ftc-scout-users',
    TEAMS_STORAGE_KEY: 'ftc-scout-teams',
    SCOUTING_DATA_STORAGE_KEY: 'ftc-scout-scouting-data',
    CURRENT_USER_STORAGE_KEY: 'ftc-scout-current-user',
    
    // 用户系统常量
    INVITE_CODE_LENGTH: 8,
    PASSWORD_SALT: 'ftc-scout-salt',
    
    // 防抖时间
    DEBOUNCE_TIME: 100,
    
    // API常量
    API_URL: 'http://localhost:8080',
    API_URL_STORAGE_KEY: 'ftc-scout-api-url'
};

// 获取当前使用的API地址（优先使用用户自定义的地址）
function getApiUrl() {
    const customUrl = localStorage.getItem(CONSTANTS.API_URL_STORAGE_KEY);
    console.log('当前主机名:', window.location.hostname);
    console.log('自定义API地址:', customUrl);
    // 如果是Railway部署，使用Railway后端URL
    if (window.location.hostname === '28119scout.railway.app' || window.location.hostname === '28119scout.up.railway.app') {
        // 使用实际的Railway后端URL
        console.log('使用Railway后端URL');
        return 'https://28119local.up.railway.app';
    }
    const result = customUrl || CONSTANTS.API_URL;
    console.log('返回的API地址:', result);
    return result;
}

// 保存自定义API地址到localStorage
function setApiUrl(url) {
    localStorage.setItem(CONSTANTS.API_URL_STORAGE_KEY, url);
}

// 清除自定义API地址（恢复使用默认地址）
function clearApiUrl() {
    localStorage.removeItem(CONSTANTS.API_URL_STORAGE_KEY);
}

// 全局数据模型
let gameData = {
    auto: {
        overflowArtifacts: 0,
        classifiedArtifacts: 0,
        robotLeave: false,
        slots: Array(9).fill(null).map((_, index) => ({
            id: index + 1,
            selectedColor: "None",
            isCorrect: false
        }))
    },
    teleOp: {
        depotArtifacts: 0,
        overflowArtifacts: 0,
        classifiedArtifacts: 0,
        baseReturnState: "None",
        slots: Array(9).fill(null).map((_, index) => ({
            id: index + 1,
            selectedColor: "None",
            isCorrect: false
        }))
    },
    general: {
        driverPerformance: CONSTANTS.DEFAULT_DRIVER_RATING,
        defenseRating: CONSTANTS.DEFAULT_DEFENSE_RATING,
        diedOnField: false,
        notes: ""
    }
};

// 全局变量
let selectedMotif = CONSTANTS.DEFAULT_MOTIF;
let serverStatusCheckInterval;
let currentCheckInterval = 60000;  // 默认60秒检查一次
let maxCheckInterval = 300000;     // 最长5分钟检查一次
let minCheckInterval = 60000;      // 最短1分钟检查一次
let isSubmitting = false; // 标记是否正在提交数据
let autoSaveInterval; // 自动保存间隔

// 添加加载状态指示
function showLoading(message = '加载中...') {
    // 移除已存在的加载元素
    hideLoading();
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingIndicator';
    loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        font-size: 20px;
        color: white;
    `;
    
    const loadingContent = document.createElement('div');
    loadingContent.style.cssText = `
        background-color: rgba(52, 152, 219, 0.9);
        padding: 20px 40px;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top: 4px solid white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    const text = document.createElement('div');
    text.textContent = message;
    
    loadingContent.appendChild(spinner);
    loadingContent.appendChild(text);
    loadingDiv.appendChild(loadingContent);
    document.body.appendChild(loadingDiv);
}

function hideLoading() {
    const loadingDiv = document.getElementById('loadingIndicator');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// 添加成功提示动画
function showSuccess(message = '操作成功') {
    // 移除已存在的提示元素
    hideSuccess();
    
    const successDiv = document.createElement('div');
    successDiv.id = 'successMessage';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #2ecc71;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-size: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        z-index: 9998;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    // 动画显示
    setTimeout(() => {
        successDiv.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        successDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 300);
    }, 3000);
}

function hideSuccess() {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.remove();
    }
}

// 添加错误提示动画
function showError(message = '操作失败') {
    // 移除已存在的提示元素
    hideError();
    
    const errorDiv = document.createElement('div');
    errorDiv.id = 'errorMessage';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #e74c3c;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-size: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        z-index: 9998;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // 动画显示
    setTimeout(() => {
        errorDiv.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        errorDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 300);
    }, 5000);
}

function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// 从后端获取队伍数据
async function fetchTeamsFromBackend() {
    try {
        showLoading('加载队伍数据中...');
        
        // 调用API获取队伍数据（不需要管理员密码）
        const response = await fetch(`${getApiUrl()}/api/teams`);
        
        if (response.ok) {
            const data = await response.json();
            // 保存队伍数据到localStorage
            localStorage.setItem(CONSTANTS.TEAMS_STORAGE_KEY, JSON.stringify(data.teams || {}));
            hideLoading();
            return true;
        } else {
            console.error('获取队伍数据失败:', response.status);
            hideLoading();
            showError('获取队伍数据失败');
            return false;
        }
    } catch (error) {
        console.error('获取队伍数据异常:', error);
        hideLoading();
        showError('获取队伍数据失败，请稍后重试');
        return false;
    }
}

// 添加表单实时验证
function initFormValidation() {
    const inputs = document.querySelectorAll('input[required], select[required], textarea[required]');
    
    inputs.forEach(input => {
        input.addEventListener('input', validateInput);
        input.addEventListener('blur', validateInput);
    });
}

function validateInput(event) {
    const input = event.target;
    const formGroup = input.closest('.form-group');
    const errorMessage = formGroup?.querySelector('.error-message');
    
    if (!formGroup || !errorMessage) {
        return;
    }
    
    if (input.validity.valid) {
        formGroup.classList.remove('error');
        errorMessage.style.display = 'none';
    } else {
        formGroup.classList.add('error');
        errorMessage.style.display = 'block';
    }
}

// 初始化自动保存功能
function initAutoSave() {
    autoSaveInterval = setInterval(() => {
        saveData();
    }, 30000); // 每30秒自动保存一次
    
    // 添加页面离开前的提示
    window.addEventListener('beforeunload', (event) => {
        // 这里可以检查是否有未保存的数据
        // 如果有，可以显示提示
        // event.preventDefault();
        // event.returnValue = '';
    });
}

// 获取当前登录用户
function getCurrentUser() {
    const user = localStorage.getItem(CONSTANTS.CURRENT_USER_STORAGE_KEY);
    return user ? JSON.parse(user) : null;
}

// 保存当前登录用户
function saveCurrentUser(user) {
    localStorage.setItem(CONSTANTS.CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
}

// 清除当前登录用户
function clearCurrentUser() {
    localStorage.removeItem(CONSTANTS.CURRENT_USER_STORAGE_KEY);
}

// 用户登录函数
async function loginUser(username, password) {
    try {
        // 确保用户名和密码不为空
        if (!username || !password) {
            return { success: false, message: '用户名和密码不能为空' };
        }
        
        // 对密码进行哈希处理
        const hashedPassword = hashPassword(password);
        
        console.log('登录请求:', { username, hashedPassword });
        console.log('API地址:', getApiUrl());
        
        const response = await fetch(`${getApiUrl()}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password: hashedPassword })
        });
        
        console.log('登录响应状态:', response.status);
        const result = await response.json();
        console.log('登录响应结果:', result);
        
        if (result.success) {
            // 登录成功，保存当前用户
            saveCurrentUser(result.user);
            // 从后端获取最新队伍数据（即使失败也不影响登录）
            fetchTeamsFromBackend().catch(error => {
                console.error('获取队伍数据失败:', error);
            });
        }
        
        return result;
    } catch (error) {
        console.error('登录失败:', error);
        return { success: false, message: '登录失败，请稍后重试' };
    }
}

// 用户注册函数
async function registerUser(username, password, teamNumber = null, inviteCode = null) {
    try {
        // 只发送非空参数
        const bodyData = {
            username,
            password
        };
        
        // 只有当teamNumber有值且不为空字符串时才添加到请求体
        if (teamNumber && teamNumber.trim()) {
            bodyData.teamNumber = teamNumber;
        }
        
        // 只有当inviteCode有值且不为空字符串时才添加到请求体
        if (inviteCode && inviteCode.trim()) {
            bodyData.inviteCode = inviteCode;
        }
        
        const response = await fetch(`${getApiUrl()}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 注册成功，保存当前用户
            saveCurrentUser(result.user);
            // 从后端获取最新队伍数据
            await fetchTeamsFromBackend();
        }
        
        return result;
    } catch (error) {
        console.error('注册失败:', error);
        return { success: false, message: '注册失败，请稍后重试' };
    }
}

// 用户注销函数
async function logoutUser() {
    try {
        const currentUser = getCurrentUser();
        await fetch(`${getApiUrl()}/api/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: currentUser?.username })
        });
    } catch (error) {
        console.error('后端注销失败:', error);
    } finally {
        clearCurrentUser();
    }
}

// 删除用户账号函数
async function deleteUser(password) {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            return { success: false, message: '请先登录' };
        }
        
        const response = await fetch(`${getApiUrl()}/api/delete-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: currentUser.username, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            clearCurrentUser();
        }
        
        return result;
    } catch (error) {
        console.error('删除账号失败:', error);
        return { success: false, message: '删除账号失败，请稍后重试' };
    }
}



// 更改密码函数
async function changePassword(currentPassword, newPassword) {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            return { success: false, message: '请先登录' };
        }
        
        const response = await fetch(`${getApiUrl()}/api/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                username: currentUser.username, 
                currentPassword, 
                newPassword 
            })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('更改密码失败:', error);
        return { success: false, message: '更改密码失败，请稍后重试' };
    }
}

// 创建模态框
function createModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
        background-color: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        width: 90%;
        max-width: 500px;
        position: relative;
        z-index: 1002;
    `;
    
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = title;
    modalTitle.style.marginBottom = '20px';
    
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = content;
    
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(contentDiv);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    return modal;
}

// 关闭模态框
function closeModal(modal) {
    document.body.removeChild(modal);
}



// 登录函数
async function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username) {
        document.getElementById('loginError').textContent = '请输入用户名';
        return;
    }
    
    if (!password) {
        document.getElementById('loginError').textContent = '请输入密码';
        return;
    }
    
    document.getElementById('loginError').textContent = '';
    
    const result = await loginUser(username, password);
    
    if (result.success) {
        const modal = document.querySelector('.modal');
        closeModal(modal);
        updateAuthUI();
    } else {
        const loginError = document.getElementById('loginError');
        loginError.textContent = result.message;
        loginError.style.display = 'block';
    }
}

// 注册函数
async function register() {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const teamNumber = document.getElementById('registerTeamNumber').value.trim();
    const inviteCode = document.getElementById('registerInviteCode').value.trim();
    
    if (!username) {
        document.getElementById('registerError').textContent = '请输入用户名';
        return;
    }
    
    if (!password) {
        document.getElementById('registerError').textContent = '请输入密码';
        return;
    } else if (password.length < 6) {
        document.getElementById('registerError').textContent = '密码长度不能少于6位';
        return;
    }
    
    // 只有在没有邀请码的情况下，才需要验证队伍编号
    if (!inviteCode || !inviteCode.trim()) {
        if (!teamNumber || !teamNumber.trim()) {
            document.getElementById('registerError').textContent = '请输入队伍编号，必须加入或创建队伍';
            return;
        }
    }
    
    // 只有当队号有值时，才需要验证是否为数字
    if (teamNumber && teamNumber.trim() && isNaN(teamNumber)) {
        document.getElementById('registerError').textContent = '队伍编号必须是数字';
        return;
    }
    
    document.getElementById('registerError').textContent = '';
    
    const result = await registerUser(username, password, teamNumber, inviteCode);
    
    if (result.success) {
        const modal = document.querySelector('.modal');
        closeModal(modal);
        updateAuthUI();
    } else {
        const registerError = document.getElementById('registerError');
        registerError.textContent = result.message;
        registerError.style.display = 'block';
    }
}

// 显示登录模态框
function showLoginModal() {
    const modal = createModal('用户登录', `
        <div class="form-group">
            <label for="loginUsername">用户名</label>
            <input type="text" id="loginUsername" placeholder="请输入用户名">
        </div>
        <div class="form-group">
            <label for="loginPassword">密码</label>
            <input type="password" id="loginPassword" placeholder="请输入密码">
        </div>
        <div class="error-message" id="loginError"></div>
    `);
    
    const loginBtn = document.createElement('button');
    loginBtn.textContent = '登录';
    loginBtn.className = 'btn-primary';
    loginBtn.onclick = login;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.onclick = () => closeModal(modal);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'button-group';
    buttonsContainer.appendChild(loginBtn);
    buttonsContainer.appendChild(cancelBtn);
    
    modal.querySelector('.modal-content').appendChild(buttonsContainer);
    
    // 添加输入事件监听器，当用户开始输入时隐藏错误提示
    document.getElementById('loginUsername').addEventListener('input', () => {
        const loginError = document.getElementById('loginError');
        loginError.textContent = '';
        loginError.style.display = 'none';
    });
    
    document.getElementById('loginPassword').addEventListener('input', () => {
        const loginError = document.getElementById('loginError');
        loginError.textContent = '';
        loginError.style.display = 'none';
    });
}

// 显示注册模态框
function showRegisterModal() {
    const modal = createModal('用户注册', `
        <div class="form-group">
            <label for="registerUsername">用户名</label>
            <input type="text" id="registerUsername" placeholder="请输入用户名">
        </div>
        <div class="form-group">
            <label for="registerPassword">密码</label>
            <input type="password" id="registerPassword" placeholder="请输入密码">
        </div>
        <div class="form-group">
            <label for="registerTeamNumber">队伍编号 (可选，输入邀请码时可不填)</label>
            <input type="text" id="registerTeamNumber" placeholder="请输入队伍编号">
        </div>
        <div class="form-group">
            <label for="registerInviteCode">邀请码 (可选)</label>
            <input type="text" id="registerInviteCode" placeholder="创建或加入队伍需要邀请码">
        </div>
        <div class="error-message" id="registerError"></div>
    `);
    
    const registerBtn = document.createElement('button');
    registerBtn.textContent = '注册';
    registerBtn.className = 'btn-primary';
    registerBtn.onclick = register;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.onclick = () => closeModal(modal);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'button-group';
    buttonsContainer.appendChild(registerBtn);
    buttonsContainer.appendChild(cancelBtn);
    
    modal.querySelector('.modal-content').appendChild(buttonsContainer);
    
    // 添加输入事件监听器，当用户开始输入时隐藏错误提示
    document.getElementById('registerUsername').addEventListener('input', () => {
        const registerError = document.getElementById('registerError');
        registerError.textContent = '';
        registerError.style.display = 'none';
    });
    
    document.getElementById('registerPassword').addEventListener('input', () => {
        const registerError = document.getElementById('registerError');
        registerError.textContent = '';
        registerError.style.display = 'none';
    });
    
    document.getElementById('registerTeamNumber').addEventListener('input', () => {
        const registerError = document.getElementById('registerError');
        registerError.textContent = '';
        registerError.style.display = 'none';
    });
    
    document.getElementById('registerInviteCode').addEventListener('input', () => {
        const registerError = document.getElementById('registerError');
        registerError.textContent = '';
        registerError.style.display = 'none';
    });
}

// 复制文本到剪贴板
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            // 临时更改按钮文本以反馈复制成功
            const copyBtn = event.target;
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '已复制';
            copyBtn.style.backgroundColor = '#27ae60';
            
            // 2秒后恢复原始状态
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.backgroundColor = '#3498db';
            }, 2000);
        })
        .catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制');
        });
}

// 刷新邀请码
async function refreshInviteCode(teamNumber, username) {
    try {
        const response = await fetch(`${getApiUrl()}/api/refresh-invite-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ teamNumber, username })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 刷新成功，更新页面显示
            alert('邀请码刷新成功');
            // 关闭当前的模态框
            const currentModal = document.querySelector('.modal');
            if (currentModal) {
                closeModal(currentModal);
            }
            // 重新加载队伍信息
            await showMyTeam();
        } else {
            alert(result.message || '邀请码刷新失败');
        }
    } catch (error) {
        console.error('刷新邀请码失败:', error);
        alert('邀请码刷新失败，请稍后重试');
    }
}

// 显示我的队伍信息
async function showMyTeam() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('请先登录以查看队伍信息');
        return;
    }
    
    // 从后端获取最新队伍数据
    await fetchTeamsFromBackend();
    
    const teams = JSON.parse(localStorage.getItem(CONSTANTS.TEAMS_STORAGE_KEY) || '{}');
    // 转换为数组以便使用find方法
    const teamsArray = Object.values(teams);
    const userTeam = teamsArray.find(team => team.members && team.members.includes(currentUser.username));
    
    let content;
    if (userTeam) {
        // 创建团队成员列表
        const membersList = userTeam.members.map(member => 
            `<span class="team-member">
                ${member}${member === userTeam.captain ? ' <span class="status-badge captain">队长</span>' : ' <span class="status-badge member">队员</span>'}
            </span>`
        ).join('');
        
        content = `
            <div class="profile-panel">
                <div class="form-group">
                    <label>队伍编号</label>
                    <div>${userTeam.teamNumber}</div>
                </div>
                <div class="form-group">
                    <label>队伍队长</label>
                    <div>${userTeam.captain}</div>
                </div>
                <div class="form-group">
                    <label>邀请码</label>
                    <div class="invite-code-container">
                        <span class="invite-code">${userTeam.inviteCode || '无'}</span>
                        ${userTeam.inviteCode ? `<button class="copy-btn" onclick="copyToClipboard('${userTeam.inviteCode}')">复制</button>` : ''}
                        ${userTeam.inviteCode && userTeam.captain === currentUser.username ? `<button class="copy-btn" onclick="refreshInviteCode('${userTeam.teamNumber}', '${currentUser.username}')" style="margin-left: 5px;">刷新</button>` : ''}
                    </div>
                </div>
                <div class="form-group">
                    <label>队伍成员</label>
                    <div class="team-members">
                        ${membersList}
                    </div>
                </div>
            </div>
        `;
    } else {
        content = `
            <div class="profile-panel">
                <div class="form-group">
                    <p>您尚未加入任何队伍</p>
                </div>
            </div>
        `;
    }
    
    const modal = createModal('我的队伍', content);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.className = 'btn-primary';
    closeBtn.onclick = () => closeModal(modal);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'button-group';
    buttonsContainer.appendChild(closeBtn);
    
    modal.querySelector('.modal-content').appendChild(buttonsContainer);
}

// 显示我的个人信息
function showMyProfile() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            alert('请先登录以查看个人信息');
            return;
        }
        
        // 确保 currentUser 对象包含所需的属性
        const safeUser = {
            username: currentUser.username || '未知',
            team: currentUser.team || '无',
            isCaptain: currentUser.isCaptain || false,
            createdAt: currentUser.createdAt || Date.now()
        };
        
        // 尝试获取并显示团队详细信息
        let role = '队员';
        let teamNumber = '未知';
        let inviteCode = '无';
        
        try {
            const teams = JSON.parse(localStorage.getItem(CONSTANTS.TEAMS_STORAGE_KEY) || '{}');
            // 转换为数组以便使用find方法
            const teamsArray = Object.values(teams);
            const userTeam = teamsArray.find(team => team.members && team.members.includes(currentUser.username));
            
            if (userTeam) {
                // 根据团队数据判断角色
                if (userTeam.captain === currentUser.username) {
                    role = '队长';
                }
                
                teamNumber = userTeam.teamNumber || '未知';
                inviteCode = userTeam.inviteCode || '无';
            }
        } catch (teamError) {
            console.error('获取团队信息失败:', teamError);
            // 不影响主要功能，继续执行
        }
        
        let content = `
            <div class="profile-panel">
                <div class="form-group">
                    <label>用户名</label>
                    <div>${safeUser.username}</div>
                </div>
                <div class="form-group">
                    <label>所属团队</label>
                    <div>${safeUser.team} ${safeUser.team !== '无' ? `<span class="status-badge ${role === '队长' ? 'captain' : 'member'}">${role}</span>` : ''}</div>
                </div>
                <div class="form-group">
                    <label>创建时间</label>
                    <div>${new Date(safeUser.createdAt).toLocaleString()}</div>
                </div>`;
        
        // 只有加入了团队的用户才显示团队编号和邀请码
        if (teamNumber !== '未知') {
            content += `
                <div class="form-group">
                    <label>队伍编号</label>
                    <div>${teamNumber}</div>
                </div>
            `;
        }
        
        content += `</div>`;
        
        const modal = createModal('我的', content);
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.className = 'btn-primary';
        closeBtn.onclick = () => closeModal(modal);
        
        // 添加删除账号按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '删除账号';
        deleteBtn.className = 'btn-secondary';
        deleteBtn.style.backgroundColor = '#e74c3c';
        deleteBtn.onclick = () => {
            showDeleteAccountModal(modal);
        };
        
        // 添加更改密码按钮
        const changePasswordBtn = document.createElement('button');
        changePasswordBtn.textContent = '更改密码';
        changePasswordBtn.className = 'btn-secondary';
        changePasswordBtn.onclick = () => {
            showChangePasswordModal(modal);
        };
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'button-group';
        buttonsContainer.appendChild(closeBtn);
        buttonsContainer.appendChild(changePasswordBtn);
        buttonsContainer.appendChild(deleteBtn);
        
        modal.querySelector('.modal-content').appendChild(buttonsContainer);
    } catch (error) {
        console.error('显示个人信息失败:', error);
        alert('显示个人信息失败，请稍后重试');
    }
}

// 显示删除账号模态框
function showDeleteAccountModal(profileModal) {
    // 如果传入了个人资料模态框，则关闭它
    if (profileModal) {
        closeModal(profileModal);
    }
    
    const modal = createModal('删除账号', `
        <div class="form-group">
            <p>警告：删除账号将永久删除您的所有数据，此操作不可恢复！</p>
        </div>
        <div class="form-group">
            <label for="deletePassword">请输入密码确认</label>
            <input type="password" id="deletePassword" placeholder="请输入密码">
        </div>
        <div class="error-message" id="deleteError"></div>
    `);
    
    // 添加确认删除按钮
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确认删除';
    confirmBtn.className = 'btn-primary';
    confirmBtn.style.backgroundColor = '#dc3545';
    confirmBtn.onclick = async () => {
        const password = document.getElementById('deletePassword').value;
        const errorElement = document.getElementById('deleteError');
        
        // 清除之前的错误信息
        errorElement.textContent = '';
        errorElement.style.display = 'none';
        
        if (!password) {
            errorElement.textContent = '请输入密码';
            errorElement.style.display = 'block';
            return;
        }
        
        // 调用删除账号函数
        const result = await deleteUser(password);
        
        if (result.success) {
            // 删除成功，关闭模态框
            closeModal(modal);
            // 显示成功消息
            showSuccess('账号已成功删除');
            // 更新认证UI
            updateAuthUI();
        } else {
            // 删除失败，显示错误信息
            errorElement.textContent = result.message || '删除账号失败';
            errorElement.style.display = 'block';
        }
    };
    
    // 添加取消按钮
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.onclick = () => closeModal(modal);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'button-group';
    buttonsContainer.appendChild(cancelBtn);
    buttonsContainer.appendChild(confirmBtn);
    
    modal.querySelector('.modal-content').appendChild(buttonsContainer);
}

// 显示更改密码模态框
function showChangePasswordModal(profileModal) {
    // 如果传入了个人资料模态框，则关闭它
    if (profileModal) {
        closeModal(profileModal);
    }
    
    const modal = createModal('更改密码', `
        <div class="form-group">
            <label for="currentPassword">当前密码</label>
            <input type="password" id="currentPassword" placeholder="请输入当前密码">
        </div>
        <div class="form-group">
            <label for="newPassword">新密码</label>
            <input type="password" id="newPassword" placeholder="请输入新密码（至少6位）">
        </div>
        <div class="form-group">
            <label for="confirmNewPassword">确认新密码</label>
            <input type="password" id="confirmNewPassword" placeholder="请再次输入新密码">
        </div>
        <div class="error-message" id="changePasswordError"></div>
    `);
    
    const changePasswordBtn = document.createElement('button');
    changePasswordBtn.textContent = '确认更改';
    changePasswordBtn.className = 'btn-primary';
    changePasswordBtn.onclick = async () => {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        const errorElement = document.getElementById('changePasswordError');
        
        // 清除之前的错误信息
        errorElement.textContent = '';
        errorElement.style.display = 'none';
        
        // 前端验证
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            errorElement.textContent = '请填写所有密码字段';
            errorElement.style.display = 'block';
            return;
        }
        
        if (newPassword.length < 6) {
            errorElement.textContent = '新密码长度不能少于6位';
            errorElement.style.display = 'block';
            return;
        }
        
        if (newPassword !== confirmNewPassword) {
            errorElement.textContent = '两次输入的新密码不一致';
            errorElement.style.display = 'block';
            return;
        }
        
        // 调用更改密码函数
        const result = await changePassword(currentPassword, newPassword);
        if (result.success) {
            alert('密码更改成功！');
            closeModal(modal);
        } else {
            errorElement.textContent = result.message;
            errorElement.style.display = 'block';
        }
    };
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.onclick = () => closeModal(modal);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'button-group';
    buttonsContainer.appendChild(changePasswordBtn);
    buttonsContainer.appendChild(cancelBtn);
    
    modal.querySelector('.modal-content').appendChild(buttonsContainer);
}

// 更新认证UI
function updateAuthUI() {
    const currentUser = getCurrentUser();
    const authStatus = document.getElementById('authStatus');
    
    if (currentUser) {
        authStatus.innerHTML = `
            <span style="margin-right: 10px;">欢迎，${currentUser.username}</span>
            <button class="btn-secondary" onclick="logout()">登出</button>
        `;
    } else {
        authStatus.innerHTML = `
            <button id="loginBtn" class="btn-secondary" onclick="showLoginModal()">登录</button>
            <button id="registerBtn" class="btn-primary" onclick="showRegisterModal()">注册</button>
        `;
    }
}

// 登出函数
async function logout() {
    await logoutUser();
    alert('已成功登出！');
    updateAuthUI();
}

// 保存数据
function saveData() {
    const data = {
        teamNumber: document.getElementById('teamNumber').value,
        matchName: document.getElementById('matchName').value,
        matchType: document.getElementById('matchType').value,
        matchNumber: document.getElementById('matchNumber').value,
        gameData: gameData,
        selectedMotif: selectedMotif
    };
    localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(data));
}

// 加载数据
function loadData() {
    const savedData = localStorage.getItem(CONSTANTS.STORAGE_KEY);
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            
            // 恢复基本信息
            document.getElementById('teamNumber').value = data.teamNumber || '';
            document.getElementById('matchName').value = data.matchName || '';
            document.getElementById('matchType').value = data.matchType || 'Q';
            document.getElementById('matchNumber').value = data.matchNumber || '1';
            
            // 恢复游戏数据
            if (data.gameData) {
                gameData = data.gameData;
            }
            
            // 恢复motif
            if (data.selectedMotif) {
                selectedMotif = data.selectedMotif;
                document.getElementById('motif').value = selectedMotif;
            }
            
            // 重新初始化UI
            initSlots('auto');
            initSlots('teleOp');
            
            // 恢复UI状态
            document.getElementById('robotLeave').checked = gameData.auto.robotLeave;
            document.getElementById('autoOverflow').value = gameData.auto.overflowArtifacts;
            document.getElementById('autoClassified').value = gameData.auto.classifiedArtifacts;
            document.getElementById('teleOpDepot').value = gameData.teleOp.depotArtifacts;
            document.getElementById('teleOpOverflow').value = gameData.teleOp.overflowArtifacts;
            document.getElementById('teleOpClassified').value = gameData.teleOp.classifiedArtifacts;
            document.getElementById('baseReturn').value = gameData.teleOp.baseReturnState;
            document.getElementById('diedOnField').checked = gameData.general.diedOnField;
            document.getElementById('notes').value = gameData.general.notes;
            document.getElementById('driverRating').value = gameData.general.driverPerformance;
            document.getElementById('defenseRating').value = gameData.general.defenseRating;
            
            // 恢复评分按钮状态
            setRating('driverRating', gameData.general.driverPerformance);
            setRating('defenseRating', gameData.general.defenseRating);
            
            debouncedUpdateLiveScore();
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }
}

// 哈希密码
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }
    return (hash >>> 0).toString(16); // 转换为十六进制字符串，与后端保持一致
}

// 全局错误处理
window.addEventListener('error', function(event) {
    console.error('全局错误:', event.error);
    console.error('错误发生在:', event.filename, '第', event.lineno, '行，第', event.colno, '列');
    // 即使发生全局错误，也要确保页面可见
    console.error('全局错误后，强制设置页面内容为可见');
    document.body.style.display = 'block';
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('DOMContentLoaded事件已触发');
        console.log('开始初始化页面...');
        
        // 确保页面始终可见
        console.log('强制设置页面内容为可见');
        document.body.style.display = 'block';
        
        // 直接初始化页面，不需要密码验证
        console.log('开始初始化...');
        
        console.log('开始加载数据...');
        loadData();
        console.log('数据加载完成');
        
        console.log('初始化auto槽位...');
        initSlots('auto');
        console.log('auto槽位初始化完成');
        
        console.log('初始化teleOp槽位...');
        initSlots('teleOp');
        console.log('teleOp槽位初始化完成');
        
        console.log('更新实时分数...');
        updateLiveScore();
        console.log('实时分数更新完成');
        
        console.log('更新认证UI...');
        updateAuthUI();
        console.log('认证UI更新完成');
        
        console.log('初始化表单验证...');
        initFormValidation();
        console.log('表单验证初始化完成');
        
        console.log('初始化自动保存功能...');
        initAutoSave();
        console.log('自动保存功能初始化完成');
        
        console.log('页面初始化完成');
        
        // 添加基本信息事件监听器
        document.getElementById('teamNumber').addEventListener('input', saveData);
        document.getElementById('matchName').addEventListener('input', saveData);
        document.getElementById('matchType').addEventListener('change', saveData);
        document.getElementById('matchNumber').addEventListener('input', saveData);
        
        // 为所有按钮添加点击效果
        document.querySelectorAll('button').forEach(button => {
            // 使用mousedown事件来避免与click事件冲突
            button.addEventListener('mousedown', function() {
                // 添加点击效果类
                this.classList.add('clicked');
                
                // 移除点击效果类以准备下一次点击
                setTimeout(() => {
                    this.classList.remove('clicked');
                }, 300);
            });
        });
        
        // 添加事件监听器
        document.getElementById('motif').addEventListener('change', function() {
            selectedMotif = this.value;
            debouncedCheckPatternMatch();
            debouncedUpdateLiveScore();
            saveData();
        });
        
        document.getElementById('robotLeave').addEventListener('change', function() {
            gameData.auto.robotLeave = this.checked;
            debouncedUpdateLiveScore();
            saveData();
        });
        
        document.getElementById('baseReturn').addEventListener('change', function() {
            gameData.teleOp.baseReturnState = this.value;
            debouncedUpdateLiveScore();
            saveData();
        });
        
        document.getElementById('diedOnField').addEventListener('change', function() {
            gameData.general.diedOnField = this.checked;
            saveData();
        });
        
        document.getElementById('notes').addEventListener('input', function() {
            gameData.general.notes = this.value;
            saveData();
        });
        
        // 自动更新计数器输入框
        ['autoOverflow', 'autoClassified', 'teleOpDepot', 'teleOpOverflow', 'teleOpClassified'].forEach(id => {
            document.getElementById(id).addEventListener('input', function() {
                let value = parseInt(this.value) || 0;
                if (value < 0) value = 0;
                this.value = value;
                
                // 更新gameData
                if (id === 'autoOverflow') {
                    gameData.auto.overflowArtifacts = value;
                } else if (id === 'autoClassified') {
                    gameData.auto.classifiedArtifacts = value;
                } else if (id === 'teleOpDepot') {
                    gameData.teleOp.depotArtifacts = value;
                } else if (id === 'teleOpOverflow') {
                    gameData.teleOp.overflowArtifacts = value;
                } else if (id === 'teleOpClassified') {
                    gameData.teleOp.classifiedArtifacts = value;
                }
                
                debouncedUpdateLiveScore();
                saveData();
            });
        });
        
        // 为评分按钮添加事件监听器
        ['driverRating', 'defenseRating'].forEach(ratingType => {
            const ratingContainer = document.getElementById(`${ratingType}Container`);
            if (ratingContainer) {
                ratingContainer.addEventListener('click', function(e) {
                    if (e.target.classList.contains('rating-btn')) {
                        const rating = parseInt(e.target.textContent);
                        setRating(ratingType, rating);
                        gameData.general[`${ratingType.charAt(0).toLowerCase() + ratingType.slice(1)}`] = rating;
                        saveData();
                    }
                });
            }
        });
        
        // 自动更新分数
        updateLiveScore();
        
        // 自动检查模式匹配
        checkPatternMatch();
        
        // 定期检查服务器状态
        startServerStatusCheck();
    
    } catch (error) {
        console.error('页面初始化错误:', error);
        console.error('错误堆栈:', error.stack);
        // 即使发生错误，也要确保页面可见
        console.error('初始化错误后，强制设置页面内容为可见');
        document.body.style.display = 'block';
    }
    
    // 添加文件导入事件监听器
    document.getElementById('importFile').addEventListener('change', function(e) {
        if (e.target.files && e.target.files.length > 0) {
            importData(e.target.files[0]);
            // 重置文件输入，允许重新选择同一文件
            e.target.value = '';
        }
    });
});

// 初始化槽位
function initSlots(phase) {
    const container = document.getElementById(`${phase}Slots`);
    if (container) {
        container.innerHTML = '';
        
        if (gameData[phase] && gameData[phase].slots) {
            gameData[phase].slots.forEach((slot, index) => {
                const slotElement = document.createElement('div');
                slotElement.className = `slot ${slot.selectedColor.toLowerCase()}`;
                slotElement.textContent = slot.id;
                slotElement.onclick = () => toggleSlotColor(phase, index);
                container.appendChild(slotElement);
            });
        }
        
        try {
            checkPatternMatch();
        } catch (error) {
            console.error('检查图案匹配错误:', error);
        }
        
        try {
            updateLiveScore();
        } catch (error) {
            console.error('更新实时分数错误:', error);
        }
    }
}

// 切换槽位颜色
function toggleSlotColor(phase, slotIndex) {
    const slot = gameData[phase].slots[slotIndex];
    const colors = [CONSTANTS.COLORS.NONE, CONSTANTS.COLORS.GREEN, CONSTANTS.COLORS.PURPLE];
    
    let currentIndex = colors.indexOf(slot.selectedColor);
    currentIndex = (currentIndex + 1) % colors.length;
    slot.selectedColor = colors[currentIndex];
    
    // 检查是否匹配当前图案
    debouncedCheckPatternMatch();
    debouncedUpdateLiveScore();
    saveData();
    
    // 更新UI
    const container = document.getElementById(`${phase}Slots`);
    if (container) {
        const slotElement = container.children[slotIndex];
        if (slotElement) {
            slotElement.className = `slot ${slot.selectedColor.toLowerCase()}`;
        }
    }
}

// 设置评分
function setRating(ratingType, rating) {
    const ratingContainer = document.getElementById(`${ratingType}Container`);
    if (ratingContainer) {
        const ratingButtons = ratingContainer.querySelectorAll('.rating-btn');
        
        ratingButtons.forEach((button, index) => {
            if (index < rating) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
}

// 检查图案匹配
function checkPatternMatch() {
    // 获取当前选择的图案
    const selectedPattern = selectedMotif;
    
    // 检查auto阶段的图案
    const autoSlots = gameData.auto.slots.map(slot => 
        slot.selectedColor === CONSTANTS.COLORS.GREEN ? 'G' : 
        slot.selectedColor === CONSTANTS.COLORS.PURPLE ? 'P' : 'N'
    );
    
    // 检查teleOp阶段的图案
    const teleOpSlots = gameData.teleOp.slots.map(slot => 
        slot.selectedColor === CONSTANTS.COLORS.GREEN ? 'G' : 
        slot.selectedColor === CONSTANTS.COLORS.PURPLE ? 'P' : 'N'
    );
    
    // 计算auto阶段匹配的artifact数量（从右端开始，每3个为一组）
    let autoMatchCount = 0;
    const totalSlots = autoSlots.length;
    for (let groupIndex = 0; groupIndex < 3; groupIndex++) {
        for (let positionInGroup = 0; positionInGroup < 3; positionInGroup++) {
            // 计算当前槽位的索引：从右端开始，每3个为一组
            const slotIndex = totalSlots - 1 - (groupIndex * 3 + positionInGroup);
            if (slotIndex >= 0) {
                const slotColor = autoSlots[slotIndex];
                const expectedColor = selectedPattern[positionInGroup];
                if (slotColor === expectedColor) {
                    autoMatchCount++;
                }
            }
        }
    }
    
    // 计算teleOp阶段匹配的artifact数量（从右端开始，每3个为一组）
    let teleOpMatchCount = 0;
    for (let groupIndex = 0; groupIndex < 3; groupIndex++) {
        for (let positionInGroup = 0; positionInGroup < 3; positionInGroup++) {
            // 计算当前槽位的索引：从右端开始，每3个为一组
            const slotIndex = totalSlots - 1 - (groupIndex * 3 + positionInGroup);
            if (slotIndex >= 0) {
                const slotColor = teleOpSlots[slotIndex];
                const expectedColor = selectedPattern[positionInGroup];
                if (slotColor === expectedColor) {
                    teleOpMatchCount++;
                }
            }
        }
    }
    
    // 更新槽位的正确标记
    gameData.auto.slots.forEach((slot, index) => {
        // 计算当前槽位属于哪个组和位置
        const groupIndex = Math.floor((totalSlots - 1 - index) / 3);
        const positionInGroup = (totalSlots - 1 - index) % 3;
        const expectedColor = selectedPattern[positionInGroup];
        const slotColor = slot.selectedColor === CONSTANTS.COLORS.GREEN ? 'G' : 
                         slot.selectedColor === CONSTANTS.COLORS.PURPLE ? 'P' : 'N';
        slot.isCorrect = slotColor === expectedColor;
    });
    
    gameData.teleOp.slots.forEach((slot, index) => {
        // 计算当前槽位属于哪个组和位置
        const groupIndex = Math.floor((totalSlots - 1 - index) / 3);
        const positionInGroup = (totalSlots - 1 - index) % 3;
        const expectedColor = selectedPattern[positionInGroup];
        const slotColor = slot.selectedColor === CONSTANTS.COLORS.GREEN ? 'G' : 
                         slot.selectedColor === CONSTANTS.COLORS.PURPLE ? 'P' : 'N';
        slot.isCorrect = slotColor === expectedColor;
    });
    
    // 更新UI
    updateSlotsUI('auto');
    updateSlotsUI('teleOp');
    
    // 更新排序得分显示
    const autoSortingScore = autoMatchCount * CONSTANTS.PATTERN_MATCH;
    const teleOpSortingScore = teleOpMatchCount * CONSTANTS.PATTERN_MATCH;
    
    // 更新自动排序分数并添加动画
    const autoSortingScoreElement = document.getElementById('autoSortingScore');
    if (autoSortingScoreElement) {
        autoSortingScoreElement.textContent = autoSortingScore;
        autoSortingScoreElement.classList.add('updating');
        setTimeout(() => autoSortingScoreElement.classList.remove('updating'), 600);
    }
    
    // 更新手动排序分数并添加动画
    const teleOpSortingScoreElement = document.getElementById('teleOpSortingScore');
    if (teleOpSortingScoreElement) {
        teleOpSortingScoreElement.textContent = teleOpSortingScore;
        teleOpSortingScoreElement.classList.add('updating');
        setTimeout(() => teleOpSortingScoreElement.classList.remove('updating'), 600);
    }
    
    // 返回匹配结果
    return { autoMatchCount, teleOpMatchCount };
}

// 更新槽位UI
function updateSlotsUI(phase) {
    const container = document.getElementById(`${phase}Slots`);
    if (container) {
        gameData[phase].slots.forEach((slot, index) => {
            const slotElement = container.children[index];
            if (slotElement) {
                if (slot.isCorrect) {
                    slotElement.classList.add('correct');
                } else {
                    slotElement.classList.remove('correct');
                }
            }
        });
    }
}

// 计算总分
function calculateScore() {
    let autoScore = 0;
    let teleOpScore = 0;
    
    // Auto阶段分数
    if (gameData.auto.robotLeave) {
        autoScore += CONSTANTS.AUTO_ROBOT_LEAVE;
    }
    
    autoScore += gameData.auto.classifiedArtifacts * CONSTANTS.CLASSIFIED_ARTIFACT;
    autoScore += gameData.auto.overflowArtifacts * CONSTANTS.OVERFLOW_ARTIFACT;
    
    // 检查图案匹配
    const patternMatch = checkPatternMatch();
    // 每匹配一组 +2 分
    autoScore += patternMatch.autoMatchCount * CONSTANTS.PATTERN_MATCH;
    
    // TeleOp阶段分数
    teleOpScore += gameData.teleOp.depotArtifacts * CONSTANTS.DEPOT_ARTIFACT;
    teleOpScore += gameData.teleOp.overflowArtifacts * CONSTANTS.OVERFLOW_ARTIFACT;
    teleOpScore += gameData.teleOp.classifiedArtifacts * CONSTANTS.CLASSIFIED_ARTIFACT;
    
    // 每匹配一组 +2 分
    teleOpScore += patternMatch.teleOpMatchCount * CONSTANTS.PATTERN_MATCH;
    
    // Base返回分数
    if (gameData.teleOp.baseReturnState === 'Partial') {
        teleOpScore += CONSTANTS.BASE_RETURN_PARTIAL;
    } else if (gameData.teleOp.baseReturnState === 'Full') {
        teleOpScore += CONSTANTS.BASE_RETURN_FULL;
    }
    
    const totalScore = autoScore + teleOpScore;
    
    return {
        autoScore,
        teleOpScore,
        totalScore
    };
}

// 更新实时分数
function updateLiveScore() {
    const score = calculateScore();
    
    // 更新自动得分并添加动画
    const autoScoreElement = document.getElementById('autoScore');
    autoScoreElement.textContent = score.autoScore;
    autoScoreElement.classList.add('updating');
    setTimeout(() => autoScoreElement.classList.remove('updating'), 600);
    
    // 更新手动得分并添加动画
    const teleOpScoreElement = document.getElementById('teleOpScore');
    teleOpScoreElement.textContent = score.teleOpScore;
    teleOpScoreElement.classList.add('updating');
    setTimeout(() => teleOpScoreElement.classList.remove('updating'), 600);
    
    // 更新总分并添加动画
    const totalScoreElement = document.getElementById('totalScore');
    totalScoreElement.textContent = score.totalScore;
    totalScoreElement.classList.add('updating');
    setTimeout(() => totalScoreElement.classList.remove('updating'), 600);
}

// 防抖函数
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// 创建防抖版本的检查图案匹配函数
const debouncedCheckPatternMatch = debounce(checkPatternMatch, CONSTANTS.DEBOUNCE_TIME);

// 创建防抖版本的更新实时分数函数
const debouncedUpdateLiveScore = debounce(updateLiveScore, CONSTANTS.DEBOUNCE_TIME);

// 更新计数器（处理+和-按钮）
function updateCounter(fieldId, delta) {
    const inputElement = document.getElementById(fieldId);
    if (!inputElement) return;
    
    let currentValue = parseInt(inputElement.value) || 0;
    let newValue = currentValue + delta;
    if (newValue < 0) newValue = 0;
    
    inputElement.value = newValue;
    
    // 更新gameData
    if (fieldId === 'autoOverflow') {
        gameData.auto.overflowArtifacts = newValue;
    } else if (fieldId === 'autoClassified') {
        gameData.auto.classifiedArtifacts = newValue;
    } else if (fieldId === 'teleOpDepot') {
        gameData.teleOp.depotArtifacts = newValue;
    } else if (fieldId === 'teleOpOverflow') {
        gameData.teleOp.overflowArtifacts = newValue;
    } else if (fieldId === 'teleOpClassified') {
        gameData.teleOp.classifiedArtifacts = newValue;
    }
    
    debouncedUpdateLiveScore();
    saveData();
}

// 提交数据
async function submitData() {
    // 防止重复提交
    if (isSubmitting) {
        return;
    }
    
    const teamNumber = document.getElementById('teamNumber').value;
    const matchName = document.getElementById('matchName').value;
    const matchType = document.getElementById('matchType').value;
    const matchNumber = document.getElementById('matchNumber').value;
    
    if (!teamNumber) {
        showError('请输入队伍编号');
        return;
    }
    
    if (!matchName) {
        showError('请输入比赛名称');
        return;
    }
    
    if (!matchNumber) {
        showError('请输入比赛编号');
        return;
    }
    
    const currentUser = getCurrentUser();
    const data = {
        userId: currentUser?.username || 'anonymous',
        teamId: currentUser?.team || 'none',
        teamNumber,
        matchName,
        matchType,
        matchNumber,
        gameData,
        selectedMotif,
        score: calculateScore().totalScore,
        timestamp: new Date().toISOString()
    };
    
    try {
        isSubmitting = true;
        showLoading('数据提交中...');
        
        const response = await fetch(`${getApiUrl()}/api/scouting-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        hideLoading();
        
        if (result.success) {
            showSuccess('数据提交成功！');
            resetData();
        } else {
            showError('数据提交失败：' + result.message);
        }
    } catch (error) {
        console.error('数据提交失败:', error);
        hideLoading();
        showError('数据提交失败，请检查网络连接或稍后重试');
    } finally {
        isSubmitting = false;
    }
}

// 重置数据
function resetData() {
    // 重置基本信息
    document.getElementById('teamNumber').value = '';
    document.getElementById('matchName').value = '';
    document.getElementById('matchType').value = 'Q';
    document.getElementById('matchNumber').value = '1';
    
    // 重置游戏数据
    gameData = {
        auto: {
            overflowArtifacts: 0,
            classifiedArtifacts: 0,
            robotLeave: false,
            slots: Array(9).fill(null).map((_, index) => ({
                id: index + 1,
                selectedColor: "None",
                isCorrect: false
            }))
        },
        teleOp: {
            depotArtifacts: 0,
            overflowArtifacts: 0,
            classifiedArtifacts: 0,
            baseReturnState: "None",
            slots: Array(9).fill(null).map((_, index) => ({
                id: index + 1,
                selectedColor: "None",
                isCorrect: false
            }))
        },
        general: {
            driverPerformance: CONSTANTS.DEFAULT_DRIVER_RATING,
            defenseRating: CONSTANTS.DEFAULT_DEFENSE_RATING,
            diedOnField: false,
            notes: ""
        }
    };
    
    // 重置motif
    selectedMotif = CONSTANTS.DEFAULT_MOTIF;
    document.getElementById('motif').value = selectedMotif;
    
    // 重置UI
    initSlots('auto');
    initSlots('teleOp');
    
    // 重置其他UI元素
    document.getElementById('robotLeave').checked = false;
    document.getElementById('autoOverflow').value = 0;
    document.getElementById('autoClassified').value = 0;
    document.getElementById('teleOpDepot').value = 0;
    document.getElementById('teleOpOverflow').value = 0;
    document.getElementById('teleOpClassified').value = 0;
    document.getElementById('baseReturn').value = 'None';
    document.getElementById('diedOnField').checked = false;
    document.getElementById('notes').value = '';
    
    // 重置评分
    setRating('driverRating', CONSTANTS.DEFAULT_DRIVER_RATING);
    setRating('defenseRating', CONSTANTS.DEFAULT_DEFENSE_RATING);
    
    // 更新实时分数
    updateLiveScore();
    
    // 清除本地存储的数据
    localStorage.removeItem(CONSTANTS.STORAGE_KEY);
}

// 导出数据
function exportData() {
    const teamNumber = document.getElementById('teamNumber').value;
    const matchName = document.getElementById('matchName').value;
    const matchNumber = document.getElementById('matchNumber').value;
    
    const data = {
        teamNumber,
        matchName,
        matchType: document.getElementById('matchType').value,
        matchNumber,
        gameData,
        selectedMotif,
        score: calculateScore().totalScore,
        timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `ftc-scout-${teamNumber}-${matchName}-${matchNumber}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// 导入数据
function importData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // 恢复基本信息
            document.getElementById('teamNumber').value = data.teamNumber || '';
            document.getElementById('matchName').value = data.matchName || '';
            document.getElementById('matchType').value = data.matchType || 'Q';
            document.getElementById('matchNumber').value = data.matchNumber || '1';
            
            // 恢复游戏数据
            if (data.gameData) {
                gameData = data.gameData;
            }
            
            // 恢复motif
            if (data.selectedMotif) {
                selectedMotif = data.selectedMotif;
                document.getElementById('motif').value = selectedMotif;
            }
            
            // 重新初始化UI
            initSlots('auto');
            initSlots('teleOp');
            
            // 恢复UI状态
            document.getElementById('robotLeave').checked = gameData.auto.robotLeave;
            document.getElementById('autoOverflow').value = gameData.auto.overflowArtifacts;
            document.getElementById('autoClassified').value = gameData.auto.classifiedArtifacts;
            document.getElementById('teleOpDepot').value = gameData.teleOp.depotArtifacts;
            document.getElementById('teleOpOverflow').value = gameData.teleOp.overflowArtifacts;
            document.getElementById('teleOpClassified').value = gameData.teleOp.classifiedArtifacts;
            document.getElementById('baseReturn').value = gameData.teleOp.baseReturnState;
            document.getElementById('diedOnField').checked = gameData.general.diedOnField;
            document.getElementById('notes').value = gameData.general.notes;
            
            // 恢复评分
            setRating('driverRating', gameData.general.driverPerformance);
            setRating('defenseRating', gameData.general.defenseRating);
            
            // 更新实时分数
            updateLiveScore();
            
            alert('数据导入成功！');
        } catch (error) {
            console.error('数据导入失败:', error);
            alert('数据导入失败，请检查文件格式是否正确');
        }
    };
    reader.readAsText(file);
}

// 显示用户数据
function showUserData() {
    const modal = createModal('查看数据', `
        <div class="form-group">
            <label for="searchTeamNumber">搜索队伍编号</label>
            <input type="text" id="searchTeamNumber" placeholder="请输入队伍编号">
        </div>
        <div class="data-table-container">
            <table id="userDataTable">
                <thead>
                    <tr>
                        <th>队伍编号</th>
                        <th>比赛名称</th>
                        <th>比赛类型</th>
                        <th>比赛编号</th>
                        <th>分数</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="userDataTableBody">
                    <!-- 数据将通过JavaScript动态添加 -->
                </tbody>
            </table>
        </div>
    `);
    
    // 加载数据
    loadUserData();
    
    // 添加搜索事件监听
    document.getElementById('searchTeamNumber').addEventListener('input', loadUserData);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.className = 'btn-primary';
    closeBtn.onclick = () => closeModal(modal);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'button-group';
    buttonsContainer.appendChild(closeBtn);
    
    modal.querySelector('.modal-content').appendChild(buttonsContainer);
}

// 加载用户数据
async function loadUserData() {
    try {
        showLoading('加载数据中...');
        
        const searchTeamNumber = document.getElementById('searchTeamNumber')?.value;
        const response = await fetch(`${getApiUrl()}/api/scouting-data`);
        
        if (response.ok) {
            const result = await response.json();
            
            // 过滤数据
            let filteredData = result.data || [];
            if (searchTeamNumber) {
                filteredData = filteredData.filter(item => item.teamNumber === searchTeamNumber);
            }
            
            // 更新表格
            const tableBody = document.getElementById('userDataTableBody');
            tableBody.innerHTML = '';
            
            if (filteredData.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td colspan="6" style="text-align: center; padding: 20px; color: #666;">暂无数据</td>
                `;
                tableBody.appendChild(row);
            } else {
                filteredData.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.teamNumber}</td>
                        <td>${item.matchName}</td>
                        <td>${item.matchType}</td>
                        <td>${item.matchNumber}</td>
                        <td>${item.score}</td>
                        <td>
                            <button class="btn-sm btn-primary" onclick="showDetailedData(${JSON.stringify(item).replace(/"/g, '&quot;')})">查看详细</button>
                            <button class="btn-sm btn-danger" onclick="deleteMatchData('${item.id}')">删除</button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            }
        } else {
            console.error('加载数据失败:', response.status);
            showError('加载数据失败');
        }
    } catch (error) {
        console.error('加载数据异常:', error);
        showError('加载数据失败，请稍后重试');
    } finally {
        hideLoading();
    }
}

// 删除比赛数据
async function deleteMatchData(id) {
    try {
        if (confirm('确定要删除这条比赛数据吗？删除后不可恢复！')) {
            showLoading('删除中...');
            
            const response = await fetch(`${getApiUrl()}/api/scouting-data/${id}`, {
                method: 'DELETE'
            });
            
            hideLoading();
            
            if (response.ok) {
                const result = await response.json();
                showSuccess(result.message);
                // 重新加载数据
                loadUserData();
            } else {
                const result = await response.json();
                showError('删除失败: ' + result.message);
            }
        }
    } catch (error) {
        console.error('删除数据异常:', error);
        hideLoading();
        showError('删除失败，请稍后重试');
    }
}

// 显示详细数据
function showDetailedData(item) {
    // 创建详细数据表格
    const detailedDataTable = `
        <table class="detailed-data-table">
            <thead>
                <tr>
                    <th>阶段</th>
                    <th>项目</th>
                    <th>数值</th>
                </tr>
            </thead>
            <tbody>
                <!-- Auto阶段数据 -->
                <tr>
                    <td rowspan="4">Auto阶段</td>
                    <td>机器人离开起点</td>
                    <td>${item.gameData.auto.robotLeave ? '是' : '否'}</td>
                </tr>
                <tr>
                    <td>分类文物数量</td>
                    <td>${item.gameData.auto.classifiedArtifacts}</td>
                </tr>
                <tr>
                    <td>溢出文物数量</td>
                    <td>${item.gameData.auto.overflowArtifacts}</td>
                </tr>
                <tr>
                    <td>选择的图案</td>
                    <td>${item.selectedMotif}</td>
                </tr>
                
                <!-- TeleOp阶段数据 -->
                <tr>
                    <td rowspan="4">TeleOp阶段</td>
                    <td>仓库文物数量</td>
                    <td>${item.gameData.teleOp.depotArtifacts}</td>
                </tr>
                <tr>
                    <td>分类文物数量</td>
                    <td>${item.gameData.teleOp.classifiedArtifacts}</td>
                </tr>
                <tr>
                    <td>溢出文物数量</td>
                    <td>${item.gameData.teleOp.overflowArtifacts}</td>
                </tr>
                <tr>
                    <td>基地返回状态</td>
                    <td>${item.gameData.teleOp.baseReturnState}</td>
                </tr>
                
                <!-- 一般数据 -->
                <tr>
                    <td rowspan="3">一般数据</td>
                    <td>驾驶员评分</td>
                    <td>${item.gameData.general.driverPerformance}</td>
                </tr>
                <tr>
                    <td>防守评分</td>
                    <td>${item.gameData.general.defenseRating}</td>
                </tr>
                <tr>
                    <td>机器人故障</td>
                    <td>${item.gameData.general.diedOnField ? '是' : '否'}</td>
                </tr>
            </tbody>
        </table>
        
        <div class="form-group">
            <label>备注</label>
            <div>${item.gameData.general.notes || '无'}</div>
        </div>
    `;
    
    const modal = createModal('详细数据', detailedDataTable);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.className = 'btn-primary';
    closeBtn.onclick = () => closeModal(modal);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'button-group';
    buttonsContainer.appendChild(closeBtn);
    
    modal.querySelector('.modal-content').appendChild(buttonsContainer);
}





// 更新服务器状态指示器
function updateServerStatusIndicator(status) {
    const statusIndicator = document.getElementById('serverStatusIndicator');
    
    if (!statusIndicator) {
        // 如果状态指示器不存在，创建一个
        const header = document.querySelector('header');
        const statusContainer = document.createElement('div');
        statusContainer.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            align-items: center;
            gap: 5px;
        `;
        
        statusIndicator = document.createElement('div');
        statusIndicator.id = 'serverStatusIndicator';
        statusIndicator.style.cssText = `
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: ${status.online ? '#4caf50' : '#f44336'};
            transition: background-color 0.3s ease;
        `;
        statusIndicator.title = status.online ? '服务器在线' : status.error || '服务器离线';
        
        const statusText = document.createElement('span');
        statusText.textContent = status.online ? '在线' : '离线';
        statusText.style.cssText = `
            font-size: 12px;
            color: ${status.online ? '#4caf50' : '#f44336'};
        `;
        
        statusContainer.appendChild(statusIndicator);
        statusContainer.appendChild(statusText);
        header.appendChild(statusContainer);
    } else {
        // 更新现有状态指示器
        statusIndicator.style.backgroundColor = status.online ? '#4caf50' : '#f44336';
        statusIndicator.title = status.online ? '服务器在线' : status.error || '服务器离线';
        
        const statusText = statusIndicator.nextSibling;
        if (statusText) {
            statusText.textContent = status.online ? '在线' : '离线';
            statusText.style.color = status.online ? '#4caf50' : '#f44336';
        }
    }
}
