// ---------------------------------------------------
// main entry for backup job
// ---------------------------------------------------
require('dotenv').config();
const COS = require('ibm-cos-sdk');
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1');
const { IamAuthenticator } = require('ibm-watson/auth');

// read in essential configuration values from environment (either configmap or env file)
let the_apikey = process.env.STT_APIKEY;
let the_url = process.env.STT_URL;
let the_name = process.env.STT_NAME;
let target_bucket = process.env.STT_BACKUP_BUCKET;
let cos_endpoint_url = process.env.COS_ENDPOINT;
let hmac_key_id = process.env.HMAC_KEY_ID;
let hmac_secret = process.env.HMAC_SECRET;
let cos = null;
let speechToText = null;
let languageModels = null;

/* -----------------------------------------------
*  check_param function 
*/
async function check_param(name,param){
  if ((typeof param == undefined) || (param == null)){
    console.error("Configuration variable not set: " + name);
    console.error("STT Backup utility cannot continue.");
    process.exit(-1);
  }
}
// ---------------------------------------------------

/* -----------------------------------------------
*  validate_params function 
*/
async function validate_params(){
  await check_param("STT_APIKEY",the_apikey);
  await check_param("STT_URL",the_url);
  await check_param("STT_NAME",the_name);
  await check_param("STT_BACKUP_BUCKET",target_bucket);
  await check_param("COS_ENDPOINT",cos_endpoint_url);
  await check_param("HMAC_KEY_ID",hmac_key_id);
  await check_param("HMAC_SECRET",hmac_secret);
}
// ---------------------------------------------------

/* -----------------------------------------------
*  setup function 
*/
async function setup(){ 

  await validate_params();

  console.log("************* Start backing up " + the_name + " service instance *********");
  console.log("to Cloud Object Storage bucket: " + target_bucket);

  // connect with COS 
  let s3Config = {
    accessKeyId: hmac_key_id,
    secretAccessKey: hmac_secret,
    region: 'ibm',
    endpoint: new COS.Endpoint(cos_endpoint_url),
  }
  cos = new COS.S3(s3Config);
  console.log("-----> connected to Cloud Object Storage.");

  // connect to Speech-to-Text
  speechToText = new SpeechToTextV1({
    authenticator: new IamAuthenticator({
      apikey: the_apikey, 
    }),
    serviceUrl: the_url,
  });
  console.log("-----> connected to Speech-to-Text service.");
}
// ---------------------------------------------------

/* -----------------------------------------------
*  write_cos_file function 
*/
async function write_cos_file(itemName, fileText){
  console.log(`-----> Writing to file: ${itemName}`);
  return cos.putObject({
      Bucket: target_bucket, 
      Key: itemName, 
      Body: fileText
  }).promise()
  .then(() => {
      console.log(`-----> File: ${itemName} written!`);
  })
  .catch((e) => {
      console.error(`ERROR: ${e.code} - ${e.message}\n`);
  });
}
// ---------------------------------------------------

/* -----------------------------------------------
*  get_model_list function 
*/
async function get_model_list(){

  languageModels = speechToText.listLanguageModels();

  await write_cos_file(the_name + "-model-list.json",JSON.stringify(languageModels));
  
  console.log("-----> Speech-to-Text models list saved.");
  //console.log(JSON.stringify(languageModels, null, 2));

  return languageModels;
}
// ---------------------------------------------------

/* -----------------------------------------------
*  backup_model function 
*/
async function backup_model(model){
  console.log("\n---------------------------------------------------");
  console.log("Backing up: " + model.name);
  customization_param = {customizationId: model.customization_id};

  let model_content = await speechToText.getLanguageModel(customization_param);
  //console.log("Content of " + model.name);
  //console.log(JSON.stringify(model_content, null, 2));
  await write_cos_file(model.name + "/model-info.json",JSON.stringify(model_content));
  
  let corpora_request_result = await speechToText.listCorpora(customization_param);
  await write_cos_file(model.name + "/corpora-list.json",JSON.stringify(corpora_request_result));
  let model_corpora = corpora_request_result.result.corpora;

  for (corpora of model_corpora){
    let corpus_params = {
      customizationId: model.customization_id,
      corpusName: corpora.name
    }
    let corpus_content = await speechToText.getCorpus(corpus_params);
    await write_cos_file(model.name + "/" + corpora.name + "-corpus-content.json",JSON.stringify(corpus_content));
  }

  let words_request_result = await speechToText.listWords(customization_param);
  await write_cos_file(model.name + "/words.json",JSON.stringify(words_request_result));

  let grammars_request_result = speechToText.listGrammars(customization_param);
  await write_cos_file(model.name + "/grammars.json",JSON.stringify(grammars_request_result));

  console.log(model.name + " backed up.");
}
// ---------------------------------------------------

/* -----------------------------------------------
*  main function 
*/
async function main(){
  await setup();
  languageModels = await get_model_list();
  the_customizations = languageModels.result.customizations;

  let model = null;
  for (model of the_customizations) {
    await backup_model(model);    
  }
  console.log("\n************* DONE backing up " + the_name + " service instance *********");
}

main();