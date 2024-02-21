#!/usr/bin/nodejs

/** Bridge specifications
 * This bridge suppors 2 chain IDs to covert from and to any network.
 * This bridge does not support multiple networks.
 * Token names and their prices must be set in database for the currencies, which are not 1:1
 * TokenOut will use outputcurrency [ tokencontractAddress ] to understand which token to send
 * dummyTransaction() function is used to maintain sequence of nounce in case, there were no transactions fired in a batch of transactions
 */

///////////////////////////////////////////////////////////////////// 
/// FromChain is Mainnetz 
/// ToChain is BSC
/// pair - BNB(mainnetz)  to BNB (BSC)
/////////////////////////////////////////////////////////////////////

var mysql = require('mysql');
const util = require('util');
require('dotenv').config();
const Web3 = require("web3");
var Tx = require('ethereumjs-tx').Transaction;
var Contract = require('web3-eth-contract');
var CronJob = require('cron').CronJob;
const BigNumber = require('bignumber.js');

//--------------------------------------------------//
//                  CONFIGURATION                   //
//--------------------------------------------------//

var fromChainID = process.env.CUSTOM_NETWORK_CHAIN_ID;
var toChainID = process.env.BSC_CHAIN_ID;

var fromProvider = process.env.CUSTOM_NETWORK_WEB3_PROVIDER;
var toProvider = process.env.BSC_WEB3_PROVIDER;

var fromBridgeContract = process.env.CUSTOM_NETWORK_BRIDGE_CONTRACT;
var toBridgeContract = process.env.BSC_BRIDGE_CONTRACT;

var fromTokenDecimals = 18;
var toTokenDecimals = 18;
var maxTxnsInBatch = process.env.MAX_TRANSACTIONS_IN_BATCH; // this is number of transactions to be sent in one go when cron runs



// Min amount of coins to input in bridge.
// various tokens will have its value set from ENV file in the script below.
var minInputAmount = 1; 
var nonce;   

var fromWeb3 = new Web3(new Web3.providers.HttpProvider(fromProvider));
var toWeb3 = new Web3(new Web3.providers.HttpProvider(toProvider));
var CONTRACT_ADDR_ABI = JSON.parse(process.env.BRIDGE_ABI);


//Tokens
var customToken = fromWeb3.utils.toChecksumAddress(process.env.BNB_CUSTOM_NETWORK);           // BNB token on from network
var nativeCoin = fromWeb3.utils.toChecksumAddress("0x0000000000000000000000000000000000000000"); // The native coin will represent address zero


 // Add here both input and output tokens
 var allowedTokens = [
    customToken, nativeCoin
];
 
 
 /// DB Connection Config Obj
 var DB_CONFIG = {
     host: process.env.DB_HOST.toString(),
     user: process.env.DB_USER.toString(),
     password: process.env.DB_PASSWORD.toString(),
     database: process.env.DB_DATABASE.toString(),
     connectTimeout: 50000,
     port: process.env.DB_PORT
 };
  

  

 //--------------------------------------------------//
 //                    FUNCTIONS                     //
 //--------------------------------------------------//
 /// Converter Code - 05 Oct 2022
 async function logEtoLongNumber(amountInLogE){
    
  amountInLogE = amountInLogE.toString();
  var noDecimalDigits = "";

  if(amountInLogE.includes("e-")){
    
    var splitString = amountInLogE.split("e-"); //split the string from 'e-'

    noDecimalDigits = splitString[0].replace(".", ""); //remove decimal point

    //how far decimals to move
    var zeroString = "";
    for(var i=1; i < splitString[1]; i++){
      zeroString += "0";
    }

    return  "0."+zeroString+noDecimalDigits;
    
  }
  else if(amountInLogE.includes("e+")){

    var splitString = amountInLogE.split("e+"); //split the string from 'e+'
    var ePower = parseInt(splitString[1]);

    noDecimalDigits = splitString[0].replace(".", ""); //remove decimal point

    if(ePower >= noDecimalDigits.length-1){
      var zerosToAdd = ePower  - noDecimalDigits.length;

      for(var i=0; i <= zerosToAdd; i++){
        noDecimalDigits += "0";
      }

    }
    else{
      //this condition will run if the e+n is less than numbers
      var stringFirstHalf = noDecimalDigits.slice(0, ePower+1);
      var stringSecondHalf = noDecimalDigits.slice(ePower+1);

      return stringFirstHalf+"."+stringSecondHalf;
    }
    return noDecimalDigits;
  }
  else if(amountInLogE.includes(".")){
        var splitString = amountInLogE.split("."); //split the string from '.'
        return splitString[0];
     }
  return amountInLogE;  //by default it returns stringify value of original number if its not logarithm number
}
 

 
 async function bridge_send_transaction(inputCurrency, outputCurrency, _toWallet, _amt, orderid, _chainid, adminWallet, adminWalletPK, nonce) {
    //dummyTransaction() functions are used to maintain sequence of nounce in case, there were no transactions fired in a batch of transactions
    // Many places in this function, it returns without sending transaction.
    // if this function returns without sending transaction, then sequence of nonce in getTransactionsFromDB function is messed.
    // so, this dummy transaction will be just a transaction without to same admin wallet without any value.
    // gas cost is very low, so nothing to worry about gas price as well.
     
    //// ----fees structure logic starts from here
    //// --- myether_cut start from here
    var require_amt = await getRequireAmount();
    //console.log(">>> require_amt.current_rate.eth_current_rate >>>", require_amt.current_rate.eth_current_rate);
    var bnb_current_rate = require_amt.current_rate.bnb_current_rate
    console.log(">>>bnb_current_rate >>>", bnb_current_rate);
    // inputed amount val in usd as per current rate
    var _amt_in_ether = toWeb3.utils.fromWei(_amt, 'ether');
    _amt_val_in_usd = _amt_in_ether * bnb_current_rate;
    //console.log(" _amt_val_in_usd,_amt_in_ether,netz_current_rate",  _amt_val_in_usd,_amt_in_ether,netz_current_rate)
    console.log("#>#>#> _amt, _amt_in_ether, _amt_val_in_usd >>>",  _amt, _amt_in_ether, _amt_val_in_usd);
    /* lets calculate fees for inputed amount */
    if(_amt_val_in_usd > 0  && _amt_val_in_usd <= 500){
        //fees will be 5%
        myusd_cut = (_amt_val_in_usd * 5) / 100;
        // (coins or tokens to give to user)= _amt - [(myether_cut) + gas]  
        myether_cut = myusd_cut / bnb_current_rate;
        console.log("#>Condition1>>_amt_val_in_usd, myether_cut, myusd_cut, bnb_current_rate", _amt_val_in_usd, myether_cut, myusd_cut, bnb_current_rate)
    }
    else if(_amt_val_in_usd >= 501  && _amt_val_in_usd <= 1000){
        // fees will be 3%
        myusd_cut = (_amt_val_in_usd * 3) / 100;
        // (coins or tokens to give to user)= _amt - [(myether_cut) + gas]  
        myether_cut = myusd_cut / bnb_current_rate;
        console.log("#>Condition2>>")
    }
    else if(_amt_val_in_usd >= 1001  && _amt_val_in_usd <= 3000){
        // fees will be 2%
        myusd_cut = (_amt_val_in_usd * 2) / 100;
        // (coins or tokens to give to user)= _amt - [(myether_cut) + gas]  
        myether_cut = myusd_cut / bnb_current_rate;
        console.log("#>Condition3>>")
    }
    else if(_amt_val_in_usd >= 3001  && _amt_val_in_usd <= 5000){
        // fees will be 1.5%
        myusd_cut = (_amt_val_in_usd * 1.5) / 100;
        // (coins or tokens to give to user)= _amt - [(myether_cut) + gas]  
        myether_cut = myusd_cut / bnb_current_rate
        console.log("#>Condition4>>")
    }
    else if(_amt_val_in_usd >= 5001  && _amt_val_in_usd <= 10000){
        // fees will be 1%
        myusd_cut = (_amt_val_in_usd * 1) / 100;
        // (coins or tokens to give to user)= _amt - [(myether_cut) + gas]  
        myether_cut = myusd_cut / bnb_current_rate;
        console.log("#>Condition5>>")
    }
    else if(_amt_val_in_usd >= 10001){
        // fees will be 0.065%
        myusd_cut = (_amt_val_in_usd * 0.065) / 100;
        // (coins or tokens to give to user)= _amt - [(myether_cut) + gas]  
        myether_cut = myusd_cut / bnb_current_rate;
        console.log("#>Condition6>>")
    }else{
    // this condition will never occur 
    }
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    console.log("*****>***>**> myusd_cut, myether_cut >>>", myusd_cut, myether_cut)
    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@------")
    var gprice = await toWeb3.eth.getGasPrice();
    console.log(">>> gprice >>>>", gprice);
    //// --- myether_cut ends here
    //// ---- fees structure logic ends here

    console.log("~~~~~~~~~~~~~~~~~@@@@@@@@@@~~~~~~~~~~~~~~~~~~~~~~~~");
     console.log(">>>>inputCurrency, outputCurrency, _toWallet, _amt, orderid, _chainid, adminWallet, nonce >>>>",inputCurrency, outputCurrency, _toWallet, _amt, orderid, _chainid, adminWallet, nonce);
     console.log("~~~~~~~~~~~~~~~~~@@@@@@@@@@~~~~~~~~~~~~~~~~~~~~~~~~~");
     console.log(">>>> in bridge_send_transction function >>>>");    
     // not valid token addr
     if (!allowedTokens.includes(inputCurrency) || !allowedTokens.includes(outputCurrency)) {
        console.log("invalid token"); 
        dummyTransaction(nonce, adminWallet, adminWalletPK)
        return;
     }  
     console.log(">>>>> Working on chain id >>>> ", _chainid);
     
     try {
         var bridgeinstance = new toWeb3.eth.Contract(CONTRACT_ADDR_ABI, toBridgeContract);
     } catch (e) {
         console.log(" >>>>> EEEEE >>>>", e);
     }      
             console.log(">>>>>>!!!!!!!!!!!!!!!!!!!!!!!!_chainid, adminWallet~~~~~~~~~~~~~~~~~~~~~~~~", _chainid, adminWallet);
             var mydata = '';
             let status = false;
             console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
             console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
             console.log(">>>> In send Transaction  function >>>>");
             console.log(">>>>>>> outputCurrency, nativeCoin  >>>>>", outputCurrency,nativeCoin);
             console.log(">>>> toWeb3.utils.toChecksumAddress(outputCurrency), toWeb3.utils.toChecksumAddress(nativeCoin) >>>",toWeb3.utils.toChecksumAddress(outputCurrency), toWeb3.utils.toChecksumAddress(nativeCoin));
             console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
             console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
             if (outputCurrency === nativeCoin) {
                 status = true;
                 console.log(">>>>>>@@@@@!~~~~");                
                    console.log("<<<<< new_amount BEFORE DB PRICE multiplication >>>>>", _amt);
                    
                    var pricedata = await getPriceFromDB();
                    if(inputCurrency === customToken){
                        //do nothing. price will remain the same.
                        fromTokenDecimals = parseInt(process.env.BNB_CUSTOM_NETWORK_DECIMAL)
                    }
                    else{
                        // this case is not possible. so return
                        dummyTransaction(nonce, adminWallet, adminWalletPK)
                        console.log("==== transaction skipped =======");
                        return;
                    }
                    _amt = await logEtoLongNumber(_amt / (10**fromTokenDecimals) * (10**toTokenDecimals));   // to decimal issue of tokens having different decimals                     
                    fromTokenDecimals=18;   //reverting back to original. so it does not reused in other pairs in the loop
                    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
                    console.log("<<<<< new_amount >>>>>", _amt);
                    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");   
                    
                    //// fees from here ..
                    // FORMULA (coins or tokens to give to user)= _amt - [(myether_cut) + gas]
                    var myreturnedObj  = await feesCalculaterForCoins( toBridgeContract, adminWallet, nonce, toWeb3, bridgeinstance, myether_cut, gprice, _toWallet, _amt, orderid, toChainID )
                    console.log(">>> myreturnedObj.dodummytrans >>>", myreturnedObj.dodummytrans)
                    console.log(">>> myreturnedObj >>>",  myreturnedObj)

                    if(myreturnedObj.dodummytrans){
                        //this is not possible. so, return
                        console.log("====== nothing was sent =======");
                        dummyTransaction(nonce, adminWallet, adminWalletPK);
                        return;
                    }else{
                        var finalAmtInWei = myreturnedObj.amount_to_send
                        console.log(">>> _amt > finalAmtInWei >>>", _amt, finalAmtInWei)
                        if(BigInt(_amt.toString()) > BigInt(finalAmtInWei.toString())){  
                            console.log(">>> fees applied .. will do coinOut ..")
                            mydata = await bridgeinstance.methods.coinOut(_toWallet.toString(), finalAmtInWei.toString(), orderid.toString()).encodeABI();                                                                              
                            console.log(">>>> CoinOut >> myData >>>>", mydata);
                        }else{
                            console.log("-This condition will not occur [finalAmtInWei will never greater than _amt] but safer side.. not sending transaction .")
                            console.log(">>> _amt > finalAmtInWei >>>", _amt, finalAmtInWei)
                            dummyTransaction(nonce, adminWallet, adminWalletPK);
                            return;
                        }
                    }
             }else{
                //this is not possible. so, return
                console.log("====== nothing was sent =======");
                dummyTransaction(nonce, adminWallet, adminWalletPK);
                return;
             }
                   
             if(status){
                 toWeb3.eth.getGasPrice().then(gasPrice => {                     
                     const raw_tx = {
                         nonce: nonce,
                         gasPrice: toWeb3.utils.toHex(gasPrice),                    
                         gasLimit: 200000,
                         from: adminWallet,
                         to: toBridgeContract,
                         data: mydata,                    
                         chainId: parseInt(_chainid)
                     };
                     console.log(">>>> RAW TX [raw_tx] >>>>", raw_tx);
                     try {
                         toWeb3.eth.accounts.signTransaction(raw_tx, adminWalletPK, function(error, result) {
                             if (!error) {
                                 try {
                                     var serializedTx = result.rawTransaction;                                     
                                     console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
                                     console.log("-->> Signed Transaction -->> Serialized Tx ::", serializedTx);
                                     console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
                                     toWeb3.eth.sendSignedTransaction(serializedTx.toString('hex')).on('receipt', console.log).on('error', console.log);
                                 } catch (e) {
                                     console.log(e);
                                 }
                             }
                         });
                         setTimeout(() => {}, 5000);
                         //																		
                     } catch (e) {
                         console.log("##### :::: ERR0R :::: ######", e);
                     }
                 })
             }			    			             
 }

async function dummyTransaction(nonce, adminWallet, adminWalletPK){
    toWeb3.eth.getGasPrice().then(gasPrice => { 
    try {
        var raw_tx = {
            nonce: nonce,
            gasPrice: toWeb3.utils.toHex(gasPrice),                    
            gasLimit: 50000,
            from: adminWallet,
            to: adminWallet,
            data: "",                    
            chainId: parseInt(toChainID)
        };

        toWeb3.eth.accounts.signTransaction(raw_tx, adminWalletPK, function(error, result) {
            if (!error) {
                try {
                    var serializedTx = result.rawTransaction;                                     
                    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
                    console.log("-->> Dummy transaction : Nounce: ", nonce);
                    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
                    toWeb3.eth.sendSignedTransaction(serializedTx.toString('hex')).on('receipt', console.log).on('error', console.log);
                } catch (e) {
                    console.log(e);
                }
            }
        });
        //setTimeout(() => {}, 1000);
        //																		
    } catch (e) {
        console.log("##### :::: ERR0R :::: ######", e);
    }
});
    
 }
 
 async function getTransactionsFromDB() {     
     try {
        var adminWallet = process.env.ADMIN_WALLET_ETH;
        var adminWalletPK = process.env.ADMIN_WALLET_ETH_PK;
       
         nonce = await toWeb3.eth.getTransactionCount(adminWallet, "pending");

         console.log("~~~~~~~~~~ GET AvailableAdminWallet ~~~~~~~~~~~");
         console.log("adminWallet, nonce >>>>>", adminWallet, nonce); 
 
         if (typeof(adminWallet) == "undefined" || (!adminWallet)) {
            console.log("<<@@@>@@@>>No admin wallet bridge available ...<@@@@@@>>");                         
         } else {
               // HERE TRY BLOCK
                var bridgedbConnect = mysql.createConnection(DB_CONFIG);
                try{                                   
                        var util_bridgequery = util.promisify(bridgedbConnect.query).bind(bridgedbConnect);
                        var query2 = "select * from bridge_transactions where status=0 and fromChainID=" + fromChainID + " and toChainID=" + toChainID + " limit "+maxTxnsInBatch;
                        console.log(">>selecting from DB...., select QUERY<<", query2)
                        var result = await util_bridgequery(query2);
                        var tempArray = [];             
                        //make an array for all order id. this is to update its status all in one go
                        for(j=0; j<result.length; j++){
                            tempArray.push(result[j].orderid);
                        }                          
                        //update the status of all records.
                        if(tempArray.length > 0){                 
                            var updateQuery = "update bridge_transactions set status=1 where fromChainID=" + fromChainID + " and orderid IN ("+tempArray+")";
                            console.log("============>>>> update query "+updateQuery);
                            await util_bridgequery(updateQuery);
                        }
        
                        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));   
                        console.log(">>>>>> here reached >>>>");
                        //sending individual transactions.
                        for(i=0; i<result.length; i++){                
                            await wait(4500); 
                            console.log(result[i]);
                            
                            let inputCurrency = result[i].inputCurrency;
                            let outputCurrency = result[i].outputCurrency;
                            let sendcoinsTo = result[i].toWallet;
                            let amount = result[i].toAmount;
                            let orderid = result[i].orderid;
                            let chainid = result[i].toChainID;
                            console.log(">>>>> HERE REACHED >>>> <<<< HERE REACHED <<<<, bridge send transcations >>>>");                                                                 
                            console.log(">>>>>result[i] >>>>>",result[i]);
                            var z = await bridge_send_transaction(inputCurrency, outputCurrency, sendcoinsTo, amount, orderid, toChainID, adminWallet, adminWalletPK, nonce).catch(console.log);
                            nonce++;
                        }
                    }catch(e){
                        console.log(e);
                    }finally{
                        bridgedbConnect.end();
                    }
            }	// else close
     } catch (e) {
        console.error("ERROR SQL>>Catch", e);
     } finally { 
		console.log("In finally block ...");
	 }
 }
 
 
 
 
 async function db_select( transactionHash, orderid, sendcoinsTo, amount, inputToken, outputToken, secretText) {   
     console.log("insert--------------------------");  
     var select_dbConnection = mysql.createConnection(DB_CONFIG); 
     try {          
         var util_query = util.promisify(select_dbConnection.query).bind(select_dbConnection);
         var select_query = "SELECT count(orderid) as rec FROM bridge_transactions  where fromTxnHash='" + transactionHash + "' ";
         console.log(">>>>>> select_query >>>>>", select_query);
         var records = await util_query(select_query).catch(console.log);
         console.log(">>>>>> records <<<<<<", records);
         if (parseInt(records[0].rec) < 1) {             
             var insert_query = "INSERT INTO bridge_transactions (`fromTxnHash`,`fromChainID`,`toChainID`,`orderid`,`secretText`,`toWallet`,`toAmount`,`inputCurrency`,`outputCurrency`) VALUES ('" + transactionHash + "'," + parseInt(fromChainID) + "," + parseInt(toChainID) + "," + parseInt(orderid) +"," + secretText + ",'" +sendcoinsTo.toString()+ "'," + amount.toString() + ",'" + inputToken + "','" + outputToken + "')";
             //console.log(">>> Inserting record, orderid, fromChainID, toChainID >>>", orderid, fromChainID, toChainID);
             
             var result = await util_query(insert_query).catch(console.log);
             //console.log("Insert query ", insert_query);             
         } else {
             console.log(">>> Skipping already in database, orderid, fromChainID, toChainID ", orderid, fromChainID, toChainID);
             return 1;
         }
     } catch (e) {
         console.error("ERROR SQL>>Catch", e);
     } finally {         
         select_dbConnection.end();
     }
 }
 

 async function getEventData(_fromBlock, _toBlock, _eventName) {
     const myinstance = new fromWeb3.eth.Contract(CONTRACT_ADDR_ABI, fromBridgeContract);
     
     try{
     await myinstance.getPastEvents(_eventName, {
         fromBlock: _fromBlock,
         toBlock: _toBlock
     }, function(error, myevents) {
         
         if (myevents === undefined) {
             return error;
         }
         var myeventlen = myevents.length;
        
         console.log("=================================================");
         console.log("FETCHING EVENTS >>> myeventlen >>>>", _eventName, myeventlen);
         console.log("=================================================");
         var secretText = Math.random(33831, 6914351);
         process.env.secretText = secretText.toString();
         for (k = 0; k < myeventlen; k++) {
             var myeve = myevents[k];
             console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
             console.log("Event Details ::: >>>",  myeve.blockNumber);
             console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
			 console.log(myeve);
             var _transactionHash = myeve.transactionHash;
             var _myorderid = myeve.returnValues.orderID;
             var _mysendcoinsTo = myeve.returnValues.user;
             var _myamount = myeve.returnValues.value;
             var _inputToken = nativeCoin //this is address(0), default for CoinIn event
             var _outputToken = fromWeb3.utils.toChecksumAddress(myeve.returnValues.outputCurrency);
 
             if(_eventName == 'TokenIn'){
                 _inputToken = fromWeb3.utils.toChecksumAddress(myeve.returnValues.tokenAddress.trim());
                 
                 //if input token is custom token of client, then it will take its decimal from ENV file.
                 if(_inputToken == customToken){
                    minInputAmount = parseFloat(process.env.CUSTOM_TOKEN_MIN_INPUT_AMOUNT) * (10 ** parseInt(process.env.BNB_CUSTOM_NETWORK_DECIMAL));
                 }
             }
             else{
                // This condition if for BNB only, and it only has 18 decimals
                minInputAmount = parseFloat(process.env.ETH_MIN_INPUT_AMOUNT) * (10 ** 18);
             }
 
             
             // It will check minimum amount of tokens must be there to be accepted.          
             if (parseInt(_myamount) >= minInputAmount) {
                 console.log("!!!!!! tokenAddress >>>>>", _inputToken);
                 
                 if (allowedTokens.includes(_inputToken) && allowedTokens.includes(_outputToken)) {
                     console.log("<<<<@>>>> Looking for ---->>>>", _inputToken);
                     try {
                         console.log("~~~~~TokenIn EVENT >>>>_inputToken ~~~~~", _inputToken);
                         (async () => {
                             var cnt = await db_select(_transactionHash, _myorderid, _mysendcoinsTo, _myamount, _inputToken, _outputToken, secretText).catch(console.log);
                         })();
                     } catch (e) {
                         console.log(">>>>>Catch >>>>", e);
                     }
                 } else {
                     console.log(">>>> not matched !!");
                 }
             } else {
                 console.log(">>> TOKENIN/ ELSE >>>> In for loop, _orderid, toChainID,  _myamount, k >>>>", _myorderid, toChainID, _myamount, k);
             }
         }
     });
 }catch(e){
	 	console.log("Error, Catch >>>",e);
 	}
}
 
 async function checkLatestBlock() {   
     var toBlock = await fromWeb3.eth.getBlockNumber();
     var fromBlock = 0; 
     // getting last synced block number from DB.
     // this is to elimate the overhead of reading lots of events from blockchain.
     // so, only read the blocks which are not already read previously.
     var mydbConnection = mysql.createConnection(DB_CONFIG);
     try{        
        var myquery = util.promisify(mydbConnection.query).bind(mydbConnection);
        var select_query = "SELECT last_block_synced FROM admin_settings where `customchain_to_network`='bnb' AND `networkid`="+fromChainID;
        var records = await myquery(select_query).catch(console.log);
        console.log(">>>>>> records <<<<<<", records); 
        if (parseInt(records[0].last_block_synced) > 0) { 
            fromBlock = records[0].last_block_synced;
            var update_query = "UPDATE `admin_settings` SET `last_block_synced`=" + toBlock + " where `customchain_to_network`='bnb' AND `networkid`="+fromChainID;
            await myquery(update_query).catch(console.log);
            console.log("update_query ", update_query);   
        }
     }catch(e){
        console.log("In catch block [checkLatestBlock]...", e);
     }finally{
        // end connection here
        mydbConnection.end();    
     }
     console.log(">>TESTING FOR>>fromblock, toblock>>", fromBlock, toBlock);

     // Only tokenIn
     getEventData(fromBlock, toBlock, 'TokenIn');       
 }
 
 async function getPriceFromDB(){    
     var Connection = mysql.createConnection(DB_CONFIG);
     try {         
         var query = util.promisify(Connection.query).bind(Connection);         
         var sel_query = "SELECT `tokenPriceInUSD` FROM token_pricing_table";
         return data = await query(sel_query).catch(console.log);
     } catch (e) {
         console.log("ERROR IN SQL GET PRICE FROM DB SEL QUERY >>", e);
     }finally{
        Connection.end();
     }
 }
 

 

 ///// Fees CalculaterForCoin
 async function feesCalculaterForCoins( toBridgeContract, adminWallet, nonce, toWeb3, bridgeinstance, myether_cut, gprice, _toWallet, _amt, orderid, toChainID ){               
    console.log("feesCalculaterForCoins>>>> myether_cut,gprice >>>", myether_cut, gprice)
    var temp_mydata = await bridgeinstance.methods.coinOut(_toWallet.toString(), _amt.toString(), orderid.toString()).encodeABI();                                          
    console.log("feesCalculaterForCoins>>> feesCalculaterForCoins >>>>>")
    console.log("feesCalculaterForCoins>>>>> _toWallet.toString(), _amt.toString(), orderid.toString() >>>", _toWallet.toString(), _amt.toString(), orderid.toString())
 
    const tempTx1 = {
        nonce: nonce,
        gasPrice: toWeb3.utils.toHex(await toWeb3.eth.getGasPrice()),                    
        gasLimit: 300000,
        from: adminWallet,
        to: toBridgeContract,
        data: temp_mydata,                  
        chainId: toWeb3.utils.toHex(toChainID)
    };

    console.log("feesCalculaterForCoins>>>> tempTx >>>", tempTx1);
    try{
        var tempEstimatedGas = await toWeb3.eth.estimateGas(tempTx1);
        console.log("feesCalculaterForCoins>>>> tempEstimatedGas >>>", tempEstimatedGas)   
    }catch(e){
        console.log("Error-[feesCalculaterForCoins>>>> tempEstimatedGas >>>]",e)
    }
    // if not receive from toWeb3
    tempEstimatedGas = tempEstimatedGas  ?  tempEstimatedGas.toString() : process.env.ESTIMATE_GAS_FOR_COIN_OUT.toString();
    console.log("feesCalculaterForCoins>>>>> tempEstimatedGas >>>>", tempEstimatedGas);
    var requiredGas = tempEstimatedGas * gprice;
    console.log("feesCalculaterForCoins>>>>tempEstimatedGas, gprice, requiredGas >>>>", tempEstimatedGas, gprice, requiredGas);
    requiredGasEther = await toWeb3.utils.fromWei(requiredGas.toString(), 'ether')
    console.log("feesCalculaterForCoins>>>> requiredGasEther >>>>", requiredGasEther);
    // FORMULA (coins or tokens to give to user)= _amt - [(myether_cut) + gas]
    var amt_tocut = parseFloat(myether_cut.toString()) + parseFloat(requiredGasEther.toString())
    console.log("feesCalculaterForCoins>>>>myether_cut, requiredGasEther, amt_tocut >!!!>>", myether_cut, requiredGasEther, amt_tocut)  
    _amt_to_send = await toWeb3.utils.fromWei(_amt, 'ether') - amt_tocut;
    _amt_to_send = new BigNumber(_amt_to_send).decimalPlaces(18);
    console.log("feesCalculaterForCoins>>>>toWeb3.utils.fromWei(_amt), amt_tocut, _amt_to_send >>>", toWeb3.utils.fromWei(_amt), amt_tocut, _amt_to_send)
    if(_amt_to_send > 0){
        const _amt_to_send_wei = await toWeb3.utils.toWei(_amt_to_send.toString(), 'ether')
        // Too many decimals issue fix 
        const _bigamt_amttosendwei = new BigNumber(_amt_to_send_wei).decimalPlaces(18);
        //const _bigamt_amttosendwei = await toWeb3.utils.toWei(_amt_to_send_wei, 'ether');
        console.log("feesCalculaterForCoins>>>>_amt_to_send,  _amt_to_send_wei, _bigamt_amttosendwei >>>>", _amt_to_send, _amt_to_send_wei, _bigamt_amttosendwei.toString() )
        const retobj = {
            "dodummytrans": false, 
            "amount_to_send": _bigamt_amttosendwei.toString()
        }
        return retobj;
    }else{
        const retobj = {
            "dodummytrans": true
        }
        console.log(">>>> retobj >>>>", retobj)
        return retobj;
    }
}



 async function getRequireAmount(){
    var Connection = mysql.createConnection(DB_CONFIG);
    try {         
        var query = util.promisify(Connection.query).bind(Connection);         
        var sel_query = "SELECT `tokenName`, `tokenPriceInUSD` FROM token_pricing_table where tokenName IN ('BNB', 'clientChainNativeCoin')";
        var data = await query(sel_query).catch(console.log);
        console.log(">>>> data >>>",  data);
        
        if(data){
            var obj = {};
            var bnb_current_rate = 0;
            var netz_current_rate = 0;
            data.forEach((myelement, index)=>{               
                if(myelement.tokenName === 'BNB'){
                    if(myelement.tokenPriceInUSD > 0){
                        bnb_current_rate = myelement.tokenPriceInUSD;
                    }
                } else if(myelement.tokenName === 'clientChainNativeCoin'){
                    if(myelement.tokenPriceInUSD > 0){
                        netz_current_rate = myelement.tokenPriceInUSD;
                    }
                } 
            })
            
            var current_rate = {
                'bnb_current_rate': bnb_current_rate,
                'netz_current_rate': netz_current_rate
            }
            
            obj = {'current_rate': current_rate}
            console.log(">>> obj >>", obj)
            return obj;
        }        
    } catch (e) {
        console.log("ERROR IN SQL GET PRICE FROM DB SEL QUERY >>", e);
    }finally{
       Connection.end();
    }
} 


//Cron running Every 1 min
var job = new CronJob('0 * * * * *', function() {
    // console.log("-------------------------------------");
    // console.log('Cron running, every 1 min');
    // console.log("-------------------------------------");

    checkLatestBlock();
    getTransactionsFromDB();
    
}, null, true, 'America/Los_Angeles');

job.start();