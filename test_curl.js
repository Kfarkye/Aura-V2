import https from 'https';

https.get('https://api.elections.kalshi.com/trade-api/v2/exchange/status', (res) => {
    console.log(res.headers.date);
});
