# API Hub - 价格清单服务

这是一个基于 Node.js 和 Express 的 API 集成中心，专为 AI Agent 调用设计，提供价格清单查询和轮胎规格搜索服务。

## 🎯 功能特点

- 📊 **Excel 数据处理**: 自动读取和解析 Excel 文件 (296条产品数据)
- 🔍 **智能搜索**: 支持多参数产品搜索和价格筛选
- 🚗 **轮胎规格搜索**: 专业的轮胎规格匹配系统 (支持116个轮胎产品)
- 🤖 **Agent 友好**: 统一的响应格式 (raw/markdown/type/desc)
- 🔬 **智能解析**: 自动解析轮胎产品规格参数
- 🚀 **RESTful API**: 提供标准的 REST API 接口
- 🛡️ **安全性**: 包含速率限制、CORS 和安全头设置

## 📡 API 端点

### 主入口
- `GET /` - API Hub 信息和模块列表

### 价格清单模块 (`/api/price-list/`)

#### 基础端点
- `GET /api/price-list/health` - 健康检查和数据统计
- `GET /api/price-list/products` - 获取所有产品
- `POST /api/price-list/reload` - 重新加载 Excel 数据

#### 产品查询端点
- `POST /api/price-list/search` - 产品搜索 (支持多参数)
- `GET /api/price-list/product/:id` - 根据产品ID获取详情

#### 🚗 轮胎专用端点
- `POST /api/price-list/tire-search` - 轮胎规格搜索
- `POST /api/price-list/tire-parse` - 轮胎规格解析测试

## 🔧 Agent 响应格式

所有 API 返回统一的 Agent 友好格式：

```json
{
  "raw": {
    // 结构化数据，便于程序处理
  },
  "markdown": "| 列1 | 列2 |\n|:---|:---|\n| 值1 | 值2 |",
  "type": "markdown",
  "desc": "详细的文本描述，便于用户阅读"
}
```

## 🚗 轮胎搜索系统

### 支持的轮胎类型

1. **小型轿车轮胎** (114个产品)
   - 格式: `155/70R13`, `185/60R15`, `175 65 R15`, `155 70 13` 等
   - 参数: `width`, `aspectRatio`, `diameter`
   - 智能格式识别: 支持多种输入格式

2. **货车轮胎** (2个产品)  
   - 格式: `1100R22`, `1100 R22` 等
   - 参数: `width`, `diameter`

### 🔧 轮胎格式智能识别

系统支持多种轮胎规格输入格式：

**小型轿车轮胎格式支持:**
- `155/70R13` (标准格式)
- `155/70-13` (短横线格式)  
- `155 70 13` (空格分隔)
- `155 70 R13` (空格+R格式) ✨ **新增支持**
- `175 65 R15 84H SAFERICH` (完整产品名)

**智能匹配特性:**
- 🧠 自动忽略R字符差异 (用户输入"15"或"R15"都能匹配)
- 🔍 模糊匹配规格参数
- 📊 按价格排序返回结果

### 轮胎搜索参数

```json
{
  "width": "155",           // 必需: 轮胎宽度
  "aspectRatio": "70",      // 可选: 扁平比 (小型轿车)
  "diameter": "13",         // 可选: 直径
  "exactMatch": false,      // 可选: 是否精确匹配
  "limit": 10               // 可选: 返回数量 (1-100，默认10) ✨ **新增**
}
```

**参数说明:**
- `width`: 轮胎宽度，必需参数
- `aspectRatio`: 扁平比，小型轿车轮胎建议提供
- `diameter`: 轮圈直径，支持"15"或"R15"格式
- `exactMatch`: 精确匹配模式，默认false
- `limit`: 返回结果数量，范围1-100，默认10个

## 🛠️ 安装和运行

### 本地开发

1. 克隆仓库：
```bash
git clone https://github.com/zhuchenyu876/price-list-api-hub.git
cd price-list-api-hub
```

2. 安装依赖：
```bash
npm install
```

3. 确保 Excel 文件在根目录：
```
LISTA DE PRECIOS 25062025.xlsx
```

4. 启动服务：
```bash
npm start
```

服务将在 `http://localhost:3000` 启动

### 线上访问

🌐 **部署地址**: `https://price-list-api-hub-zhu.vercel.app`

## 📝 API 使用示例

### 1. 健康检查
```bash
curl https://price-list-api-hub-zhu.vercel.app/api/price-list/health
```

**响应示例:**
```json
{
  "raw": {
    "status": "healthy",
    "dataLoaded": true,
    "totalRecords": 296,
    "timestamp": "2025-07-02T07:08:25.825Z"
  },
  "markdown": "| 状态 | 值 |\n|:-----|:---|\n| 服务状态 | 健康 |\n| 数据加载 | 成功 |\n| 产品数量 | 296 |",
  "type": "markdown", 
  "desc": "✅ API 服务运行正常\n📊 已加载 296 条产品数据\n🚗 包含 116 个轮胎产品"
}
```

### 2. 轮胎规格搜索

**标准搜索示例:**
```bash
curl -X POST https://price-list-api-hub-zhu.vercel.app/api/price-list/tire-search \
  -H "Content-Type: application/json" \
  -d '{
    "width": "155",
    "aspectRatio": "70", 
    "diameter": "13"
  }'
```

**智能格式搜索示例 (新功能):**
```bash
curl -X POST https://price-list-api-hub-zhu.vercel.app/api/price-list/tire-search \
  -H "Content-Type: application/json" \
  -d '{
    "width": "175",
    "aspectRatio": "65", 
    "diameter": "R15",
    "limit": 5
  }'
```

**响应示例:**
```json
{
  "raw": {
    "searchType": "car",
    "searchSpec": "155/70R13",
    "totalFound": 1,
    "results": [
      {
        "id": "LL-C29834",
        "product": "155 70 13 75T MIRAGE MR-166 AUTO",
        "stock": 3,
        "price": 932.3616,
        "specs": {
          "width": 155,
          "aspect_ratio": 70,
          "rim_diameter": 13,
          "type": "car"
        }
      }
    ]
  },
  "markdown": "| 产品ID | 产品名称 | 库存 | 价格 |\n|:-------|:---------|:-----|:-----|\n| LL-C29834 | 155 70 13 75T MIRAGE MR-166 AUTO | 3 | $932.3616 |",
  "type": "markdown",
  "desc": "🔍 轮胎搜索结果 - 小型轿车轮胎 (155/70R13)\n\n📊 搜索统计:\n• 匹配轮胎: 1 个\n• 轮胎类型: 小型轿车\n• 搜索规格: 155/70R13\n\n💰 价格范围: $932.3616 - $932.3616\n\n🏆 推荐轮胎:\n1. 155 70 13 75T MIRAGE MR-166 AUTO - $932.3616"
}
```

### 3. 产品搜索
```bash
curl -X POST https://price-list-api-hub-zhu.vercel.app/api/price-list/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "155",
    "limit": 5
  }'
```

### 4. 产品详情查询
```bash
curl https://price-list-api-hub-zhu.vercel.app/api/price-list/product/LL-C29834
```

## 🤖 Agent 调用示例

### JavaScript/Node.js
```javascript
// 轮胎搜索
async function searchTires(width, aspectRatio, diameter) {
  const response = await fetch('https://price-list-api-hub-zhu.vercel.app/api/price-list/tire-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      width: width,
      aspectRatio: aspectRatio,
      diameter: diameter
    })
  });

  const data = await response.json();
  
  // Agent 可以使用不同格式的数据
  console.log('结构化数据:', data.raw);           // 程序处理
  console.log('表格显示:', data.markdown);        // Markdown 渲染
  console.log('用户描述:', data.desc);            // 用户阅读
  
  return data;
}

// 调用示例
searchTires("185", "60", "15").then(result => {
  console.log(`找到 ${result.raw.totalFound} 个轮胎`);
});
```

### Python
```python
import requests

def search_tires(width, aspect_ratio, diameter):
    url = "https://price-list-api-hub-zhu.vercel.app/api/price-list/tire-search"
    payload = {
        "width": width,
        "aspectRatio": aspect_ratio, 
        "diameter": diameter
    }
    
    response = requests.post(url, json=payload)
    data = response.json()
    
    return data

# 调用示例
result = search_tires("155", "70", "13")
print(f"找到 {result['raw']['totalFound']} 个匹配轮胎")
```

## 📊 支持的搜索参数

### 产品搜索参数
```json
{
  "query": "搜索关键词",      // 通用搜索
  "productId": "产品ID",     // 精确ID搜索  
  "productName": "产品名称", // 名称搜索
  "priceMin": 100,          // 最低价格
  "priceMax": 500,          // 最高价格
  "limit": 50               // 结果数量限制
}
```

### 轮胎搜索参数
```json
{
  "width": "155",           // 必需: 宽度
  "aspectRatio": "70",      // 可选: 扁平比 (小型轿车)
  "diameter": "13",         // 可选: 直径 (支持"13"或"R13"格式)
  "exactMatch": false,      // 可选: 精确匹配
  "limit": 10               // 可选: 返回数量 (1-100，默认10)
}
```

## 🗂️ 数据结构

### Excel 数据字段
- **ID Producto**: 产品ID
- **Producto**: 产品名称  
- **Costo Uni Unitario**: 单位成本
- **Exit.**: 库存数量
- **COSTO CON IVA**: 含税成本
- **PRECIO FINAL**: 最终价格

### 轮胎产品统计
- **总产品数**: 296个
- **轮胎产品**: 116个
  - 小型轿车轮胎: 114个
  - 货车轮胎: 2个

## 🚀 部署信息

- **平台**: Vercel
- **域名**: `https://price-list-api-hub-zhu.vercel.app`
- **GitHub**: `https://github.com/zhuchenyu876/price-list-api-hub`
- **自动部署**: 推送到主分支自动触发部署

## 🛡️ 安全特性

- **速率限制**: 每15分钟100次请求
- **CORS**: 跨域资源共享支持
- **Helmet**: 安全头设置
- **输入验证**: 参数类型和范围验证

## 📚 相关文档

- `agent-example.js` - Agent 调用示例
- `test-tire-search.js` - 轮胎搜索测试
- `API-Hub集成指南.md` - 详细集成指南
- `使用指南.md` - 完整使用说明

## 🧪 测试

```bash
# 运行所有测试
npm test

# 轮胎搜索测试
node test-tire-search.js

# API端点测试
node test-api.js
```

## 技术栈

- **Node.js v22** - 运行时环境
- **Express.js** - Web 框架
- **xlsx** - Excel 文件处理
- **cors** - 跨域资源共享
- **helmet** - 安全头设置
- **express-rate-limit** - 请求速率限制

## 🔄 更新日志

### v1.2.0 (最新) - 轮胎搜索增强
- ✨ **新增**: 支持"175 65 R15"格式轮胎搜索
- 🧠 **智能**: R字符自动匹配 ("15" ↔ "R15")
- 🔢 **新增**: limit参数控制返回数量 (1-100)
- 🔧 **修复**: 数据显示一致性问题
- 📊 **优化**: 轮胎搜索结果按价格排序

### v1.1.0 - API Hub格式
- 🤖 **新增**: Agent标准响应格式
- 📋 **新增**: Markdown表格输出
- 📝 **新增**: 详细描述信息
- 🔍 **优化**: 搜索算法改进

### v1.0.0 - 基础功能
- 📊 Excel数据处理
- 🔍 产品搜索功能
- 🚗 轮胎规格搜索
- 🚀 RESTful API接口

## 许可证

MIT License

## 联系方式

如有问题，请创建 [GitHub Issue](https://github.com/zhuchenyu876/price-list-api-hub/issues)。 