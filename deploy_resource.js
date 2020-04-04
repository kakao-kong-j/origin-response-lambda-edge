const AWS = require("aws-sdk");
const shell = require("shelljs");
const profile = process.env.PROFILE;
const credentials = new AWS.SharedIniFileCredentials({ profile });
AWS.config.credentials = credentials;
AWS.config.region = "us-east-1";

const lambda = new AWS.Lambda();
const cloudfront = new AWS.CloudFront();

const getLastPageOfVersions = (lambdaMapping, Marker) => {
  return lambda
    .listVersionsByFunction({
      FunctionName: lambdaMapping.FunctionName,
      MaxItems: 1000,
      Marker
    })
    .promise()
    .then(res => {
      if (res.NextMarker)
        return getLastPageOfVersions(lambdaMapping, res.NextMarker);

      return res;
    });
};

const deployCode = async lambdaMapping => {
  let deployCommand = `aws lambda update-function-code --function-name ${
    lambdaMapping.FunctionName
  } --zip-file fileb://index.zip --region us-east-1 --publish --profile ${profile}`;
  shell.exec(deployCommand);
};

const getLatestVersion = lambdaMapping => {
  return getLastPageOfVersions(lambdaMapping)
    .then(
      res =>
        res.Versions.sort(
          (a, b) => (parseInt(a.Version) > parseInt(b.Version) ? -1 : 1)
        )[0]
    )
    .then(latest => ({
      EventType: lambdaMapping.EventType,
      LambdaFunctionARN: latest.FunctionArn
    }));
};

const updateCloudFront = (cloudFrontId, lambdaMappings) => {
  cloudfront
    .getDistributionConfig({ Id: cloudFrontId })
    .promise()
    .then(res => {
      console.log(
        "before",
        res.DistributionConfig.DefaultCacheBehavior.LambdaFunctionAssociations
          .Items
      );
      res.DistributionConfig.DefaultCacheBehavior.LambdaFunctionAssociations = {
        Quantity: lambdaMappings.length,
        Items: lambdaMappings
      };
      console.log(
        "after",
        res.DistributionConfig.DefaultCacheBehavior.LambdaFunctionAssociations
          .Items
      );

      const IfMatch = res.ETag;
      delete res.ETag;
      const Id = cloudFrontId;

      return cloudfront
        .updateDistribution(Object.assign(res, { Id, IfMatch }))
        .promise();
    });
};

module.exports = {
  deployCode,
  getLastPageOfVersions,
  updateCloudFront,
  getLatestVersion
};
