# QR page review and retained history

Requires the coordinated backend QR grouping and retention APIs for backend issues
26 and 50. The ZIP download companion is included in this branch's base. Production
deployment and merging remain separate work.

On an assessment, **QR page intake** is shown only when the backend returns
`expected_qr_page_labels` and `qr_test`. Set the printed test code and expected
labels (for example P1, P3) before uploading. The course code and assessment date
must match the printed QR fields. An empty label list retains single-script
uploads. QR configuration becomes immutable after grouped intake. Select OCR or
bubbles independently; QR labels never identify a student.

One upload may produce multiple paper groups. After an upload returns
`upload_group_ids`, the page replaces its assessment-scoped script snapshot,
including newly created groups and updated existing groups. Processing polls
refresh changed versions/timestamps even if status remains unchanged; a poll
started before an upload/review refresh cannot replace the newer snapshot.

The assessment page and verification review panel show grouped full-page metadata,
recognition suggestions, missing/duplicate/conflicting page findings and audited
reviews. Original page and source-upload buttons fetch authenticated blobs; source
uploads can contain multiple students and are evidence, not email attachments.
Student emails use the backend canonical group PDF.

**Review page** allows a lecturer to supply a corrected five-field QR value,
exclude/include a page, confirm/dismiss its recognition suggestion, or move it to
another group in the same assessment. A nonempty reason and the captured source
version are required. A move also captures the selected destination's version.
Conflicts remain visible and require reloading/reviewing, rather than silently
using a newer version. Review preserves originals, invalidates prior verification
and requires renewed lecturer confirmation. Verification is disabled while
processing or while QR issues remain. An identity review reason can accompany
verification when overriding a sole recognition suggestion.

The course membership panel lists active and withdrawn enrollments in one
course-scoped request. Withdrawal and restoration use the enrollment ID, version
and reason. They preserve the global student record and other classes. Restoration
makes previously current scripts available again; archived/superseded scripts stay
in read-only history and cancelled email deliveries are not restarted. The obsolete hidden global-student removal
flow and references to deleting grades were removed.

**Archive script** uses a reviewed version and reason and retains original files
and audit history. **Script history** is read-only and lists current, archived and
superseded scripts, meaningful recorded student identities, original file
revisions and lifecycle audits. Historical original/revision/page/source downloads
use protected backend routes under active parent courses/assessments. History has
no verification, retry, archive or email controls. The backend enforces the approved
single-current-script policy; conflicting verification errors are shown clearly.

Validation uses synthetic fixtures for multi-group intake, same-status version
updates, old-poll fencing, QR page moves and stale versions, class-only withdrawal
and restoration, protected downloads, immutable history and versioned archiving.
