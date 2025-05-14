const dotenv = require("dotenv");
dotenv.config({ path: "../config/.env" });

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const configuration = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
};

const s3 = new S3Client({
  credentials: configuration,
});

const uploadBufferToS3 = async (buffer, fileName) => {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: fileName,
    Body: buffer,
    ContentType: "image/png", // Save as a PNG image
  };

  try {
    const command = new PutObjectCommand(params);
    await s3.send(command);
    return `https://${params.Bucket}.s3.amazonaws.com/${fileName}`;
  } catch (err) {
    throw new Error("Error uploading to S3: " + err);
  }
};

module.exports = {
  uploadBufferToS3,
};
