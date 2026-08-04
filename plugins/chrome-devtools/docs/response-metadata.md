# Response Metadata

Response metadata lets agents reason about API behavior without exposing raw response bodies.

## Default summary

Each response summary should include:

- status code;
- status text, when available;
- content type;
- duration;
- encoded byte size;
- decoded byte size, when available;
- redirect count;
- cache status, when available;
- redaction status;
- body availability reason.

## Body availability states

- `metadata-only`: default state.
- `fixture-redacted`: bounded fixture body was redacted and may be summarized.
- `blocked-unbounded`: body exceeded the configured size limit.
- `blocked-sensitive`: body or headers contained unresolved sensitive values.
- `blocked-live`: live body capture is not supported in this slice.

## Reporting rule

Reports may mention body size, type, and blocked reason. They must not include raw body text unless it is fixture-derived, bounded, and redacted.

