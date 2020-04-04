import AWS from "aws-sdk";
import querystring from "querystring";
import Sharp from "sharp";

const S3 = new AWS.S3({
  region: "ap-northeast-2"
});

const handler: AWSLambda.Handler = async (e, _, cb) => {
  const response = e.Records[0].cf.response;
  const request = e.Records[0].cf.request;
  const BUCKET = request.origin.s3.domainName.slice(0, -17);
  const params = querystring.parse(request.querystring);
  if (!params.d) {
    cb(null, response);
    return;
  }
  const { uri } = request;

  const imageSize = (params.d as string).split("x");
  let width = parseInt(imageSize[0]);
  let height: number = 0;
  if (imageSize[1]) {
    height = parseInt(imageSize[1]);
  }

  const [, imageName, extension] = uri.match(/\/(.*)\.(.*)/);

  const originalKey = imageName + "." + extension;

  try {
    const s3Object = await S3.getObject({
      Bucket: BUCKET,
      Key: originalKey
    }).promise();

    let resizedImage: Buffer | undefined;
    let targetData = s3Object.Body as Buffer;

    resizedImage = await Sharp(targetData)
      .withMetadata()
      .resize(width, height, { fit: "cover", position: "attention" })
      .jpeg({ progressive: true })
      .toBuffer();

    response.status = 200;
    response.body = resizedImage.toString("base64");
    response.bodyEncoding = "base64";
    response.headers["content-type"] = [
      { key: "Content-Type", value: "image/" + "jpeg" }
    ];
    return cb(null, response);
  } catch (error) {
    console.error(error);
    return cb(null, response);
  }
};
export default handler;
