require 'json'

# JavaScript code để chạy trực tiếp
js_code = <<~JS
const { Zalo } = require('./lib/zca-js/dist/cjs/index.cjs');

async function loginWithZalo() {
  try {
    const zalo = new Zalo();
    const api = await zalo.loginQR();
    console.log(JSON.stringify({ success: true, data: 'Login successful' }));
  } catch (error) {
    console.log(JSON.stringify({ success: false, error: error.message }));
  }
}

loginWithZalo();
JS

# Chạy trực tiếp bằng Node.js với IO.popen
begin
  result = IO.popen('node', 'r+') do |pipe|
    pipe.write(js_code)
    pipe.close_write
    pipe.read
  end
  puts "Zalo login result: #{result}"
rescue => e
  puts "Error: #{e.message}"
end