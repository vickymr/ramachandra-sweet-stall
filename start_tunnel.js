const localtunnel = require('localtunnel');
const fs = require('fs');

(async () => {
  try {
    const tunnel = await localtunnel({ port: 3000 });
    const msg = `LIVE_URL:${tunnel.url}\n`;
    console.log(msg);
    fs.writeFileSync('active_link.txt', msg, 'utf8');
    
    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });
  } catch (err) {
    console.error('Tunnel error:', err);
  }
})();
