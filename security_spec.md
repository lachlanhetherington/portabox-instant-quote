# Security Specification: Twilio SMS Integration

## Data Invariants
1.  A message must have a valid `contactId` that exists in the `contacts` collection.
2.  `contactId` and `messageId` must match the path structure.
3.  `timestamp` must be server-time and immutable.
4.  Only authorized system processes (or the backend proxy) can write messages.

## Dirty Dozen Payloads (SMS Inbound/Outbound)
1.  `{ "from": "spoof", "to": "...", "body": "...", "timestamp": "...", "contactId": "...", "direction": "inbound" }` (No contactId auth)
2.  `{ "from": "...", "to": "...", "body": "...", "timestamp": "...", "contactId": "...", "direction": "inbound", "extra": "poison" }` (Ghost field)
3.  `{ "from": 123, "to": "...", "body": "...", "timestamp": "...", "contactId": "...", "direction": "inbound" }` (Wrong type)
4.  `{ "from": "...", "to": "...", "body": "...", "timestamp": "not-a-timestamp", "contactId": "...", "direction": "inbound" }` (Wrong format)
5.  `{ "from": "...", "to": "...", "body": "...", "timestamp": "...", "contactId": "...", "direction": "invalid" }` (Enum violation)
6.  `{ "from": "...", "to": "...", "body": "...", "timestamp": "...", "contactId": "...", "direction": "inbound", "timestamp": "..." }` (Timestamp overwrite)
7.  `{ "body": "..." }` (Missing required)
8.  `{ "from": "...", "to": "...", "body": "A".repeat(10001), "timestamp": "...", "contactId": "...", "direction": "inbound" }` (Size limit violation)
9.  Attempt to `delete` a message (Should be forbidden).
10. Attempt to `update` a message (Should be forbidden).
11. Attempt to `read` another contact's messages.
12. Attempt to `create` a message with an injected `contactId` that doesn't match the path.

## Test Runner (firestore.rules.test.ts)
[To be implemented...]
