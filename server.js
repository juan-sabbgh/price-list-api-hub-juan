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

// 轮胎规格解析函数
function parseTireSpecification(productName) {
  const name = String(productName || '').trim();
  
  // 轮胎规格解析结果
  const specs = {
    width: null,
    aspect_ratio: null,
    rim_diameter: null,
    type: null, // 'car' 或 'truck'
    original: name
  };

  // 小型轿车轮胎格式: 155 70 13 75T MIRAGE MR-166 AUTO
  // 格式: 宽度 扁平比 直径 [其他信息]
  const carTirePattern = /^(\d{3})\s+(\d{2})\s+(\d{2})\s/;
  const carMatch = name.match(carTirePattern);
  
  if (carMatch) {
    specs.width = parseInt(carMatch[1]);
    specs.aspect_ratio = parseInt(carMatch[2]);
    specs.rim_diameter = parseInt(carMatch[3]);
    specs.type = 'car';
    return specs;
  }

  // 货车轮胎格式: 1100 R22 T-2400 14/C
  // 格式: 宽度 R直径 [其他信息]
  const truckTirePattern = /^(\d{3,4})\s+R(\d{2})\s/;
  const truckMatch = name.match(truckTirePattern);
  
  if (truckMatch) {
    specs.width = parseInt(truckMatch[1]);
    specs.rim_diameter = parseInt(truckMatch[2]);
    specs.type = 'truck';
    return specs;
  }

  // 其他可能的轮胎格式
  // 格式: 155/70R13 或 155/70-13
  const standardPattern = /(\d{3})\/(\d{2})[-R](\d{2})/;
  const standardMatch = name.match(standardPattern);
  
  if (standardMatch) {
    specs.width = parseInt(standardMatch[1]);
    specs.aspect_ratio = parseInt(standardMatch[2]);
    specs.rim_diameter = parseInt(standardMatch[3]);
    specs.type = 'car';
    return specs;
  }

  return specs; // 无法解析的情况
}

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

// 产品搜索API - 支持多参数搜索
app.post('/api/price-list/search', (req, res) => {
  try {
    const { 
      query,           // 通用搜索（产品ID或名称）
      productId,       // 精确产品ID搜索
      productName,     // 产品名称搜索
      priceMin,        // 最低价格
      priceMax,        // 最高价格
      limit = 50       // 限制结果数量，默认50
    } = req.body;
    
    // 至少需要一个搜索条件
    if (!query && !productId && !productName && !priceMin && !priceMax) {
      return res.status(400).json({
        success: false,
        error: '至少需要一个搜索参数',
        supportedParams: {
          query: '通用搜索（产品ID或名称）',
          productId: '精确产品ID搜索',
          productName: '产品名称搜索',
          priceMin: '最低价格筛选',
          priceMax: '最高价格筛选',
          limit: '限制结果数量（默认50）'
        },
        examples: {
          basic: { query: "1100" },
          advanced: { 
            productName: "产品",
            priceMin: 100,
            priceMax: 500,
            limit: 10
          },
          multiParam: {
            query: "CCCC",
            priceMin: 200
          }
        }
      });
    }

    let results = [...priceListData];

    // 应用搜索过滤器
    if (query) {
      const searchTerm = String(query).toLowerCase().trim();
      results = results.filter(item => {
        const idProducto = String(item['ID Producto'] || '').toLowerCase();
        const producto = String(item['Producto'] || '').toLowerCase();
        return idProducto.includes(searchTerm) || producto.includes(searchTerm);
      });
    }

    // 精确产品ID搜索
    if (productId) {
      const searchId = String(productId).toLowerCase().trim();
      results = results.filter(item => {
        const idProducto = String(item['ID Producto'] || '').toLowerCase();
        return idProducto.includes(searchId);
      });
    }

    // 产品名称搜索
    if (productName) {
      const searchName = String(productName).toLowerCase().trim();
      results = results.filter(item => {
        const producto = String(item['Producto'] || '').toLowerCase();
        return producto.includes(searchName);
      });
    }

    // 价格范围筛选
    if (priceMin !== undefined || priceMax !== undefined) {
      results = results.filter(item => {
        const finalPrice = parseFloat(item['PRECIO FINAL']) || 0;
        let passesMin = true;
        let passesMax = true;
        
        if (priceMin !== undefined) {
          passesMin = finalPrice >= parseFloat(priceMin);
        }
        if (priceMax !== undefined) {
          passesMax = finalPrice <= parseFloat(priceMax);
        }
        
        return passesMin && passesMax;
      });
    }

    // 限制结果数量
    const limitNum = parseInt(limit) || 50;
    if (results.length > limitNum) {
      results = results.slice(0, limitNum);
    }

    // 排序：按价格排序（可选）
    results.sort((a, b) => {
      const priceA = parseFloat(a['PRECIO FINAL']) || 0;
      const priceB = parseFloat(b['PRECIO FINAL']) || 0;
      return priceA - priceB;
    });

    res.json({
      success: true,
      message: results.length > 0 ? '搜索成功' : '未找到匹配的产品',
      searchParams: {
        query: query || null,
        productId: productId || null,
        productName: productName || null,
        priceRange: {
          min: priceMin || null,
          max: priceMax || null
        },
        limit: limitNum
      },
      results: results,
      total: results.length,
      isLimited: priceListData.length > limitNum && results.length === limitNum
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

// 轮胎规格搜索API
app.post('/api/price-list/tire-search', (req, res) => {
  try {
    const { width, aspect_ratio, rim_diameter, exact_match = false } = req.body;
    
    // 参数验证
    if (!width) {
      return res.status(400).json({
        success: false,
        error: '轮胎宽度(width)是必需参数',
        usage: {
          car: '小型轿车: { "width": 155, "aspect_ratio": 70, "rim_diameter": 13 }',
          truck: '货车: { "width": 1100, "rim_diameter": 22 }'
        },
        examples: {
          car_search: {
            width: 155,
            aspect_ratio: 70,
            rim_diameter: 13
          },
          truck_search: {
            width: 1100,
            rim_diameter: 22
          }
        }
      });
    }

    // 确定搜索类型
    const searchType = aspect_ratio ? 'car' : 'truck';
    
    console.log(`🔍 轮胎规格搜索: ${searchType} - 宽度:${width}, 扁平比:${aspect_ratio || 'N/A'}, 直径:${rim_diameter || 'N/A'}`);

    // 解析所有产品的轮胎规格
    const tireProducts = priceListData.map(product => {
      const specs = parseTireSpecification(product['Producto']);
      return {
        ...product,
        tire_specs: specs
      };
    }).filter(product => product.tire_specs.width !== null); // 只保留能解析出规格的产品

    console.log(`📊 成功解析 ${tireProducts.length} 个轮胎产品`);

    // 搜索匹配的轮胎
    const matchingTires = tireProducts.filter(product => {
      const specs = product.tire_specs;
      
      // 基础匹配：宽度必须匹配
      if (specs.width !== width) return false;
      
      if (searchType === 'car') {
        // 小型轿车：需要匹配宽度、扁平比、直径
        if (exact_match) {
          return specs.aspect_ratio === aspect_ratio && specs.rim_diameter === rim_diameter;
        } else {
          // 允许一定的规格范围匹配
          const aspectMatch = !aspect_ratio || Math.abs(specs.aspect_ratio - aspect_ratio) <= 5;
          const rimMatch = !rim_diameter || specs.rim_diameter === rim_diameter;
          return aspectMatch && rimMatch;
        }
      } else {
        // 货车：只需要匹配宽度和直径
        return !rim_diameter || specs.rim_diameter === rim_diameter;
      }
    });

    // 按价格排序
    matchingTires.sort((a, b) => {
      const priceA = parseFloat(a['PRECIO FINAL']) || 0;
      const priceB = parseFloat(b['PRECIO FINAL']) || 0;
      return priceA - priceB;
    });

    // 返回结果
    res.json({
      success: true,
      message: `找到 ${matchingTires.length} 个匹配的${searchType === 'car' ? '小型轿车' : '货车'}轮胎`,
      search_params: {
        width: width,
        aspect_ratio: aspect_ratio || null,
        rim_diameter: rim_diameter || null,
        type: searchType,
        exact_match: exact_match
      },
      results: matchingTires.map(tire => ({
        'ID Producto': tire['ID Producto'],
        'Producto': tire['Producto'],
        'Exit.': tire['Exit.'],
        'PRECIO FINAL': tire['PRECIO FINAL'],
        'tire_specs': tire.tire_specs
      })),
      total: matchingTires.length,
      statistics: {
        total_tire_products: tireProducts.length,
        car_tires: tireProducts.filter(p => p.tire_specs.type === 'car').length,
        truck_tires: tireProducts.filter(p => p.tire_specs.type === 'truck').length
      }
    });

  } catch (error) {
    console.error('轮胎搜索错误:', error);
    res.status(500).json({
      success: false,
      error: '轮胎搜索过程中发生错误'
    });
  }
});

// 轮胎规格解析测试端点
app.post('/api/price-list/tire-parse', (req, res) => {
  try {
    const { product_name } = req.body;
    
    if (!product_name) {
      return res.status(400).json({
        success: false,
        error: '请提供产品名称(product_name)进行解析'
      });
    }

    const specs = parseTireSpecification(product_name);
    
    res.json({
      success: true,
      message: '轮胎规格解析完成',
      input: product_name,
      parsed_specs: specs,
      is_parseable: specs.width !== null
    });

  } catch (error) {
    console.error('轮胎解析错误:', error);
    res.status(500).json({
      success: false,
      error: '轮胎规格解析过程中发生错误'
    });
  }
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