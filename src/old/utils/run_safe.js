
import ThreadedSafeRun from './threaded_safe_run'
import lodash from 'lodash'

const runSafe = ({code, safeContext, requires, threadEventHandlers, requestId, mainIpcId, nodeId, timeout}) => {
  return new Promise(async (resolve, reject)=>{

    // threadEventHandlers make it easy to handle onGasExceeded, etc.
    // - handles every tick? 
    // - MUST return a single value 

    safeContext = safeContext || {};
    // safeContext._ = lodash;
    safeContext.console = console;

    try {
      // console.log('Run ThreadedSafeRun', code);
      let safeResult = await ThreadedSafeRun(code, safeContext, requires, threadEventHandlers, requestId, mainIpcId, nodeId, timeout);
      // console.log('Resolved ThreadedSafeRun', safeResult);
      resolve(safeResult);
    }catch(err){
      // err may be the result of the threadEventHandlers throwing (onGasExceeded, onTimeToFetchExceeded, onStorageSpaceExceeded)! 
      // - could have killed the fetch
      // Failed parsing the user-provided "reduce" function! 
      console.error('Failed parsing user-provided reduce function3!', err);
      console.error(code);
      resolve(undefined);
    }

  });

}


export default runSafe;