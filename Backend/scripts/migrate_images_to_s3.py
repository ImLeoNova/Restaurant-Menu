import os
import sys
import json
import logging
import argparse
from pathlib import Path
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from storage.s3_client import s3_client, StorageError
from config.settings import (
    UPLOAD_FOLDER,
    CATEGORY_UPLOAD_FOLDER,
    DB_HOST,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
)
from core.database import execute_query
from botocore.exceptions import ClientError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


REPORT_PATH = os.path.join(os.path.dirname(__file__), "migration_report.json")
ENTITY_PREFIXES = {"products": "images/products", "categories": "images/categories"}


def already_migrated(object_key):
    return bool(object_key and object_key.startswith("images/"))


def migrate_entity(table, id_column, upload_dir, key_prefix):
    report = {
        "table": table,
        "migrated_at": datetime.utcnow().isoformat() + "Z",
        "total_records": 0,
        "skipped_already_migrated": 0,
        "uploaded": 0,
        "failed": 0,
        "missing_source": 0,
        "errors": [],
    }

    rows = execute_query(
        f"SELECT `{id_column}`, `image` FROM `{table}` WHERE `image` IS NOT NULL AND `image` != ''",
        fetchall=True,
    )
    report["total_records"] = len(rows) if rows else 0

    for row in (rows or []):
        record_id = row[id_column]
        current_image = row["image"]

        if already_migrated(current_image):
            report["skipped_already_migrated"] += 1
            continue

        local_filename = current_image
        local_path = Path(upload_dir) / local_filename

        if not local_path.exists():
            report["missing_source"] += 1
            continue

        object_key = f"{key_prefix}/{record_id}/{local_filename}"

        try:
            with open(local_path, "rb") as f:
                s3_client.upload_image(
                    f,
                    object_key,
                    content_type=_guess_content_type(local_filename),
                )

            execute_query(
                f"UPDATE `{table}` SET `image` = %s WHERE `{id_column}` = %s",
                (object_key, record_id),
                commit=True,
            )
            report["uploaded"] += 1
            logger.info("Migrated %s id=%s -> %s", table, record_id, object_key)
        except StorageError as e:
            report["failed"] += 1
            report["errors"].append(
                {"id": record_id, "filename": local_filename, "error": str(e)}
            )
            logger.error("Failed to migrate %s id=%s: %s", table, record_id, e)

    return report


def _guess_content_type(filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    mapping = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "webp": "image/webp",
    }
    return mapping.get(ext, "application/octet-stream")


def migrate_up():
    logger.info("Starting S3 image migration (UP)...")

    category_report = migrate_entity(
        table="categories",
        id_column="category_ID",
        upload_dir=CATEGORY_UPLOAD_FOLDER,
        key_prefix=ENTITY_PREFIXES["categories"],
    )

    product_report = migrate_entity(
        table="products",
        id_column="product_ID",
        upload_dir=UPLOAD_FOLDER,
        key_prefix=ENTITY_PREFIXES["products"],
    )

    full_report = {
        "direction": "up",
        "executed_at": datetime.utcnow().isoformat() + "Z",
        "categories": category_report,
        "products": product_report,
    }

    _write_report(full_report)
    logger.info(
        "Migration complete. Categories: %d uploaded, %d failed. Products: %d uploaded, %d failed.",
        category_report["uploaded"],
        category_report["failed"],
        product_report["uploaded"],
        product_report["failed"],
    )
    return full_report


def migrate_down():
    logger.info("Starting S3 image migration (DOWN / rollback)...")

    category_report = rollback_entity(
        table="categories",
        id_column="category_ID",
        upload_dir=CATEGORY_UPLOAD_FOLDER,
        key_prefix=ENTITY_PREFIXES["categories"],
    )

    product_report = rollback_entity(
        table="products",
        id_column="product_ID",
        upload_dir=UPLOAD_FOLDER,
        key_prefix=ENTITY_PREFIXES["products"],
    )

    full_report = {
        "direction": "down",
        "executed_at": datetime.utcnow().isoformat() + "Z",
        "categories": category_report,
        "products": product_report,
    }

    _write_report(full_report)
    logger.info(
        "Rollback complete. Categories: %d restored, %d failed. Products: %d restored, %d failed.",
        category_report["restored"],
        category_report["failed"],
        product_report["restored"],
        product_report["failed"],
    )
    return full_report


def rollback_entity(table, id_column, upload_dir, key_prefix):
    report = {
        "table": table,
        "total_records": 0,
        "skipped_not_migrated": 0,
        "restored": 0,
        "failed": 0,
        "errors": [],
    }

    rows = execute_query(
        f"SELECT `{id_column}`, `image` FROM `{table}` WHERE `image` LIKE %s",
        (f"{key_prefix}/%",),
        fetchall=True,
    )
    report["total_records"] = len(rows) if rows else 0

    for row in (rows or []):
        record_id = row[id_column]
        object_key = row["image"]

        if not already_migrated(object_key):
            report["skipped_not_migrated"] += 1
            continue

        filename = Path(object_key).name
        local_path = Path(upload_dir) / filename

        try:
            with open(local_path, "wb") as f:
                s3_client.client.download_fileobj(
                    Bucket=s3_client.bucket_name,
                    Key=object_key,
                    Fileobj=f,
                )

            execute_query(
                f"UPDATE `{table}` SET `image` = %s WHERE `{id_column}` = %s",
                (filename, record_id),
                commit=True,
            )

            try:
                s3_client.delete_image(object_key)
            except StorageError as e:
                logger.warning("Could not delete %s from S3: %s", object_key, e)

            report["restored"] += 1
            logger.info(
                "Rolled back %s id=%s -> %s", table, record_id, local_path
            )
        except (StorageError, OSError, ClientError) as e:
            report["failed"] += 1
            report["errors"].append(
                {"id": record_id, "object_key": object_key, "error": str(e)}
            )
            logger.error("Failed to rollback %s id=%s: %s", table, record_id, e)

    return report


def _write_report(report):
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    logger.info("Report written to %s", REPORT_PATH)


def main():
    parser = argparse.ArgumentParser(
        description="Migrate local disk images to S3-compatible object storage."
    )
    parser.add_argument(
        "direction",
        choices=["up", "down"],
        help="'up' uploads local files to S3 and updates DB. 'down' downloads from S3 back to local disk and reverts DB.",
    )
    args = parser.parse_args()

    try:
        if args.direction == "up":
            migrate_up()
        else:
            migrate_down()
    except Exception as e:
        logger.error("Migration aborted: %s", e)
        sys.exit(1)


if __name__ == "__main__":
    main()
