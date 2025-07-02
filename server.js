const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 限流器
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP每15分钟最多100次请求
  message: '请求过于频繁，请稍后再试'
});
app.use(limiter);

// 全局变量存储Excel数据
let priceListData = [];

// 读取Excel文件
function loadExcelData() {
  try {
    const workbook = XLSX.readFile('LISTA DE PRECIOS 25062025.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 转换为JSON格式
    priceListData = XLSX.utils.sheet_to_json(worksheet);
    console.log(`成功加载 ${priceListData.length} 条数据`);
    return true;
  } catch (error) {
    console.error('加载Excel文件失败:', error.message);
    return false;
  }
}

// 启动时加载数据
loadExcelData();

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: 'API Hub - 价格清单服务',
    version: '2.0.0',
    description: 'API集成中心 - 价格清单模块',
    modules: {
      'price-list': {
        name: '价格清单API',
        endpoints: {
          '/api/price-list/health': 'GET - 健康检查',
          '/api/price-list/products': 'GET - 获取所有产品',
          '/api/price-list/search': 'POST - 搜索产品',
          '/api/price-list/product/:id': 'GET - 根据产品ID获取产品信息',
          '/api/price-list/reload': 'POST - 重新加载Excel数据'
        }
      }
    },
    usage: {
      input: 'query - 产品ID或产品名称',
      output: 'producto - 产品的完整信息'
    }
  });
});

// API模块路由 - 价格清单
app.get('/api/price-list', (req, res) => {
  res.json({
    module: '价格清单API',
    version: '2.0.0',
    endpoints: {
      '/api/price-list/health': 'GET - 健康检查',
      '/api/price-list/products': 'GET - 获取所有产品',
      '/api/price-list/search': 'POST - 搜索产品',
      '/api/price-list/product/:id': 'GET - 根据产品ID获取产品信息',
      '/api/price-list/reload': 'POST - 重新加载Excel数据'
    },
    dataFields: {
      'ID Producto': '产品ID',
      'Producto': '产品名称',
      'Costo Uni Unitario': '单位成本',
      'Exit.': '库存',
      'COSTO CON IVA': '含税成本',
      'PRECIO FINAL': '最终价格'
    }
  });
});

// 健康检查端点
app.get('/api/price-list/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dataLoaded: priceListData.length > 0,
    totalRecords: priceListData.length,
    module: 'price-list'
  });
});

// 获取所有产品
app.get('/api/price-list/products', (req, res) => {
  res.json({
    success: true,
    message: '获取所有产品成功',
    module: 'price-list',
    data: priceListData,
    total: priceListData.length
  });
});

// 产品搜索API - 接收单个查询参数
app.post('/api/price-list/search', (req, res) => {
  try {
    const { query } = req.body;
    
    // 验证必需参数
    if (!query) {
      return res.status(400).json({
        success: false,
        error: '缺少查询参数',
        required: ['query'],
        usage: '请提供产品代码或产品名称进行搜索'
      });
    }

    const searchTerm = String(query).toLowerCase().trim();
    
    // 搜索逻辑：匹配产品ID或产品名称
    const results = priceListData.filter(item => {
      const idProducto = String(item['ID Producto'] || '').toLowerCase();
      const producto = String(item['Producto'] || '').toLowerCase();
      
      return idProducto.includes(searchTerm) || producto.includes(searchTerm);
    });

    res.json({
      success: true,
      message: results.length > 0 ? '搜索成功' : '未找到匹配的产品',
      query: query,
      results: results,
      total: results.length
    });

  } catch (error) {
    console.error('搜索错误:', error);
    res.status(500).json({
      success: false,
      error: '搜索过程中发生错误'
    });
  }
});

// 根据产品ID精确查询
app.get('/api/price-list/product/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: '产品ID不能为空'
      });
    }

    // 精确匹配产品ID
    const product = priceListData.find(item => 
      String(item['ID Producto'] || '').toLowerCase() === id.toLowerCase()
    );

    if (product) {
      res.json({
        success: true,
        message: '产品查询成功',
        id: id,
        producto: product
      });
    } else {
      res.status(404).json({
        success: false,
        message: '未找到指定ID的产品',
        id: id
      });
    }

  } catch (error) {
    console.error('产品查询错误:', error);
    res.status(500).json({
      success: false,
      error: '产品查询过程中发生错误'
    });
  }
});

// 重新加载Excel数据
app.post('/api/price-list/reload', (req, res) => {
  const success = loadExcelData();
  res.json({
    success: success,
    message: success ? '数据重新加载成功' : '数据加载失败',
    module: 'price-list',
    total: priceListData.length
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

// 向后兼容的路由重定向
app.get('/api/health', (req, res) => res.redirect('/api/price-list/health'));
app.get('/api/products', (req, res) => res.redirect('/api/price-list/products'));
app.post('/api/product/search', (req, res) => {
  // 转发请求到新的端点
  req.url = '/api/price-list/search';
  app.handle(req, res);
});
app.get('/api/product/id/:id', (req, res) => {
  res.redirect(`/api/price-list/product/${req.params.id}`);
});
app.post('/api/reload', (req, res) => {
  req.url = '/api/price-list/reload';
  app.handle(req, res);
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: '端点不存在',
    availableEndpoints: {
      'price-list': [
        'GET /api/price-list/health',
        'GET /api/price-list/products', 
        'POST /api/price-list/search',
        'GET /api/price-list/product/:id',
        'POST /api/price-list/reload'
      ]
    }
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`访问 http://localhost:${PORT} 查看API文档`);
});

module.exports = app; 