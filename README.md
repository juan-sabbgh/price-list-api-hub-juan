# 价格清单 API 服务

这是一个基于 Node.js 和 Express 的 API 服务，用于处理和查询 Excel 价格清单数据。

## 功能特点

- 📊 **Excel 数据处理**: 自动读取和解析 Excel 文件
- 🔍 **三参数搜索**: 支持通过三个参数进行数据查询
- 🚀 **RESTful API**: 提供标准的 REST API 接口
- 🛡️ **安全性**: 包含速率限制、CORS 和安全头设置
- 📱 **Agent 友好**: 专为 AI Agent 调用设计

## API 端点

### 基础端点
- `GET /` - API 文档和服务信息
- `GET /api/health` - 健康检查

### 产品查询端点
- `GET /api/products` - 获取所有产品
- `POST /api/product/search` - 搜索产品（输入查询字符串）
- `GET /api/product/code/:codigo` - 根据产品代码获取产品信息
- `POST /api/reload` - 重新加载 Excel 数据

## 输入参数和输出参数

### 输入参数 (Input)
- **query**: 查询字符串 - 可以是产品代码或产品名称的部分或完整内容
- **codigo**: 产品代码 - 用于精确查询特定产品

### 输出参数 (Output)
每个产品包含以下完整信息：
- **CODIGO**: 产品代码
- **PRODUCTO**: 产品名称
- **UM**: 单位
- **PRECIO**: 价格

## 安装和运行

### 本地开发

1. 克隆仓库：
```bash
git clone <your-repo-url>
cd price-list-api
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
# 开发模式
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3000` 启动

## API 使用示例

### 健康检查
```bash
curl http://localhost:3000/api/health
```

### 搜索产品
```bash
curl -X POST http://localhost:3000/api/product/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "ACEITE"
  }'
```

### 根据产品代码查询
```bash
curl http://localhost:3000/api/product/code/001
```

### 获取所有产品
```bash
curl http://localhost:3000/api/products
```

## Agent 调用示例

对于 AI Agent，可以使用以下方式调用：

```javascript
// 搜索产品
const response = await fetch('http://your-api-url/api/product/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'ACEITE'  // 产品代码或产品名称
  })
});

const data = await response.json();
console.log('搜索结果:', data.results);

// 根据产品代码查询
const productResponse = await fetch('http://your-api-url/api/product/code/001');
const productData = await productResponse.json();
console.log('产品信息:', productData.producto);
```

详细的Agent调用示例，请参考项目中的 `agent-example.js` 文件。

## 响应格式

### 搜索产品响应
```json
{
  "success": true,
  "message": "搜索成功",
  "query": "ACEITE",
  "results": [
    {
      "CODIGO": "001",
      "PRODUCTO": "ACEITE DE OLIVA",
      "UM": "LT",
      "PRECIO": "25.50"
    }
  ],
  "total": 1
}
```

### 根据代码查询响应
```json
{
  "success": true,
  "message": "产品查询成功",
  "codigo": "001",
  "producto": {
    "CODIGO": "001",
    "PRODUCTO": "ACEITE DE OLIVA",
    "UM": "LT",
    "PRECIO": "25.50"
  }
}
```

## 部署到 GitHub

1. 将代码推送到 GitHub 仓库
2. GitHub Actions 会自动运行测试和部署
3. 服务可以部署到各种平台（Heroku、Vercel、Railway 等）

## 环境变量

- `PORT` - 服务端口（默认 3000）
- `NODE_ENV` - 运行环境（development/production）

## 技术栈

- **Node.js** - 运行时环境
- **Express.js** - Web 框架
- **xlsx** - Excel 文件处理
- **cors** - 跨域资源共享
- **helmet** - 安全头设置
- **express-rate-limit** - 请求速率限制

## 许可证

MIT License

## 联系方式

如有问题，请创建 GitHub Issue。 