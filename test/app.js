require('dotenv').config();
const express = require('express');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const axios = require('axios');

const app = express();
const PORT = process.env.APP_PORT || 30000; // 使用serv00分配的端口
const HOSTNAME = os.hostname();
const USERNAME = os.userInfo().username;

// 服务配置（重点修改部分）
const services = [
  {
    name: 'Hysteria2',
    pattern: 'server config.yaml',
    startCmd: './web server config.yaml',
    logFile: 'hysteria.log'
  },
  {
    name: 's5',
    pattern: '.s5/s5 -c .s5/config.json',
    startCmd: '~/.s5/s5 -c ~/.s5/config.json',
    logFile: 's5.log'
  }
];

// Telegram通知功能
async function sendAlert(message) {
  if (!process.env.BOT_TOKEN || !process.env.CHAT_ID) {
    console.log('Telegram通知未配置');
    return;
  }

  try {
    await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      chat_id: process.env.CHAT_ID,
      text: `${message}\n\n🖥️ 服务器: ${HOSTNAME}\n👤 账户: ${USERNAME}`
    });
  } catch (error) {
    console.error('Telegram通知失败:', error.message);
  }
}

// 增强型进程检查
function checkProcess(service) {
  try {
    const output = execSync(
      `ps aux | grep '${service.pattern}' | grep -v grep | awk '{print $2}'`
    ).toString();
    return output.trim().length > 0;
  } catch (error) {
    return false;
  }
}

// 智能服务重启
function restartService(service) {
  try {
    // 清理旧进程
    execSync(`pkill -f "${service.pattern}"`);
    
    // 启动新进程
    const logStream = fs.createWriteStream(service.logFile, { flags: 'a' });
    const [cmd, ...args] = service.startCmd.split(' ');
    const child = spawn(cmd, args, {
      detached: true,
      stdio: ['ignore', logStream, logStream]
    });
    child.unref();

    // 验证启动
    setTimeout(() => {
      if (checkProcess(service)) {
        sendAlert(`✅ ${service.name} 启动成功\nPID: ${child.pid}`);
      } else {
        sendAlert(`⚠️ ${service.name} 启动异常，请检查日志`);
      }
    }, 3000);

    return true;
  } catch (error) {
    sendAlert(`❌ ${service.name} 重启失败\n错误: ${error.message}`);
    return false;
  }
}

// 自动监控系统
let monitorInterval = null;
function startMonitor() {
  if (monitorInterval) return;

  monitorInterval = setInterval(() => {
    services.forEach(service => {
      if (!checkProcess(service)) {
        console.log(`[${new Date().toISOString()}] ${service.name} 离线`);
        sendAlert(`🔄 正在重启 ${service.name}...`);
        restartService(service);
      }
    });
  }, 30000); // 30秒检测间隔

  console.log('监控系统已启动');
}

// 状态检查API
app.get('/status', (req, res) => {
  const status = services.map(service => ({
    name: service.name,
    status: checkProcess(service) ? '在线' : '离线',
    lastUpdate: new Date().toISOString()
  }));
  res.json(status);
});

// 强制重启端点
app.get('/restart', (req, res) => {
  services.forEach(service => restartService(service));
  res.json({ 
    status: 'success',
    message: '已触发全服务重启'
  });
});

// 启动服务
app.listen(PORT, 'localhost', () => {
  console.log(`🟢 服务运行中 | 端口: ${PORT}`);
  sendAlert('🚀 保活系统启动成功');
  startMonitor();
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  console.log('正在关闭服务...');
  clearInterval(monitorInterval);
  services.forEach(service => {
    execSync(`pkill -f "${service.pattern}"`);
  });
  process.exit(0);
});