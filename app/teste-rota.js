const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/download?folder=9_ACESSO_TEMPORARIO_E_UNICO&filename=teste.txt',
    method: 'GET',
    headers: {
        'X-Forwarded-For': '177.100.20.150', // IP Aleatório do Brasil para Testar Cartografia
        'User-Agent': 'BOT VERIFICADOR DE AUDITORIA'
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', (chunk) => {
        // console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
        console.log('Teste de Rota de Download Finalizado.');
    });
});

req.on('error', (e) => {
    console.error(`ERRO: ${e.message}`);
});

req.end();
