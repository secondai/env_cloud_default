import mongoose from 'mongoose';
// mongoose.set('debug', true)

import {graphql} from 'graphql'

import * as utils from './utils'

mongoose.Promise = global.Promise;

import composeWithMongoose from 'graphql-compose-mongoose';
import composeWithDataLoader from 'graphql-compose-dataloader';
import { GQC } from 'graphql-compose';

const dbConnectionString = process.env.MONGODB_URI || ((app.argv.MONGODB_CONNECTION ||  process.env.MONGODB_CONNECTION) + app.mongoDbName);
console.log('dbConnectionString:', dbConnectionString);
mongoose.connect(dbConnectionString, {
  useMongoClient: true,
  autoReconnect: true
}); // points to a database! 

const NodeSchema = new mongoose.Schema({
  // nodeId can be empty! 
  // - this is how things are iterated over (node->list of nodes)
  nodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nodes',
    index: true
  },

  type: String, // txId, holds schema 
  data: mongoose.Schema.Types.Mixed,
  // hash: String, // hash of data as buffer 

  active: {
    type: Boolean,
    default: true,
  },

  createdAt: {
    type: Number,
    index: true
  },
  updatedAt: {
    type: Number,
    index: true
  }
});
const NodeModel = mongoose.model('Nodes', NodeSchema);
const NodeTC = composeWithMongoose(NodeModel, {}); // composeWithDataLoader(, {cacheExpiration: 700});

// Relationships
NodeTC.addRelation(
  'parent',
  {
    resolver: () => NodeTC.getResolver('findOne'),
    skip: source => !source.nodeId,
    prepareArgs: {
      filter: (source) => ({
        active: true,
        nodeId: source.nodeId ? source.nodeId : '507f1f77bcf86cd799439011' // how to skip, i'm usng a shitty random objectId ??
        // _operators: {
        //   nodeId: {
        //     in: [source.nodeId] // easy way of providing non-ObjecId here 
        //   }
        // }
      })
    },
    projection: { _id: 1 }, // point fields in source object, which should be fetched from DB
  }
);

// Relationships
NodeTC.addRelation(
  'nodes',
  {
    resolver: () => NodeTC.getResolver('findMany'),
    prepareArgs: {
      filter: (source) => ({
        active: true,
        _operators: {
          nodeId: {
            in: [source._id] // easy way of providing non-ObjecId here 
          }
        }
      })
    },
    projection: { _id: 1 }, // point fields in source object, which should be fetched from DB
  }
);


const HistorySchema = new mongoose.Schema({

  type: String, // code, data loaded, action taken, etc. 
  logLevel: String, // log, info, error, debug, etc.
  data: mongoose.Schema.Types.Mixed,

  createdAt: {
    type: Number,
    index: true
  },
  updatedAt: {
    type: Number,
    index: true
  }
});
const HistoryModel = mongoose.model('Historys', HistorySchema);
const HistoryTC = composeWithMongoose(HistoryModel, {});


// STEP 3: CREATE CRAZY GraphQL SCHEMA WITH ALL CRUD Node OPERATIONS
// via graphql-compose it will be much much easier, with less typing
GQC.rootQuery().addFields({
  nodeById: NodeTC.getResolver('findById'),
  nodeByIds: NodeTC.getResolver('findByIds'),
  nodeOne: NodeTC.getResolver('findOne'),
  nodeMany: NodeTC.getResolver('findMany'),
  nodeCount: NodeTC.getResolver('count'),
  nodeConnection: NodeTC.getResolver('connection'),
  nodePagination: NodeTC.getResolver('pagination'),

  historyById: HistoryTC.getResolver('findById'),
  historyByIds: HistoryTC.getResolver('findByIds'),
  historyOne: HistoryTC.getResolver('findOne'),
  historyMany: HistoryTC.getResolver('findMany'),
  historyCount: HistoryTC.getResolver('count'),
  historyConnection: HistoryTC.getResolver('connection'),
  historyPagination: HistoryTC.getResolver('pagination'),
});

GQC.rootMutation().addFields({
  nodeCreate: NodeTC.getResolver('createOne'),
  nodeUpdateById: NodeTC.getResolver('updateById'),
  nodeUpdateOne: NodeTC.getResolver('updateOne'),
  nodeUpdateMany: NodeTC.getResolver('updateMany'),
  nodeRemoveById: NodeTC.getResolver('removeById'),
  nodeRemoveOne: NodeTC.getResolver('removeOne'),
  nodeRemoveMany: NodeTC.getResolver('removeMany'),

  historyCreate: HistoryTC.getResolver('createOne'),
  historyUpdateById: HistoryTC.getResolver('updateById'),
  historyUpdateOne: HistoryTC.getResolver('updateOne'),
  historyUpdateMany: HistoryTC.getResolver('updateMany'),
  historyRemoveById: HistoryTC.getResolver('removeById'),
  historyRemoveOne: HistoryTC.getResolver('removeOne'),
  historyRemoveMany: HistoryTC.getResolver('removeMany'),
});

const schema = GQC.buildSchema();




const fetchNodes = (filterOpts) => {

  return new Promise(async (resolve, reject) => {

    // by default, forces active:false 
    filterOpts = Object.assign({},filterOpts,{
      active: true
    });

    let query_Nodes = `
      query (
        $filter: FilterFindManyNodesInput
      ) {
        nodeMany (
           filter: $filter
           limit: 1000000
        ) {
          _id
          type
          data
          createdAt
          updatedAt
          nodes {
            _id
            nodeId
            type
            data
            createdAt
            updatedAt
            nodes {
              _id
              nodeId
              type
              data
              createdAt
              updatedAt
              nodes {
                _id
                nodeId
                type
                data
                createdAt
                updatedAt
                nodes {
                  _id
                  nodeId
                  type
                  data
                  createdAt
                  updatedAt
                  nodes {
                    _id
                    nodeId
                    type
                    data
                    createdAt
                    updatedAt
                    nodes {
                      _id
                      nodeId
                      type
                      data
                      createdAt
                      updatedAt
                    }
                  }
                }
              }
            }
          }
          nodeId
          parent {
            _id
            type
            data
            createdAt
            updatedAt
            nodeId
            nodes {
              _id
              type
              data
              createdAt
              updatedAt
            }
          }
        }
      }
    `

    let result = await app.graphql.graphql({
      schema: app.graphql.schema,
      source: query_Nodes,
      contextValue: {
        admin: true,
        user: null
      },
      variableValues: {
        filter: filterOpts
      }
    })

    if(result.data){
      // console.log('RESULT from fetchNodes is subject:', JSON.stringify(result,null,2));
      console.log('Filter for fetchNodes:', filterOpts, result.data.nodeMany.length);
      resolve(result.data.nodeMany);
    } else {
      console.error('Failed fetchNodes in node.query!', JSON.stringify(result,null,2));
      reject(result);
    }

  })

}

const fetchNodesSimple = (filterOpts) => {

  return new Promise(async (resolve, reject) => {

    // by default, forces active:false 
    filterOpts = Object.assign({},filterOpts,{
      active: true
    });

    let query_Nodes = `
      query (
        $filter: FilterFindManyNodesInput
      ) {
        nodeMany (
           filter: $filter
           limit: 1000000
        ) {
          _id
          nodeId
          type
          data
          active
          createdAt
          updatedAt
        }
      }
    `

    let result = await app.graphql.graphql({
      schema: app.graphql.schema,
      source: query_Nodes,
      contextValue: {
        admin: true,
        user: null
      },
      variableValues: {
        filter: filterOpts
      }
    })

    if(result.data){
      // console.log('RESULT from fetchNodes is subject:', JSON.stringify(result,null,2));
      console.log('Filter for fetchNodesSimple:', filterOpts, result.data.nodeMany.length);
      resolve(result.data.nodeMany);
    } else {
      console.error('Failed fetchNodesSimple in node.query!', JSON.stringify(result,null,2));
      reject(result);
    }

  })

}


const findNode = (filterOpts) => {

  return new Promise(async (resolve, reject) => {

    // by default, forces active:false 
    filterOpts = Object.assign({},filterOpts,{
      active: true
    });

    let query_Nodes = `
      query (
        $filter: FilterFindOneNodesInput
      ) {
        nodeOne (
           filter: $filter
        ) {
          _id
          type
          data
          nodes {
            _id
            type
            data
            nodes {
              _id
              type
              data
              nodes {
                _id
                type
                data
                nodes {
                  _id
                  type
                  data
                }
              }
            }
          }
          nodeId
          parent {
            _id
            type
            data
            nodeId
            nodes {
              _id
              type
              data
            }
          }
        }
      }
    `

    let result = await app.graphql.graphql({
      schema: app.graphql.schema,
      source: query_Nodes,
      contextValue: {
        admin: true,
        user: null
      },
      variableValues: {
        filter: filterOpts
      }
    })

    if(result.data){
      // console.log('RESULT from fetchNodes is subject:', JSON.stringify(result,null,2));
      console.log('Filter for findNode:', filterOpts, result.data.nodeOne.length);
      resolve(result.data.nodeOne);
    } else {
      console.error('Failed findNode in node.query!', JSON.stringify(result,null,2));
      reject(result);
    }

  })

}



const newNode = (record) => {

  return new Promise(async (resolve, reject) => {

    if(!record){
      console.error('Missing newNode record!');
      return reject('Missing newNode record');
    }
    
    record = Object.assign({},record);

    record = {
      // _id: record.hasOwnProperty('_id') ? record._id : undefined, // CANNOT force the id!!!!
      nodeId: record.hasOwnProperty('nodeId') ? record.nodeId : undefined,
      type: record.hasOwnProperty('type') ? record.type : undefined,
      data: record.hasOwnProperty('data') ? record.data : undefined,
      active: true,
      createdAt: (new Date()).getTime() //record.hasOwnProperty('createdAt') ? record.createdAt : undefined,
      // updatedAt: record.hasOwnProperty('updatedAt') ? record.updatedAt : undefined,
    }
    // console.log('newNode:', record);
    // Object.assign({},record,{
    //   active: true,
    //   createdAt: (new Date()).getTime()
    // });

    let mutate_newNode = `
      mutation (
        $record: CreateOneNodesInput!
      ) {
        nodeCreate (
           record: $record
        ) {
          recordId
          record {
            _id
            nodeId
            type
            data
            createdAt
            updatedAt
          }
        }
      }
    `

    let result = await app.graphql.graphql({
      schema: app.graphql.schema,
      source: mutate_newNode,
      contextValue: {
        admin: true,
        user: null
      },
      variableValues: {
        record
      }
    })

    if(result.data){
      // console.log('RESULT from fetchNodes is subject:', JSON.stringify(result,null,2));
      resolve(result.data.nodeCreate.record);
    } else {
      console.error('Failed newNode in node.query!', JSON.stringify(result,null,2));
      reject(result);
    }

  })

}

const updateNode = (record) => {

  return new Promise(async (resolve, reject) => {

    let mutate_updateNode = `
      mutation (
        $record: UpdateByIdNodesInput!
      ) {
        nodeUpdateById (
           record: $record
        ) {
          recordId
          record {
            _id
            nodeId
            type
            data
            createdAt
            updatedAt
          }
        }
      }
    `

    let result = await app.graphql.graphql({
      schema: app.graphql.schema,
      source: mutate_updateNode,
      contextValue: {
        admin: true,
        user: null
      },
      variableValues: {
        record
      }
    })

    if(result.data){
      // console.log('RESULT from fetchNodes is subject:', JSON.stringify(result,null,2));
      resolve(result.data.nodeUpdateById.record);
    } else {
      console.error('Failed nodeUpdateById in node.query!', JSON.stringify(result,null,2));
      reject(result);
    }

  })

}

const updateAllNodes = (filter, record) => {

  return new Promise(async (resolve, reject) => {

    let mutate_updateNode = `
      mutation (
        $filter: FilterUpdateManyNodesInput
        $record: UpdateManyNodesInput!
      ) {
        nodeUpdateMany (
          filter: $filter
          record: $record
        ) {
          numAffected
        }
      }
    `

    let result = await app.graphql.graphql({
      schema: app.graphql.schema,
      source: mutate_updateNode,
      contextValue: {
        admin: true,
        user: null
      },
      variableValues: {
        record,
        filter
      }
    })

    if(result.data){
      // console.log('RESULT from fetchNodes is subject:', JSON.stringify(result,null,2));
      console.log('Upated Affected:', result.data.nodeUpdateMany.numAffected );
      resolve(result.data.nodeUpdateMany.numAffected);
    } else {
      console.error('Failed nodeUpdateMany in node.query!', JSON.stringify(result,null,2));
      reject(result);
    }

  })

}

const newHistory = (record) => {

  return new Promise(async (resolve, reject) => {

    let mutate_newHistory = `
      mutation (
        $record: CreateOneHistorysInput!
      ) {
        historyCreate (
           record: $record
        ) {
          recordId
          record {
            _id
            type
            logLevel
            data
            createdAt
            updatedAt
          }
        }
      }
    `

    record.createdAt = (new Date()).getTime();

    let result = await app.graphql.graphql({
      schema: app.graphql.schema,
      source: mutate_newHistory,
      contextValue: {
        admin: true,
        user: null
      },
      variableValues: {
        record
      }
    })

    if(result.data){
      // console.log('RESULT from fetchHistorys is subject:', JSON.stringify(result,null,2));
      resolve(result.data.historyCreate.record);
    } else {
      console.error('Failed newHistory in history.query!', JSON.stringify(result,null,2));
      reject(result);
    }

  })

}

export default {
  schema,
  graphql,
  utils,
  fetchNodes,
  fetchNodesSimple,
  newHistory,
  newNode,
  findNode,
  updateNode,
  updateAllNodes
}
