# Restaurant operations — Phase 9

> Current commercial scope: [Darb REST v1](V1-COMMERCIAL-MODEL.md). Operational,
> payment, table-order and custom-domain sections below document retained technical
> foundations. They are dormant, not current subscription capabilities.

## Scope and entry point

The branch-scoped admin `/[locale]/operations` workspace extends the existing KitchenBoard.
The original `/kitchen` route, customer ordering, checkout and canonical order transitions remain
available. Operations adds station filters, per-line preparation tasks, rush priority, staff
assignment, table states, timestamps, notification preferences and an operational history.

Migration `20260919000009_restaurant_operations.sql` was applied locally and remotely by the operator.
Validation covered the local installation without executing migrations or remote commands.
There are no physical printer drivers, inventory, delivery, reservations or analytics features.

## Routing and preparation

Managers maintain branch stations and item/category routing rules using existing menu relationships.
A line routes to every matching active item station; active item rules take precedence over category
rules. Without an active item rule, active category rules apply. No match creates an unassigned task.
A station can be deactivated without hiding its existing backlog.

Routing runs transactionally after submission has created the order-line snapshots. Station identity
and name are snapshotted once per line/station pair. Later rule changes affect future submissions,
not existing tasks. Legacy orders without tasks remain visible under Unassigned and acquire tasks on
their next status transition; historical timestamps are not invented or backfilled.

Tasks follow pending → preparing → ready, only while the canonical order is preparing. Different
stations can prepare the same line independently. Task completion does not automatically advance
the order. The existing whole-order ready/completed action finishes remaining tasks, preserving
the original KDS workflow; cancellation cancels unfinished tasks. The UI states this behavior.

Rush is a flag on the existing order and sorts ahead of ordinary tickets. Accepted, preparation
started, ready and completed timestamps are recorded on the existing order when transitions occur;
submitted_at remains the original source for order age.

## Authorization, retries and isolation

Server actions resolve the current authenticated business and validate the requested branch.
Security-definer RPCs independently check active business/location and operational membership.
RLS grants operators read access within their business; all writes require authorized RPCs.
The branch roster is an assignment list, not a new branch-access permission system. Existing
business membership remains the authority, consistent with Phase 8.

Owners, admins and managers configure stations/routes/rosters and assign staff. Staff can operate
tasks, rush flags, table states and their own notification preferences. Assignments require an active
operational member on that branch's roster. Removing someone from a roster clears current order
and table assignments. Order/table/task revisions reject stale writes. Action UUIDs protect retries;
reuse with different actor/scope/payload fails. Direct client writes to new tables are denied.

## Tables and staff

Operators can filter to orders/tables assigned to them. Table states are available, occupied,
needs_attention and cleaning. Validated dine-in linkage marks an available table occupied.
Takeaway retains no table linkage. Tables with active orders cannot be released to available or
cleaning. Completion does not automatically free a table: staff explicitly choose cleaning/available.
This is a service visibility foundation, not reservations or a floor-plan editor.

## Live data and notifications

The board reuses authenticated minimal branch Realtime signals and the existing reconnect/refetch,
15-second polling and stale-action protection. The operations feed applies station/staff/status
filters before its 50-order pagination. No customer secrets or complete orders are broadcast.

New-order and ready-order preferences are persisted per user/branch. Sound remains opt-in on the
device. Notification counters establish a baseline when the view connects or its filters/preferences
change; they notify about branch arrivals/readiness rather than replaying old events. Setup context
polls every 15 seconds and refreshes after mutations; request sequencing prevents stale responses
overwriting newer settings. Configuration/catalog data is fetched in one RPC rather than per item.
Large branch catalogs and multi-client production load have not been benchmarked.

## Audit and printer abstraction

Operations and canonical status changes append actor, target, timestamp and structured payload to
restaurant_operation_history. The workspace pages history in batches of 50. Printer events record
unique submitted/ready/cancelled order references with a versioned envelope. The shared
PrinterEventSink interface is an adapter boundary only: there is no dispatcher, delivery guarantee,
physical printer, receipt rendering or external side effect. The UI shows the latest 50 references.

## Validation record

All 205 local database assertions pass, including 57 operations assertions covering routing
precedence/fan-out, inactive station fallback, cross-branch/tenant isolation, independent task
states, rush/retries, staff permissions, table state/occupancy, timestamps and printer events.

All 43 E2E tests pass. The real operations test creates and configures a station, submits a guest
order, verifies automatic routing, rush and item preparation, reads audit/printer records,
completes the order and deactivates the station. It also verifies forbidden cross-tenant context
and separation from a sibling branch. Existing ordering/payment/QR/KDS tests remain green.
Transport fixtures supplement real-data EN/AR/HE responsive/RTL checks at 375/430/834/1440px.
Live boards and setup/history/printer panels were visually reviewed.

The QR database fixture now obtains the current table revision before regeneration/archive:
the new occupancy transition legitimately increments that revision. No schema or application
fix was required. Typecheck, lint, 83 unit tests, both builds and format check pass.

All validation used local Supabase and desktop Chromium viewport emulation. Physical device/audio
behavior and production load were not tested; no physical printer integration exists by design.
No migrations, resets, repairs, remote seeds or remote schema commands were run.
