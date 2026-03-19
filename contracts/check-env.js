require('dotenv').config();

const key = process.env.PRIVATE_KEY;

if (!key || key === 'your_private_key_here') {
  console.log('❌ PRIVATE_KEY 为空或使用默认值');
  process.exit(1);
}

if (key.startsWith('0x')) {
  console.log('❌ PRIVATE_KEY 包含0x前缀，需要移除');
  console.log('请修改.env文件，移除PRIVATE_KEY前面的0x');
  process.exit(1);
}

if (key.length !== 64) {
  console.log('❌ PRIVATE_KEY 长度不正确');
  console.log('应该是64位16进制字符，当前长度:', key.length);
  console.log('请检查.env文件中的PRIVATE_KEY');
  process.exit(1);
}

console.log('✅ PRIVATE_KEY 格式正确 (64位16进制)');
console.log('✅ 可以开始部署');
