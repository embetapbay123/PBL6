# Week 3 — Kanban audit

Updated 2026-10-13. [Board](https://github.com/users/embetapbay123/projects/1/views/3) · [Week 3](week3.md).

All 71 project cards were checked against issue state, owner and assignee. No missing issue, closed/Done mismatch or owner/assignee mismatch was found. Open PR #103 is CHANGES_REQUESTED; #101 is closed without merge. Remote main matched local baseline `0d11979` at inspection.

Implementation checks covered Week 3 handoffs: Restock pending, Confirm/Cancel 501, M3 PR changes not merged, and actual Customer/Seller/Admin routes. [Hoa verification](hoa-task-status.md) covers 18 scopes and a fresh 102-test unit run. This audit adds no new integration/device run and does not claim all 71 implementations were retested.

| Issue | Owner | Before → after | Reason |
| --- | --- | --- | --- |
| [#2](https://github.com/embetapbay123/PBL6/issues/2) | Thịnh | Backlog → Todo | Week 3 Store Product list/Seller page after inventory handoff. |
| [#15](https://github.com/embetapbay123/PBL6/issues/15) | Thịnh | Backlog → Todo | Restock/expiry, dependency for Cancel. |
| [#24](https://github.com/embetapbay123/PBL6/issues/24) | Hoa | Backlog → Todo | Cancel/expiry after Confirm; transition already exists. |
| [#53](https://github.com/embetapbay123/PBL6/issues/53) | Công | Backlog → Todo | Refund/provider/reconciliation; kernel is not full acceptance. |
| [#63](https://github.com/embetapbay123/PBL6/issues/63) | Hatsaphone | Backlog → Todo | Auth forms; real integration after M3 review passes. |
| [#67](https://github.com/embetapbay123/PBL6/issues/67) | Hatsaphone | Backlog → Todo | Order read independently with seed; Cancel later via #24. |
| [#5](https://github.com/embetapbay123/PBL6/issues/5) | Hatsaphone | Todo → Review | ProductsSample has API search/pagination/loading/empty/error; test source covers search/pagination/phone retry. Finish acceptance; shared scaffold code is not a new member UI contribution. |

Post-update snapshot: **71 cards — 14 Done, 9 Review, 8 In progress, 12 Todo, 28 Backlog, 0 Blocked**. All 8 In progress cards preserved; no owner/assignee change, reopened Done issue or new task needed.

Review: #5/#6/#23/#25/#27/#30/#31/#33/#39. Done: #1/#3/#4/#7/#8/#11/#14/#26/#28/#45/#50/#51/#54/#62. Review does not change endpoint metadata or close a full scope without acceptance.

#9/#10/#32/#46/#60 remain Backlog, conditional on capacity and priority handoffs. The latest Week 3 handoff section in each selected issue is authoritative for this week's work; previous sections remain historical. This planning update does not approve or merge PR #103.
