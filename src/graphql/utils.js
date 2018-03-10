import _ from 'lodash'

const restrictToPublicOrMine = () => {
  return requireFilterTags('publicOrMine');
}

const requireFilterTags = (tags) => {

  tags = Array.isArray(tags) ? tags: [tags];

  return next => (rp) => {
    // append to filter
    let filter = rp.args.filter || {};
    tags.forEach(tag=>{
      filter[tag] = true;
    })
    rp.args.filter = filter;
    return next(rp);
  }
}

const nullFieldIfNotAdmin = (fieldsToNull) => {
  return nullFieldsInContext(c=>{
    return !c.admin;
  },fieldsToNull)
}

const nullFieldsInContext = (contextMatchFunction, fieldsToNull) => {
  return next => (rp) => {
    const result = next(rp);
    if(contextMatchFunction(rp.context)){
      result.then(payload=>{
        nullFields(payload, fieldsToNull);
        return payload;
      })
    }
    return result;
  }
}

const nullFields = (payload, fields) => {
  fields = Array.isArray(fields) ? fields : [fields];
  if(Array.isArray(payload)){
    payload.forEach(item=>{
      fields.forEach(field=>{
        item[field] = null;
      })
    })
  } else {
    fields.forEach(field =>{
      payload[field] = null;
    })
  }
}

const emitEventAfterSaveUserRecordId = (eventNames) => {
  const payloadFunc = (payload) => ({
    _id: payload.recordId
  })
  return emitEventAfterSave(eventNames, payloadFunc);
}

const emitEventAfterSave = (eventNames, payloadFunc) => {
  eventNames = Array.isArray(eventNames) ? eventNames : [eventNames];
  return next => (rp) => {
    // run mutation
    const r = next(rp);
    // payload is now available
    return r.then(payload=>{
      eventNames.forEach(event=>{
        app.events.emit(event, payloadFunc(payload));
      })
    })
  }
}


const commonFilterArgs = {

  _idsIn: {
    name: '_idsIn',
    type: '[String]',
    description: 'array of _ids',
    query: (rawQuery, value, resolveParams) => {
      rawQuery._id = {
        $in: value // should check for array
      }
    }
  },

  // slug LIKE match
  slugsIn: {
    name: 'slugsIn',
    type: '[String]',
    description: 'array of slug strings',
    query: (rawQuery, value, resolveParams) => {

      // convert tags to regex case-insensitive match (match any part) 
      value = value.map(val=>{
        return new RegExp(val, 'gi');
      });

      rawQuery.slugs = {
        $in: value
      }
    }
  },

  // exact slug match
  slugsInMatch: {
    name: 'slugsInMatch',
    type: '[String]',
    description: 'array of slug strings',
    query: (rawQuery, value, resolveParams) => {
      rawQuery.slugs = {
        $in: value // should check for array
      }
    }
  },

  // exact slug match
  tagsIn: {
    name: 'tagsIn',
    type: '[String]',
    description: 'array of slug strings',
    query: (rawQuery, value, resolveParams) => {
      rawQuery.tags = {
        $in: value // should check for array
      }
    }
  },

  publicOrMine: {
    name: 'publicOrMine',
    type: 'Boolean',
    description: 'return public or non-public results?',
    query: (rawQuery, value, resolveParams) => {

      if(!resolveParams.context){
        console.error('NO CONTEXT!!!!!');
        return;
      }
      // console.log('ResolveParams', resolveParams.context);
      if(resolveParams.context.admin){
        // no modification for admin (return exactly what was requested)
        return;
      }

      if(!resolveParams.context.user){
        rawQuery.public = true;
        return;
      }

      // should handle if $or already exists!
      // - todo
      rawQuery.$or = [{
        public: true
      },{
        createdByUserId: resolveParams.context.user._id
      }]

    }
  },

}


export {
  restrictToPublicOrMine,
  requireFilterTags,
  nullFields,
  nullFieldsInContext,
  nullFieldIfNotAdmin,
  emitEventAfterSave,
  emitEventAfterSaveUserRecordId,

  commonFilterArgs
}








