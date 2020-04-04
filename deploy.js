const lambdaMappings = [
  {
    FunctionName: process.env.FUNCTION_NAME,
    EventType: "origin-response"
  }
];

const {
  deployCode,
  updateCloudFront,
  getLatestVersion
} = require("./deploy_resource");


(()=>{
  console.log(process.env.PROFILE);
  console.log(process.env.DISTRIBUTION_ID);
  console.log(process.env.FUNCTION_NAME);

  const {PROFILE,DISTRIBUTION_ID,FUNCTION_NAME} =process.env

  if(!PROFILE || !DISTRIBUTION_ID|| !FUNCTION_NAME){
    console.error("Environment variables are not applied.")
    throw new Error("Environment variables are not applied.")
  }
})()

const deploy = async () => {
  try {
    await Promise.all(
      lambdaMappings.map(lambdaMapping => deployCode(lambdaMapping))
    );
    await Promise.all(
      lambdaMappings.map(lambdaMapping => getLatestVersion(lambdaMapping))
    ).then(lambdaMappings =>
      updateCloudFront(process.env.DISTRIBUTION_ID, lambdaMappings)
    );
  } catch (err) {
    console.log("\n\n-----**************ERROR*******************------\n\n");
    console.error(err);
    console.log("\n\n");
    throw Error(err);
  }
  console.log("\n\n");
  console.log("\n\nSuccessfully deploy Lambda functions with CloudFront\n\n");
};
deploy();
