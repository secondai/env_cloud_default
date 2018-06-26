
import Handlebars from 'handlebars'

const buildCode = ({slug, props, permissionFunctions, defaultPermissionFunction}) => {

  // expecting to return multiple code snippets! 
  // - the caller determines how to process them nicely

  let sources = lodash.map(lodash.filter(permissionFunctions, { slug }), 'template');
  if(!sources.length){
    // default function is to just make evrything visible (just easier for debugging at first, eventually switch to the opposite!) 
    sources.push(defaultPermissionFunction);
    // console.log('Using defaultPermissionFunction for', slug);
  } else {
    // console.log('USING CUSTOM permissionsFunctions (from db)');
  }

  let propsObj = {};
  Object.keys(props).forEach(prop=>{
    propsObj[prop] = JSON.stringify(props[prop] === undefined ? null:props[prop]);
  });

  let rendered = [];

  sources.forEach(source=>{
    let template = Handlebars.compile(source);
    rendered.push(template(propsObj));
  });

  return rendered;
}

export default buildCode;