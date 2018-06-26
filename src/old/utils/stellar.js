
// const multihash = require('multihashes')


// var StellarSdk = require('stellar-sdk');

// // create a completely new and unique pair of keys
// var crypto = require('crypto');

// let pkSeed = crypto.createHash('sha256').update('blah blah this is my custom account').digest(); //returns a buffer
// var pair = StellarSdk.Keypair.fromRawEd25519Seed(pkSeed);

// let stellarKeys = {
//   private: pair.secret(),
//   public: pair.publicKey()
// }
// console.log('stellarKeys',stellarKeys);


// // // Send request to testnet-bot to create sample lumens 
// // var request2 = require('request');
// // request2.get({
// //   url: 'https://horizon-testnet.stellar.org/friendbot',
// //   qs: { addr: stellarKeys.public },
// //   json: true
// // }, function(error, response, body) {
// //   if (error || response.statusCode !== 200) {
// //     console.error('ERROR!', error || body);
// //   }
// //   else {
// //     console.log('SUCCESS! You have a new account :)\n', body);
// //   }
// // });


// StellarSdk.Network.useTestNetwork();
// var stellarServer = new StellarSdk.Server('https://horizon-testnet.stellar.org');

// // // the JS SDK uses promises for most actions, such as retrieving an account
// // stellarServer.loadAccount(stellarKeys.public)
// // .catch(StellarSdk.NotFoundError, function (error) {
// //   throw new Error('The destination account does not exist!');
// // })
// // .then(function(account) {
// //   console.log('Balances for account: ' + stellarKeys.public);
// //   account.balances.forEach(function(balance) {
// //     console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
// //   });
// // });


// // // Run a transaction FROM the target (needs to be sent money, then send money out?) 
// let pkTargetSeed = crypto.createHash('sha256').update('testing103').digest(); //returns a buffer
// var pairTarget = StellarSdk.Keypair.fromRawEd25519Seed(pkTargetSeed);

// let stellarKeysTarget = {
//   private: pairTarget.secret(),
//   public: pairTarget.publicKey()
// }

// console.log('stellarKeysTarget',stellarKeysTarget);

// // get transactions for Target

// var destinationId = stellarKeysTarget.public;

// // Transaction will hold a built transaction we can resubmit if the result is unknown.
// var transaction;


// // // the JS SDK uses promises for most actions, such as retrieving an account
// // stellarServer.loadAccount(destinationId)
// // .catch(StellarSdk.NotFoundError, function (error) {
// //   console.error('The destination account does not exist! (expected when creating new identity!)');
// // })
// // .then(function(account) {
// //   console.log('Balances for account: ' + stellarKeys.public);
// //   account.balances.forEach(function(balance) {
// //     console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
// //   });
// // });


// // First, check to make sure that the destination account exists.

// const ipfsHashTo32ByteBuffer = function(ipfsHash) {
//   let buf = multihash.fromB58String(ipfsHash)
//   let digest = multihash.decode(buf).digest
//   return digest;
// }

// let b32 = ipfsHashTo32ByteBuffer('Qmf4437bCR2cwwpPh6dChwMSe5wuLJz32caf2aZP3xxtNR');

// let tmp1 = new Buffer('+FYuRGmZIz/e/T0UungCrIbiMCwukMFzPJWAHzsLH84=','base64'); //.toString('hex');
// console.log('Qmf4437bCR2cwwpPh6dChwMSe5wuLJz32caf2aZP3xxtNR');
// let digest1 = multihash.encode(tmp1, 'sha2-256');
// let hash1 = multihash.toB58String(digest1);
// console.log(hash1);

// // let b32 = crypto.createHash('sha256').update('test').digest(); //returns a buffer
// // console.log('b32:', b32.toString('hex'));
// // let str2 = new Buffer('n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg=','base64').toString('hex')
// // console.log('same?:', str2); //bs58.decode(str2).toString('hex'));

// // stellarServer.loadAccount(stellarKeys.public)
// //   // // If the account is not found, surface a nicer error message for logging.
// //   // .catch(StellarSdk.NotFoundError, function (error) {
// //   //   throw new Error('The destination account does not exist!');
// //   // })
// //   // If there was no error, load up-to-date information on your account.
// //   // .then(function() {
// //   //   return stellarServer.loadAccount(stellarKeys.public);
// //   // })
// //   .then(function(sourceAccount) {
// //     // Start building the transaction.
// //     transaction = new StellarSdk.TransactionBuilder(sourceAccount)
      
// //       .addOperation(StellarSdk.Operation.createAccount({
// //         destination: pairTarget.publicKey(),
// //         startingBalance: "10"
// //         // source: pair
// //       }))

// //       // A memo allows you to add your own metadata to a transaction. It's
// //       // optional and does not affect how Stellar treats the transaction.
// //       // .addMemo(StellarSdk.Memo.text('Qmf4437bCR2cwwpPh6dChwMSe5wuLJz32caf2aZP3xxtNR'))
// //       .addMemo(StellarSdk.Memo.hash(b32))
// //       .build();
// //     // Sign the transaction to prove you are actually the person sending it.
// //     transaction.sign(pair); // sourceKeys
// //     // And finally, send it off to Stellar!
// //     return stellarServer.submitTransaction(transaction);
// //   })
// //   .then(function(result) {
// //     console.log('Stellar Success! Results:', result);
// //   })
// //   .catch(function(error) {
// //     console.error('Stellar Something went wrong!', error);
// //     // If the result is unknown (no response body, timeout etc.) we simply resubmit
// //     // already built transaction:
// //     // server.submitTransaction(transaction);
// //   });




// // // Get the 1st (on page 1 only!) transaction where the memo is an ipfs hash 
// // stellarServer.transactions()
// //   .forAccount(destinationId)
// //   .call()
// //   .then(function (page) {
// //     console.log('Page 1: ', page.records.length);
// //     console.log(JSON.stringify(page.records,null,2));
// //     // console.log(page.records.length);
// //   })


