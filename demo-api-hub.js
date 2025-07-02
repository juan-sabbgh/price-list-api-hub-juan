const http = require('http');

// 配置 - API Hub 风格
const API_BASE = 'http://localhost:3000';
const PRICE_LIST_MODULE = '/api/price-list';

// HTTP请求辅助函数
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function demoApiHub() {
  console.log('🚀 API Hub - 价格清单模块演示\n');

  try {
    // 1. 检查API Hub首页
    console.log('1️⃣ 检查API Hub首页');
    const hubInfo = await makeRequest('GET', '/');
    console.log(`✅ API Hub: ${hubInfo.message}`);
    console.log(`📋 版本: ${hubInfo.version}`);
    console.log(`📝 描述: ${hubInfo.description}`);
    
    if (hubInfo.modules && hubInfo.modules['price-list']) {
      console.log(`🔧 价格清单模块: ${hubInfo.modules['price-list'].name}`);
    }
    console.log('');

    // 2. 检查价格清单模块
    console.log('2️⃣ 检查价格清单模块');
    const moduleInfo = await makeRequest('GET', PRICE_LIST_MODULE);
    console.log(`✅ 模块: ${moduleInfo.module}`);
    console.log(`📋 版本: ${moduleInfo.version}`);
    console.log('');

    // 3. 健康检查
    console.log('3️⃣ 价格清单模块健康检查');
    const health = await makeRequest('GET', `${PRICE_LIST_MODULE}/health`);
    console.log(`✅ 状态: ${health.status}`);
    console.log(`📊 模块: ${health.module}`);
    console.log(`📈 数据记录: ${health.totalRecords} 条\n`);

    // 4. 获取产品数据
    console.log('4️⃣ 获取产品数据');
    const products = await makeRequest('GET', `${PRICE_LIST_MODULE}/products`);
    console.log(`✅ 模块: ${products.module}`);
    console.log(`📊 总产品数: ${products.total} 个`);
    
    if (products.data && products.data.length > 0) {
      console.log('📝 前3个产品示例:');
      products.data.slice(0, 3).forEach((product, index) => {
        console.log(`${index + 1}. ID: ${product['ID Producto']}`);
        console.log(`   名称: ${product['Producto']}`);
        console.log(`   最终价格: ${product['PRECIO FINAL']}\n`);
      });

      // 5. 搜索产品
      console.log('5️⃣ 搜索产品演示');
      const firstProduct = products.data[0];
      const searchTerm = firstProduct['Producto'].split(' ')[0];
      
      console.log(`🔍 搜索关键词: "${searchTerm}"`);
      const searchResult = await makeRequest('POST', `${PRICE_LIST_MODULE}/search`, { query: searchTerm });
      
      if (searchResult.success) {
        console.log(`✅ 搜索成功: 找到 ${searchResult.total} 个匹配产品`);
        if (searchResult.results && searchResult.results.length > 0) {
          console.log('📋 搜索结果:');
          searchResult.results.slice(0, 2).forEach((product, index) => {
            console.log(`${index + 1}. ${product['ID Producto']} - ${product['Producto']} (${product['PRECIO FINAL']})`);
          });
        }
      } else {
        console.log(`❌ 搜索失败: ${searchResult.error}`);
      }
      console.log('');

      // 6. 根据产品ID查询
      console.log('6️⃣ 根据产品ID查询');
      const productId = firstProduct['ID Producto'];
      console.log(`🔍 查询产品ID: ${productId}`);
      
      const productDetail = await makeRequest('GET', `${PRICE_LIST_MODULE}/product/${productId}`);
      if (productDetail.success) {
        console.log('✅ 查询成功');
        console.log(`📦 产品详情:`);
        console.log(`   ID: ${productDetail.producto['ID Producto']}`);
        console.log(`   名称: ${productDetail.producto['Producto']}`);
        console.log(`   单位成本: ${productDetail.producto['Costo Uni Unitario']}`);
        console.log(`   库存: ${productDetail.producto['Exit.']}`);
        console.log(`   含税成本: ${productDetail.producto['COSTO CON IVA']}`);
        console.log(`   最终价格: ${productDetail.producto['PRECIO FINAL']}`);
      } else {
        console.log(`❌ 查询失败: ${productDetail.message}`);
      }
    }

  } catch (error) {
    console.error('❌ 演示过程中出错:', error.message);
    console.log('\n请确保API服务已启动 (npm start)');
  }

  console.log('\n🎉 API Hub 演示完成!');
  console.log('\n📚 新的API结构:');
  console.log('- API Hub首页: GET /');
  console.log('- 价格清单模块: GET /api/price-list');
  console.log('- 健康检查: GET /api/price-list/health');
  console.log('- 搜索产品: POST /api/price-list/search { "query": "关键词" }');
  console.log('- 查询产品: GET /api/price-list/product/产品ID');
  console.log('- 获取所有: GET /api/price-list/products');
  console.log('');
  console.log('🌐 远程访问示例:');
  console.log('- https://api-hub-sigma.vercel.app/api/price-list/health');
  console.log('- https://api-hub-sigma.vercel.app/api/price-list/search');
  console.log('- https://api-hub-sigma.vercel.app/api/price-list/product/CCCC137');
}

// 运行演示
demoApiHub(); 