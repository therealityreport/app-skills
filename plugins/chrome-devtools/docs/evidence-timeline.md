# Evidence Timeline

The evidence timeline orders debugging observations so users can see what happened before, during, and after a failure.

## Evidence types

- target preview;
- console entry;
- network request;
- API call summary;
- response metadata;
- DOM snapshot metadata;
- screenshot metadata;
- error fingerprint;
- doctor check;
- redaction warning.

## Ordering

Sort by timestamp first, then by stable sequence number. When a fixture item lacks a timestamp, keep fixture file order and mark the item as `timestamp-missing`.

## Summary output

Timeline summaries should name the practical event first, then technical detail:

- what changed;
- where it happened;
- whether it is sensitive or redacted;
- what follow-up action it suggests.

