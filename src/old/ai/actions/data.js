
// Type 1: In-memory only datastore (no need to load the database)
import Datastore from 'nedb-promise'
import alasql from 'alasql'
// import safeEval from 'safe-eval'

import runSafe from '../../utils/run_safe'
import buildCode from '../../utils/build_code'

const requestData = ({query, context, tenant, schema}) => {

  return new Promise(async (resolve, reject)=>{

    try {

      // Takes an incoming explorer query and returns the list of results 
      let data = {};


      let query = args.query;

      let rows = [];

      // fetch subjects
      // - already limits to user's acl 
      let tmpSubjects = await fetchSubjects({}, context.tenant);

      console.log('Subjects:', tmpSubjects.length);

      let filteredSubjects = [];

      // Run pointer filter for subjects
      // - determine if subject should be included
      for(let tmpSubject of tmpSubjects){

        // console.log('for subject in tmpSubjects', subject);

        // get Permission Functions to run for this subject
        // - use createdByUserId (maybe switch to permissionUserId eventually?) 
        let permissionFunctions = await getPermissionFunctions({
          userId: tmpSubject.createdByUserId,
          tenant: context.tenant
        })

        // run Pointers read Function
        // - determine data to show for each pointer 
        //   - might display data differently for one user versus another! 
        //   - should be privacy aware too! (unique userId??) 
        let startingPointers = JSON.parse(JSON.stringify(tmpSubject.pointers || []));
        let pointersWithData = [];
        for (let pointerIdx in startingPointers){
          // iterating through pointers 
          let pointer = JSON.parse(JSON.stringify(startingPointers[pointerIdx]));

          // Build code from permissionFunctions
          // - should be put together using "blocks" or similar
          // - if any of the safeEval functions return invalid data, then stop processing the pointer 
          let builtCode = buildCode({
            slug: 'user:aggregate_subjects_read_data_for_pointer',
            props: {}, // no replacements needed
            permissionFunctions,
            defaultPermissionFunction: `
              (()=>{
                return pointer.data;
              })()
            `
          });
          // console.log('BUILT CODE(s):', builtCode);

          let pointerOk = true;
          for(let code of builtCode){
            if(!pointerOk){
              // console.log('Stopped for pointer, already failed pointerOk');
              continue;
            }
            // Set context
            let safeContext = {
              subject: tmpSubject,
              pointer,
              user: context.user, // user._id
            }
            let threadEventHandlers = {};
            // console.log('RunSafe1');
            let displayData = await runSafe({ code, safeContext, threadEventHandlers })
            // ignore/skips pointers where data is undefined (has to be SOMETHING, even if just "true") 
            if(displayData !== undefined){
              // todo: validate using js-schema (for pointerType!) 
              pointer.data = displayData; // updates by reference (re-used in next condition)! 
            } else {
              pointerOk = false;
            }
          }
          if(pointerOk){
            // console.info('---POINTER OK!---');
            pointersWithData.push(pointer);
          } else {
            // console.log('---POINTER NOT OK---');
          }

        }
        delete tmpSubject.pointers;
        tmpSubject.pointers = pointersWithData;
        // console.log("POINTERS LENGTH:", tmpSubject.pointers ? tmpSubject.pointers.length:null);

        // run Subject read function (defined by owner of data) 
        // - pointers have been updated, data can be searched if necessary (for "if X and Y pointer exist, etc.") 
        //   - in theory a pointer can also add an overlay to hide the subject as well? (pointer_subject_read_condition)
        //     - perfect for "use this type and it will ALWAYS be hidden" 
        // - current, only return Boolean if it is allowed to be visible 

        let builtCode_Subject_Read = buildCode({
          slug: 'user:aggregate_subjects_read_data_for_subject',
          props: {}, // no replacements needed
          permissionFunctions,
          defaultPermissionFunction: `
            (()=>{
              return subject;
            })()
          `
        });

        let subject = JSON.parse(JSON.stringify(tmpSubject));
        let subjectOk = true;
        for(let code of builtCode_Subject_Read){
          let safeContext_Subject_Read = {
            subject, // includes pointers w/ correct data now!
            user: context.user, // user._id
          }
          let threadEventHandlers = {};

          // console.log("POINTERS2 LENGTH:", subject.pointers ? subject.pointers.length:null);
          // console.log('RunSafe2'); //, code);
          // code = `(()=>{
          //   return subject;
          // })()`
          // console.log('CODE:', code);
          let updatedSubject = await runSafe({code, safeContext: safeContext_Subject_Read, threadEventHandlers})
          // let updatedSubject = safeEval(code, safeContext_Subject_Read);
          // console.log("POINTERS6 LENGTH:", updatedSubject.pointers ? updatedSubject.pointers.length:null);
          // ignore/skips subjects where data is undefined (has to be SOMETHING, even if just "true") 
          // - should have additional validation as well! (what if function breaks the object returned??) 
          // - might need to re-validate all the Pointers...(for now, just overwriting Pointers right afterwards, to prevent accidents...) (see note372)
          if(!updatedSubject){
            console.log('Skipping subject after aggregate_subjects_read_data_for_subject');
            subjectOk = false;
            break; // break out of this for...loop, skip the rest of code conditions, already failed 
          }
          subject = updatedSubject;
        }
        if(!subjectOk){
          continue;
        }

        // console.log("POINTERS5 LENGTH:", subject.pointers ? subject.pointers.length:null);

        // // note372
        // // - todo: should use js-schema test for Subject here
        // let subject = updatedSubject; // sh

        let subjectMapQuery = query.subjectMatchQuery;
        // let subjectMatchQueries = query.subjectMatchQueries; // NEW
        // console.log('subjectMapQuery', subjectMapQuery);

        // always populate the NeDB database (used later in column matching) 
        // Using mongo format
        let singleSubjectDb = new Datastore(); 
        let pointersDb = new Datastore(); 

        // insert single row, with pointers
        // - we'll run a query that returns the row, if all params pass 
        await singleSubjectDb.insert({
          subject: subject,
          pointers: subject.pointers
        });

        // insert pointers in separate db 
        // console.log('Pointers:', subject.pointers);
        if(subject.pointers){
          await pointersDb.insert(subject.pointers); // bulk insert array
        }

        let matchResult = [];

        // subjectQueryJS is built from the input...should be built server-side for easier replacements? 
        // - doesnt accept arbitrary 
        // - should be built from "blocks" or similar
        let subjectQueryJS = query.subjectMatchJS;


        // using safeEval to handle comparisons/matching 
        if(query.subjectMatchFormat == 'javascript'){
          // console.log("POINTERS3 LENGTH:", subject.pointers ? subject.pointers.length:null);
          let safeContext_subjectMatch = {
            subject, // has pointers included! 
            user: context.user, // user._id
            _: lodash,
            console: console,
            log: console.log
            // people I follow, etc. 
            // - should also be able to request out...
            // pointers are already included in the subject! 
          }
          try {
            let safeResult = await runSafe({ code: subjectQueryJS, safeContext: safeContext_subjectMatch, threadEventHandlers:{} })
            // let safeResult = safeEval(subjectQueryJS, safeContext);
            if(safeResult === true){
              // console.log('MATCH!!!!!');
              matchResult.push(true);
            } else {
              // Failed, idx of condition was provided
              // - or really anything could be provided (a user-specified function is used)...

              // THIS IS TOTALLY NORMAL TO NOT MATCH!!!
              console.log(`Subject did not match query (at condition: ${safeResult})`);//, subjectQueryJS);
            }
          }catch(err){
            // Failed parsing the user-provided "reduce" function! 
            console.error('Failed parsing user-provided reduce function1!', err);
            console.error(subjectQueryJS);
            return false;
          }
        }


        // console.log('Found pointer match?:', result);
        // console.log('Result length:', matchResult.length, subject.title);

        // thumbsup and tagged "awesome"
        if(matchResult.length){
          // return resolve(true);

          // console.log('Building columns');

          // Build the display/output for matching Subject 
          // - columnName = ()=>{}
          let columns = query.columns;

          let row = []

          for(let column of columns){

            switch(column.schema){
              case 'subject':
                // only dotNotation return 
                let name = column.dotRef.split('.').reduce((o,i)=>o[i], subject);
                row.push(name);
                break;

              case 'pointers':

                // this will iterate over ALL pointers
                // - expecting "conditions" to be a simple dotNotation-like search (mostly checking the schemaType and data) 
                let foundPointers = await pointersDb.find(column.conditions);

                // reduction to get whatever value was requested 
                // - array of items, single value, etc. 
                // - sandbox eval a reduce function 
                let pointerResult = await foundPointers.reduce(async (accumulator, current)=>{

                  const accum = await accumulator;

                  // let current_acc = await accumulator();

                  let safeContext_column_reduce = {
                    accumulator: accum,
                    current // pointer.xyz
                  }

                  try {
                    let a1 = await runSafe({ code: column.reduce, safeContext: safeContext_column_reduce, threadEventHandlers:{} })
                    return a1;
                    // return safeEval(column.reduce, safeContext);
                  }catch(err){
                    // Failed parsing the user-provided "reduce" function! 
                    console.error('Failed parsing user-provided reduce function2!');
                    return false;
                   }
                }, column.reduceInitialAccumulator); // pass in resolved accumultaor promise?? 

                // console.log('Pointers eval:', result);

                row.push(pointerResult);

                break;

            }
          }

          rows.push(row);

          // filteredSubjects.push({
          //   subject,

          // });


        }

        // } // /for queries

        data.rows = rows;

        // filteredSubjects is all relevant subjects and ALL pointers for each subject 

        // build the display/output for each matching Subject 



        // await query.filter.


      }

      // Going to allow essentially arbitrary queries, so need to have good measurements of resources used per-query, and ability to kill queries automatically when too many resources are consumed
      // - pass along a "queryRootId" to recursive requests
      // - use a global/shared/remote counter for tracking time/resources of each request instance, dont initiate a new request until the counter is checked! 


      // Fetch Subjects
      // - map/filter:
      //   - (return values we care about for filtering, value, we care about for dataAggregation/display) 
      //     - each piece of content: { filter:true|false (passed filter),  }
      // - reduce:
      //   -  remove values that have an empty "filter" result


      
      console.log('Resolving data', data);

      resolve({
        data
      });
    } catch(err){
      console.error('Failed explorer query:', err);
      reject(err);
    }

  })
}


const fetchSubjects = (filterOpts, tenant) => {

  return new Promise(async (resolve, reject) => {

    const { schema } = await app.graphql.getTenantSchema(tenant);

    let query_Subjects = `
      query (
        $filter: FilterFindManySubjectsInput
      ) {
        viewer {
          subject {
            many (
              filter: $filter
            ) {
              _id
              createdByUserId
              createdByUser {
                _id
              }
              title
              uri
              public
              pointers {
                _id
                subjectId
                type
                data
                active
                createdAt
              }
              createdAt
            }
          }
        }
      }
    `

    let result = await app.graphql.graphql({
      schema: schema,
      source: query_Subjects,
      contextValue: {
        admin: true,
        tenant: tenant,
        tenantSchema: schema,
        user: null
      },
      variableValues: {
        filter: filterOpts
      }
    })

    if(result.data && result.data.viewer){
      // console.log('RESULT from fetchSubjects is subject:', JSON.stringify(result,null,2));
      resolve(result.data.viewer.subject.many);
    } else {
      console.error('Failed fetchSubjects in subject.query!', JSON.stringify(result,null,2));
      reject(result);
    }

  })

}


const getPermissionFunctions = ({userId, tenant}) => {

  return new Promise(async (resolve, reject) => {

    let filterOpts = {
      active: true
    }
    let permissions;
    try {
      permissions = await fetchPermissionFunctions({filterOpts, tenant})
    }catch(err){
      console.error('FAILED fetching permissions',err);
      return resolve([]);
    }

    resolve(permissions);

  });

}


const fetchPermissionFunctions = ({filterOpts, tenant}) => {

  return new Promise(async (resolve, reject) => {

    const { schema } = await app.graphql.getTenantSchema(tenant);

    let query_Permissions = `
      query (
        $filter: FilterFindManyPermissionFunctionsInput
      ) {
        viewer {
          permissionFunction {
            many (
              filter: $filter
            ) {
              _id
              userId
              user {
                _id
              }
              slug
              template
              props
            }
          }
        }
      }
    `

    let result = await app.graphql.graphql({
      schema: schema,
      source: query_Permissions,
      contextValue: {
        admin: true,
        tenant: tenant,
        tenantSchema: schema,
        user: null
      },
      variableValues: {
        filter: filterOpts
      }
    })

    if(result.data && result.data.viewer){
      // console.log('RESULT from fetchSubjects is subject:', JSON.stringify(result,null,2));
      resolve(result.data.viewer.permissionFunction.many);
    } else {
      console.error('Failed fetchSubjects in subject.query!', JSON.stringify(result,null,2));
      reject(result);
    }

  })

}



export default requestData