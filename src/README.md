# Universal AI API Proxy - 工程化结构

## 项目结构

```
src/
├── types/           # 类型定义
│   └── index.ts     # 所有接口和类型定义
├── config/          # 配置管理
│   └── index.ts     # 环境变量配置和常量
├── utils/           # 工具函数
│   ├── auth.ts      # 认证相关工具
│   ├── uuid.ts      # UUID验证工具
│   ├── converters.ts # API格式转换工具
│   ├── errors.ts    # 错误处理工具
│   └── logger.ts    # 日志系统
├── middleware/      # 中间件
│   └── uuid.ts      # UUID验证中间件
├── services/        # 业务逻辑服务
│   └── openai.ts    # OpenAI API服务
├── controllers/     # 控制器
│   ├── claude.ts    # Claude API控制器
│   ├── gemini.ts    # Gemini API控制器
│   ├── models.ts    # 模型列表控制器
│   └── config.ts    # 配置信息控制器
├── routes/          # 路由定义
│   └── api.ts       # API路由配置
└── index.ts         # 应用入口点
```

## 核心特性

### 1. 类型安全
- 完整的TypeScript类型定义
- 严格的类型检查
- 清晰的接口定义

### 2. 模块化设计
- 单一职责原则
- 清晰的模块边界
- 易于测试和维护

### 3. 错误处理
- 统一的错误处理机制
- 不同类型的错误类别
- 友好的错误响应格式

### 4. 日志系统
- 结构化日志记录
- 不同日志级别
- 调试信息追踪

### 5. 配置管理
- 环境变量集中管理
- 配置验证和默认值
- 运行时配置查看

## 使用方式

### 环境变量配置

```bash
# 基础配置
TARGET_MODEL=moonshotai/kimi-k2-instruct
TARGET_PROVIDER=groq
TARGET_BASE_URL=https://api.groq.com/openai/v1
TARGET_MAX_TOKENS=16384

# UUID验证配置
REQUIRE_UUID=true
VALID_UUIDS=uuid1,uuid2,uuid3
```

### API端点

所有API端点都需要UUID前缀：

- `/{uuid}/v1/messages` - Claude API
- `/{uuid}/v1/models` - Claude 模型列表
- `/{uuid}/v1beta/models/{model}:generateContent` - Gemini API
- `/{uuid}/v1beta/models` - Gemini 模型列表
- `/{uuid}/v1/config` - 配置信息

### 开发命令

```bash
# 开发服务器
npm run dev

# 类型检查
npm run type-check

# 构建
npm run build

# 部署
npm run deploy
```

## 扩展指南

### 添加新的API端点

1. 在 `types/index.ts` 中定义相关类型
2. 在 `controllers/` 中创建新的控制器
3. 在 `routes/api.ts` 中注册路由
4. 在 `services/` 中实现业务逻辑

### 添加新的中间件

1. 在 `middleware/` 中创建中间件文件
2. 在 `routes/api.ts` 中注册中间件

### 自定义错误处理

1. 在 `utils/errors.ts` 中定义新的错误类型
2. 在控制器中使用新的错误类型
3. 更新错误响应格式器

## 最佳实践

1. **类型优先** - 始终先定义类型再实现功能
2. **单一职责** - 每个模块只负责一个功能
3. **错误处理** - 使用统一的错误处理机制
4. **日志记录** - 记录关键操作和错误信息
5. **配置管理** - 所有配置都应该可通过环境变量控制