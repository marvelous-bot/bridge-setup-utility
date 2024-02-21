var CronJob = require('cron').CronJob;
var mysql = require('mysql');
const util = require('util');
var axios = require('axios');
require('dotenv').config();


var DB_CONFIG = {
  host: process.env.DB_HOST.toString(),
  user: process.env.DB_USER.toString(),
  password: process.env.DB_PASSWORD.toString(),
  database: process.env.DB_DATABASE.toString(),
  connectTimeout: 50000,
  port: process.env.DB_PORT
};

var config = {
  method: 'get',
  url: 'https://api.coingecko.com/api/v3/simple/price?ids=matic-network,ethereum,binancecoin,mainnetz&vs_currencies=usd',
  headers: {}
};


async function executeQuery(XQuery){
    console.log(">>> XQuery >>>",XQuery);     
    let simpleConnection = mysql.createConnection(DB_CONFIG);
    const simpleQuery = util.promisify(simpleConnection.query).bind(simpleConnection);
    try{
        var z =  await simpleQuery(XQuery).catch(console.log);
        //console.log("|ZZZZ >>>",z);
        return z;
    }catch(e){
        console.log("ERROR IN SQL QUERY >>", e);
    }finally{
        simpleConnection.end();
    }
}



async function mypriceupdater(){
    axios(config)
    .then(function (response) {
      var resp = response.data;      

      if(typeof resp !== 'undefined'){
              console.log(">>>> resp >>>",resp);              
              
              var ethprice = resp.ethereum.usd;
              var binanceprice = resp.binancecoin.usd;              
              var maticprice = resp['matic-network'].usd; 
              var mainnetzprice = resp.mainnetz.usd;

              var z1 = (typeof ethprice !== 'undefined') ?
                ( 
                    (ethprice > 0 ) ?
                    executeQuery("UPDATE `token_pricing_table` SET `tokenPriceInUSD`="+ethprice+" where `tokenName`='ETH'") : 
                    {'Error': 'not valid value - for ethprice'}
                ) :
                {'Error': 'Coingecko, ethprice coming undefined'};     
                 console.log(">>> z1 >>>", z1);         
              setTimeout(()=>{}, 6000);
              
              var z2 = (typeof binanceprice !== 'undefined') ?
                (
                    (binanceprice > 0) ?
                    executeQuery("UPDATE `token_pricing_table` SET `tokenPriceInUSD`="+binanceprice+" where `tokenName`='BNB'") :
                     {'Error': 'not valid value - for binanceprice'}
                ):
                    {'Error': 'Coingecko, binanceprice coming undefined'};              
                 console.log(">>> z2 >>>", z2);         
              setTimeout(()=>{}, 6000);

              var z3 = (typeof maticprice !== 'undefined') ? 
                (
                  (maticprice > 0) ?
                  executeQuery("UPDATE `token_pricing_table` SET `tokenPriceInUSD`="+maticprice+" where `tokenName`='Matic'") : 
                  {'Error': 'not valid value - for maticprice'}
                ):
                  {'Error': 'Coingecko, maticprice coming undefined'};              
                  console.log(">>> z3 >>>", z3);         
              setTimeout(()=>{}, 6000);  

              //mainnetz
              var z4 = (typeof mainnetzprice !== 'undefined') ? 
                (
                    (mainnetzprice > 0) ?
                    executeQuery("UPDATE `token_pricing_table` SET `tokenPriceInUSD`="+mainnetzprice+" where `tokenName`='clientChainNativeCoin'"):
                    {'Error': 'not valid value - for mainnetzprice'}
                ) : 
                {'Error': 'Coingecko, mainnetzprice coming undefined'};              
                console.log(">>> z4 >>>", z4);         
              setTimeout(()=>{}, 6000);  
      }
    }).catch(function (error){
      console.log(">>> in axios catch [mypriceupdater /url axios] ..error >>>", error.code);
      console.log(">>> in axios catch [mypriceupdater /url axios] ..error details >>>", error);
    }).finally(function(){
      console.log(">>> in finally ...");
    })
}


var cronjob = new CronJob('0 */2 * * * *',function() {
		console.log('Price updater >>> Cron running every 2 mins');
    		mypriceupdater();
},null,	true,	'America/Los_Angeles');

cronjob.start();
