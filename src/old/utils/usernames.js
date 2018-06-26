
import datastore from 'nedb-promise'
import request from 'request-promise-native'

const crypto = require('crypto');
const multihash = require('multihashes')
var SHA256 = require('js-sha256').sha256;

var keypress = require('keypress');

var StellarSdk = require('stellar-sdk');

const Papa = require('papaparse');

// var AsyncLock = require('async-lock');
// var lock = new AsyncLock();


var Queue = require('better-queue');
var cq = require('concurrent-queue')


// Parse CSV string


var stellarServer;
console.log('STELLAR_NETWORK:', process.env.STELLAR_NETWORK);
if(!process.env.STELLAR_SEED || !process.env.STELLAR_SEED.length){
  console.log('Missing STELLAR_SEED (and should be public network!)');
  process.exit();
}
switch(process.env.STELLAR_NETWORK){
  case 'public':
    StellarSdk.Network.usePublicNetwork();
    stellarServer = new StellarSdk.Server('https://horizon.stellar.org');
    break;
  case 'test':
  default:
    throw `
    ------------------------------------------------------------
    WILL NOT WORK IN TEST! Set .env to use public seeds
    ------------------------------------------------------------`
    StellarSdk.Network.useTestNetwork();
    stellarServer = new StellarSdk.Server('https://horizon-testnet.stellar.org');

    // console.error('Missing process.env.STELLAR_NETWORK');
    // throw "Missing process.env.STELLAR_NETWORK"
    break;
}


var pairSource = StellarSdk.Keypair.fromSecret(process.env.STELLAR_SEED);
let sourceAccount;


let continueProcessing = true; // disable with a keypress

// make `process.stdin` begin emitting "keypress" events 
keypress(process.stdin);
 
// listen for the "keypress" event 
process.stdin.on('keypress', function (ch, key) {

  console.log('Soft Exit initiated - waiting for transaction to finish');
  continueProcessing = false;

  if (key && key.ctrl && key.name == 'c') {
    console.log('Hard Exit');
    process.exit();
  }

});
process.stdin.setRawMode(true);
process.stdin.resume();


let db; // will be db of usernames

async function start(){

  // Load source account
  try {
    sourceAccount = await stellarServer.loadAccount(pairSource.publicKey())
  }catch(err){
    // problem with account 
    console.error('FAILED source account!');
    return false;
  }
  // Get source balance 
  let balance = 0;
  if(sourceAccount){
    balance = sourceAccount.balances[0].balance;

    console.log('Balance', balance);
    balance = parseFloat(balance);

  }

  // Load local DB
  console.log('Load nedb');
  db = new datastore({ 
    filename: './registered_usernames.json', 
    autoload: true 
  });

  // Load remote list of usernames 
  console.log('Load remote');
  let csvResult = await request.get({
    url: process.env.USERNAME_SHEET_URL, //'http://docker.for.mac.localhost:7011/graphql',
    // encoding: 'text/plain'
  })

  // console.log('csvResult', typeof csvResult, csvResult);
  let data = Papa.parse(csvResult);

  let dbCount = await db.count({});
  let remaining = data.data.length - dbCount;
  let balanceAfter = (balance - (remaining*(3.1)));

  console.log('Total Usernames:', data.data.length); //, csvResult);
  console.log('In Local DB:', dbCount);
  console.log('Remaining:',  remaining);
  console.log('Balance enough?', balanceAfter ? true:false, balanceAfter );

  if(!continueProcessing){
    console.log('--Stopped before doing anything--');
    process.exit();
    return false;
  }


  let num = 0;
  function processUsername(username){
    return new Promise(async(resolve,reject)=>{
      num++
      if(!continueProcessing){
        console.log(num+'.', 'Soft Exit (before next transaction starts)');
        return resolve(username);
        // continue;
        // process.exit();
      }

      username = username[0].toString().trim();
      if(!username.length){
        console.log('  Missing length (end of list)');
        return;
      }
      if(username != username.normalize().toLowerCase()){
        // console.error('      Username NOT Normalized! (still claiming):', username);
      }

      username = username.normalize().toLowerCase();

      // Convert to seed
      let pkTargetSeed = crypto.createHash('sha256').update(username).digest(); //returns a buffer
      var pairTarget = StellarSdk.Keypair.fromRawEd25519Seed(pkTargetSeed);

       

      // Normalized username
      console.log(num+'.', username, '-', pairTarget.secret());
      // return resolve(username);
      // continue; // for just printing out username list (processed from csv) 

      // Already used in db? 
      let doc = await db.findOne({ username });
      if(doc){
        // getting seed
        console.log('    Already internal');
        if(doc.failed){
          console.log('  - FAILED');
        }
        console.log(' ','-', doc.seed);
        console.log(' ','-', doc.publicKey);
        return resolve(username);
        // continue;
      }

      // Claim and get public key
      let publicKey = await claimUsername(username);
      if(!publicKey){
        // throw "Failed returning publicKey for username"
        console.error('Failed claimUsername badly, reloading sourceAccount (should retry and work after a few usernames');

        try {
          sourceAccount = await stellarServer.loadAccount(pairSource.publicKey())
        }catch(err){
          // problem with account 
          console.error('FAILED source account!');
          return false;
        }

        // will process on next go-around
        // - NOT writing to db here 
        return resolve(username);
        // process.exit();
        // return false;
      }
      if(publicKey == 'failed'){
        // failed registering, store the reason
        
        let failedDoc = await db.insert([{
          username,
          seed: pairTarget.secret(), // it is OK to have this public (derived from username!)
          failed: true,
          createdAt: new Date().getTime()
        }]);
      } else {
        let newDoc = await db.insert([{
          username,
          seed: pairTarget.secret(), // it is OK to have this public (derived from username!)
          publicKey: pairTarget.publicKey(), // just for easy lookup, derived from username anyways 
          createdAt: new Date().getTime()
        }]);
      }

      // if(!continueProcessing){
      //   console.log('Soft Exit (waited for transaction to finish)');
      //   process.exit();
      // }

      return resolve(username);

    });

  }

  // ONLY 1 works at the moment, because the sequence number doesnt get increased/submitted correctly (1/2 error)
  var queue = cq().limit({ concurrency: 3 }).process(processUsername);

  // console.log('csv Result:', data.data);
  for(let username of data.data){
    // console.log('queue');
    queue(username)
  }

  console.log('--Completed Adding--');
  // process.exit();
  queue.drained(()=>{
    console.log('--Complete2--');
    process.exit();
  })


}

console.log('Starting processing in 5 seconds. Press any key to stop (Soft Exit)');
setTimeout(()=>{
  start();
},5000);



async function claimUsername(username){

  // Add to stellar
  // console.log('   1/7 - Loading seeds');
  let pkTargetSeed = crypto.createHash('sha256').update(username).digest(); //returns a buffer
  var pairTarget = StellarSdk.Keypair.fromRawEd25519Seed(pkTargetSeed);

  // console.log('pkSource Seed:', pairSource.secret());
  // console.log('pkTarget Seed:', pairTarget.secret());



  // Load Target account
  console.log('   1/4 - Loading Username Account (should not exist)');
  let targetAccount = await stellarServer
  .loadAccount(pairTarget.publicKey())
  .catch(()=>{
    return false;
  })

  if(targetAccount){
    // target account exists
    // - should already be owned by me 
    console.error(' FAIL - Target account exists!');
    return 'failed';

    // let sourceIsSigner = lodash.find(targetAccount.signers,{public_key: pairSource.publicKey()});
    // if(sourceIsSigner){
    //   // already claimed, but I'm the owner 
    //   // - multi-sig is already setup 

    //   // all good with this targetAccount! 
    //   console.log('targetAccount all set with multisig for updating!');
    //   return targetAccount;

    // } else {
    //   // exists, and I'm not the owner 
    //   // - could also check to see if it is unprotected? (unlikely, maybe on testnet only) 
    //   // - could check the "data.willSellFor" field to see if it is for sale? 
    //   console.error('Username exists and you are not the owner'); // TODO: return who the owner is 
    //   return false;

    // }


  }


  // identity Account doesn't exist 
  // - register account (and setup multisig) if I have a balance in my sourceAccount 


  // // Load source account
  // let sourceAccount;
  // try {
  //   sourceAccount = await stellarServer.loadAccount(pairSource.publicKey())
  // }catch(err){
  //   // problem with account 
  //   console.error('FAILED source account!');
  //   return false;
  // }

  // // get source balance 
  // if(sourceAccount){
  //   let balance = 0;
  //   balance = sourceAccount.balances[0].balance;

  //   console.log('   3/7 - Balance:', balance);

  //   balance = parseInt(balance,10);
  //   if(balance < 10){
  //     console.error('Insufficient balance in account for creation:', sourceAccount.balances[0].balance);
  //     return false;
  //   }
  // }

  // Transactions: 
  // - create account 
  // - multi-sig setup (setOptions x2) 
  // - manageData (add blank data) 
  console.log('   2/4 - Creating Account');
  let transaction = new StellarSdk.TransactionBuilder(sourceAccount)
  .addOperation(StellarSdk.Operation.createAccount({
    destination: pairTarget.publicKey(),
    startingBalance: "3.0"
    // source: pair
  }))
  .build();

  // Sign the transaction to prove you are actually the person sending it.
  transaction.sign(pairSource); // sourceKeys (for createAccount)

  // send to stellar network
  let stellarResult = await stellarServer.submitTransaction(transaction)
  .then(function(result) {
    // console.log('   3/5 - Stellar Success createAccount', pairTarget.publicKey()); // , result); 
    return result;
  })
  .catch(function(error) {
    console.error('Stellar Something went wrong (creating account)!'); //, error);
    try {
      console.error(JSON.stringify(error.data.extras.result_codes),null,2);
    }catch(err){
      console.error(error);
    }

    // If the result is unknown (no response body, timeout etc.) we simply resubmit
    // already built transaction:
    // server.submitTransaction(transaction);
    return null;
  });

  // console.log('stellarResult', stellarResult);
  if(!stellarResult){
    console.error('Failed creating account');
    return false;
  }

  // reload the account 
  targetAccount = await stellarServer.loadAccount(pairTarget.publicKey())

  // Add multisig 
  console.log('   3/4 - multisig and data'); //, targetAccount);

  // 2nd round of transactions 
  // - multi-sig and manageData 
  let transaction2 = new StellarSdk.TransactionBuilder(targetAccount)

  .addOperation(StellarSdk.Operation.manageData({
    name: 'aaaaaaaa',
    value: '1234567890123456789012345678901234567890'
  }))
  .addOperation(StellarSdk.Operation.setOptions({
    signer: {
      ed25519PublicKey: pairSource.publicKey(),
      weight: 1
    }
  }))
  .addOperation(StellarSdk.Operation.setOptions({
    masterWeight: 1, // set master key weight (should really be nothing, and controlled by this other key?) 
    lowThreshold: 2, // trustlines
    medThreshold: 2, // manageData
    highThreshold: 2  // setOptions (multi-sig)
  }))
  .build();

  // Sign the transaction to prove you are actually the person sending it.
  transaction2.sign(pairTarget); // sourceKeys
  // transaction2.sign(pairSource); // sourceKeys // NOT needed until after having been added

  // send to stellar network
  let stellarResult2 = await stellarServer.submitTransaction(transaction2)
  .then(function(result) {
    // console.log('   4/4 - Stellar MultiSig Setup Success!'); // Results:', result);
    return result
  })
  .catch(function(error) {
    console.error('Stellar Something went wrong (failed multisig and manageData)!');
    try {
      console.error(JSON.stringify(error.data.extras.result_codes),null,2);
    }catch(err){
      console.error(error);
    }
    // If the result is unknown (no response body, timeout etc.) we simply resubmit
    // already built transaction:
    // server.submitTransaction(transaction);
    return null;
  });

  // console.log('Multisig result:', stellarResult2);

  if(!stellarResult2){
    console.error('Failed multisig setup');
    return false;
  }

  // return final targetAccount (with signers, etc.) 
  console.log('   4/4 - done with:', username, pairTarget.publicKey());
  targetAccount = await stellarServer.loadAccount(pairTarget.publicKey())

  return pairTarget.publicKey();


}




// Parsing Domains 

// let _ = require('lodash');
// let URL = require('url');
// let parseDomain = require('parse-domain');

// let domains = `
// ...
// dictionary.com/
// `.split('\n');


// console.log('domains:', domains.length);

// domains = _.uniq(_.compact(domains.map(d=>{
//   if(!d.length){
//     return false;
//   }
//   let u = parseDomain(d);
//   // console.log(u.domain, d);
//   return u.domain;
// })));


// console.log('-------');
// console.log('domains compact', domains.length);
// console.log(domains.join("\n"));
// console.log('domains compact', domains.length);

