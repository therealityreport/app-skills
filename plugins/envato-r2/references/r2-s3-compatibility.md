# Cloudflare R2 S3 Compatibility Guard

The Envato-to-R2 upload path uses the documented, portable S3-compatible `PutObject` fields:

- bucket and key;
- object body and content length;
- content type; and
- ordinary object metadata.

Do not add AWS S3 object annotations to this plugin or describe them as supported by Cloudflare R2 unless Cloudflare documents compatibility and the behavior is verified against the configured R2 account. Keep uploads private by default and retain the Envato source/project metadata needed for license traceability.
