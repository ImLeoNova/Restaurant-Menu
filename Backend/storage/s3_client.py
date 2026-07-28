import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, BotoCoreError
import os
import logging

 
logger = logging.getLogger(__name__)


class StorageError(Exception):
    pass


class S3StorageClient:
    def __init__(self):
        self.endpoint_url = os.environ.get("S3_ENDPOINT_URL") or None
        self.access_key_id = os.environ.get("S3_ACCESS_KEY_ID") or None
        self.secret_access_key = os.environ.get("S3_SECRET_ACCESS_KEY") or None
        self.bucket_name = os.environ.get("S3_BUCKET_NAME") or None
        self.region = os.environ.get("S3_REGION", "us-east-1")
        self._client = None

    @property
    def client(self):
        if self._client is None:
            if not all([self.endpoint_url, self.access_key_id, self.secret_access_key, self.bucket_name]):
                raise StorageError("Missing required S3 environment variables.")
            self._client = boto3.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key,
                region_name=self.region,
                config=Config(s3={"addressing_style": "path"}),
            )
        return self._client

    def upload_image(self, buffer, key, content_type="application/octet-stream"):
        if not buffer:
            raise StorageError("Upload buffer is empty.")
        if not key:
            raise StorageError("Object key is required.")
        try:
            self.client.upload_fileobj(
                buffer,
                self.bucket_name,
                key,
                ExtraArgs={"ContentType": content_type},
            )
            return key
        except (ClientError, BotoCoreError) as e:
            logger.error("Failed to upload image to S3: %s", e)
            raise StorageError(f"Upload failed: {e}")

    def get_signed_url(self, key, expiry_seconds=3600):
        if not key:
            raise StorageError("Object key is required.")
        try:
            return self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": key},
                ExpiresIn=expiry_seconds,
            )
        except (ClientError, BotoCoreError) as e:
            logger.error("Failed to generate signed URL: %s", e)
            raise StorageError(f"Signed URL generation failed: {e}")

    def delete_image(self, key):
        if not key:
            raise StorageError("Object key is required.")
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=key)
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") != "NoSuchKey":
                logger.error("Failed to delete image from S3: %s", e)
                raise StorageError(f"Delete failed: {e}")

    def list_images(self, prefix=None):
        try:
            paginator = self.client.get_paginator("list_objects_v2")
            page_iterator = paginator.paginate(Bucket=self.bucket_name, Prefix=prefix or "")
            keys = []
            for page in page_iterator:
                for obj in page.get("Contents", []):
                    keys.append(obj["Key"])
            return keys
        except (ClientError, BotoCoreError) as e:
            logger.error("Failed to list images: %s", e)
            raise StorageError(f"List failed: {e}")


s3_client = S3StorageClient()
