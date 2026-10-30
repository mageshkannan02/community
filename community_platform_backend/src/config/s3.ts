import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { env } from "./env";

const s3Config: S3ClientConfig = {
  region: env.AWS_REGION,
};

if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  };
}

if (env.AWS_S3_ENDPOINT) {
  s3Config.endpoint = env.AWS_S3_ENDPOINT;
  s3Config.forcePathStyle = true;
}

export const s3Client = new S3Client(s3Config);
export const S3_BUCKET_NAME = env.AWS_S3_BUCKET_NAME;
export const AWS_REGION = env.AWS_REGION;
