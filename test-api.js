// Simple test script for differential diagnoses API
const http = require('http');

function testAPI() {
  const patientId = '0681FA35-A794-4684-97BD-00B88370DB41';
  const encounterId = 'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8';
  
  const url = `http://localhost:3000/api/differential-diagnoses?patientId=${patientId}&encounterId=${encounterId}`;
  
  console.log('Testing API endpoint:', url);
  
  http.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
      
      try {
        const parsed = JSON.parse(data);
        console.log('Parsed response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Could not parse as JSON');
      }
    });
  }).on('error', (err) => {
    console.log('Error:', err.message);
  });
}

testAPI(); 