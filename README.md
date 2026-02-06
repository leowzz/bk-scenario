# Scenario Pro

一个强大的自动化规则编排系统，提供可视化图谱编辑器、执行历史回溯以及快捷触发能力。

## 主要功能

- **可视化流程编辑**: 基于 React Flow 的节点式编辑器，轻松设计复杂的自动化规则。
- **快捷触发主页**: 专为快速执行场景设计的清爽主页，一键运行预设规则。
- **执行历史记录**: 详尽的日志记录与状态追踪，随时回溯每一次规则执行。
- **全局变量管理**: 统一管理跨规则的环境变量与配置信息。
- **现代化 UI 设计**: 采用高级暗色主题，提供舒适流畅的用户体验。

## 项目结构

```
.
├── backend/            # FastAPI 后端服务
│   ├── app/           # 核心业务逻辑
│   ├── db/            # 数据库配置
│   └── pyproject.toml # Python 依赖管理 (uv)
├── frontend/           # React + Vite 前端应用
│   ├── src/
│   │   ├── pages/     # 应用页面 (Home, Editor)
│   │   ├── components/# 通用 UI 组件
│   │   └── editor/    # 图谱编辑器核心逻辑
│   └── package.json   # Node 依赖管理
└── Makefile            # 项目管理快捷指令
```

## 快速开始

### 前置要求

- **Python**: 3.12+ (推荐使用 `uv` 管理)
- **Node.js**: 18+ (推荐使用 `pnpm` 或 `npm`)
- **Make**: 用于执行快捷命令

### 开发指南

项目内置了 `Makefile` 以简化常见开发任务。

1. **安装依赖**
   ```bash
   make install
   ```

2. **启动开发服务**
   一条命令同时启动前后端服务：
   ```bash
   make dev
   ```
   - 后端地址: http://localhost:8001
   - 前端地址: http://localhost:5173

### 手动安装与运行

**后端 (Backend)**
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

**前端 (Frontend)**
```bash
cd frontend
npm install
npm run dev
```

## 使用指南

1. **主页 (Home Page)**: 
   - 展示所有可用规则卡片。
   - 点击“运行”按钮可立即触发规则。
   - 点击“编辑”按钮进入配置页面。

2. **编辑器 (Editor)**: 
   - 拖拽节点 (SQL, LOG, STORE) 进行编排。
   - 连接节点定义执行流。
   - 保存图谱并进行测试运行。
   - 在右侧面板查看每一步的详细执行结果。

## 技术栈

- **前端**: React, Vite, React Flow, React Router, Lucide Icons.
- **后端**: Python, FastAPI.
