"use strict";

const http = require("http");
const https = require("https");
const querystring = require("querystring");

const AWS = require("aws-sdk");
const S3 = new AWS.S3({
  region: "<your region>"
});
const Sharp = require("sharp");

const BUCKET = "<your bucket>";

exports.handler = async (event, context, callback) => {
  const response = event.Records[0].cf.response;

  const request = event.Records[0].cf.request;
  const params = querystring.parse(request.querystring);
  if (!params.d) {
    callback(null, response);
    return;
  }
  const uri = request.uri;

  const imageSize = params.d.split("x");
  const width = parseInt(imageSize[0]);
  const height = parseInt(imageSize[1]);

  const [, imageName, extension] = uri.match(/\/(.*)\.(.*)/);

  const requiredFormat = extension == "jpg" ? "jpeg" : extension;
  const originalKey = imageName + "." + extension;
  try {
    const s3Object = await S3.getObject({
      Bucket: BUCKET,
      Key: originalKey
    }).promise();

    const resizedImage = await Sharp(s3Object.Body)
      .resize(width, height)
      .toFormat(requiredFormat)
      .toBuffer();

    response.status = 200;
    response.body = resizedImage.toString("base64");
    response.bodyEncoding = "base64";
    response.headers["content-type"] = [
      { key: "Content-Type", value: "image/" + requiredFormat }
    ];
    return callback(null, response);
  } catch (error) {
    console.error(error);
    return callback(error);
  }
};
