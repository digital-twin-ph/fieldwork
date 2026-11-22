# 229 · Backups encrypted by default, to the identity you carry

_Created 2026-11-22 · Updated 2026-11-22_

**Status:** tried — a design, written before the code, and built the same day (below). What would close it: a backup
made encrypted, opened on another device with the same identity file, and the practitioner's observation that a
backup left in a downloads folder or a shared drive is one they would trust there.

## The question

The practitioner, 2026-11-21: *"Before we do anything else, I want to make sure that we are able to save workflows and
projects encrypted by default."*

## What exists, checked 2026-11-21

Searched `docs/` for encrypt, identity, credential, backup; read [24](24-encrypted-project-packages.md),
[30](30-local-credential-files.md), [131](131-project-and-workflow-lifecycles.md) and [218](218-an-identity-you-carry.md).

| Where a workflow or project goes | Encrypted? |
| --- | --- |
| Autosave in this browser (localStorage, IndexedDB by digest, evidence) | No |
| Back up → This workflow (`.json.gz`) | No |
| Back up → This workflow, encrypted (WinZip AES-256 ZIP, its PDFs and raster windows) | Yes, by a passphrase typed each time; chosen, not the default |
| Back up → This project (`-project.json.gz`), and the Project view's Back up | No; a project could not be backed up encrypted at all ([131](131-project-and-workflow-lifecycles.md)) |
| Export as repository (`-repository.zip`) | No |
| Save to a GitHub repository | No (HTTPS in transit only) |

24 had decided an explicit encrypted export beside a plain one, and said ordinary exports "remain unencrypted". No
record proposed encryption by default, or declined it.

## Decided 2026-11-21

Asked which saves and where the key comes from, the practitioner chose:

1. **Files that leave the device**, encrypted by default; a plain copy stays as a named choice, because a public
   worked example has to be readable. Browser storage stays as it is for now.
2. **The identity file holds the key**: while the identity is open, a backup is encrypted to it with no prompt; with
   none open, a passphrase.
3. **Others open it with their own keys** (*"How can others decrypt the project file if I send it to them?"*), all
   three ways offered: a key pasted under *Also for*; project members, whose key is in the statement they sign with
   **This is me**, so nobody can put another key in their place; and a passphrase, told another way.

## The design

| Part | What it is |
| --- | --- |
| A sealed file (`fieldwork/sealed/1`, `.fwsealed`) | The plain backup's bytes, encrypted with AES-256-GCM under a random content key. A short header, in the clear and bound to the ciphertext as its additional data, says what it holds and who can open it: for an identity, the key's fingerprint, an ephemeral P-256 public key and the content key wrapped with ECDH and HKDF-SHA-256; for a passphrase, PBKDF2-SHA-256 (600,000 rounds) and the wrapped key. It names no person. |
| The identity's encryption key | ECDH P-256, made beside the signing key and sealed in the same `.fwid`. P-256 because every browser Fieldwork runs in has it; X25519 is not yet in all of them. An identity made before this gains one when it is next opened, and the person is given the new file to keep in place of the old: the signing key is unchanged. |
| Back up | Encrypted first: This project and This workflow, to the open identity, or with a passphrase. A plain copy below them, said to be readable by anyone who has the file. The password ZIP with PDFs and raster windows stays as it is. |
| Import | A sealed file is recognised by its first bytes and opened with the open identity, or a passphrase; then it goes the way a plain one does. |
| Export as repository | Sealed the same way by default; plain as a named choice. |
| Recipients | The open identity, checked; the project's members with a signed key, checked; keys pasted under *Also for*, each shown by its fingerprint as it is read; a passphrase. One file can be for all of them. |
| Backed up | Says *encrypted* or *not encrypted* beside it. |

## Distinctions, and how each is enforced

| Distinction | Enforced as |
| --- | --- |
| A sealed file opens only with the identity, or the passphrase, it was sealed to | Hard stop: AES-GCM fails, and the file says which key it wants |
| The header is not secret: that a file is a Fieldwork backup, its size and its key's fingerprint are visible | Limitation, said in the dialog |
| Losing the identity file, or its passphrase, loses every backup sealed to it | Limitation, said where the backup is made |
| Encrypted backups do not protect this browser's own storage | Out-of-scope decision (1, above) |

## Validation record, 2026-11-21

- **Unit** (`tests/sealed-file.test.mjs`, Node 22, 6 tests): a file sealed for two identities opens with each and not a
  third; a passphrase opens it and a wrong one is said; the header names no person, and one changed byte in the header
  or the content refuses the file; a key passes as text; a new identity carries a key for sealed files and one made
  before gains it with its signing key unchanged; a member's statement signed before 2026-11-21 reads exactly as signed.
- **Browser** (`tests/sealed-backup.browser.mjs`, Chromium and WebKit): an identity made in the dialog shows its key; a
  project backed up encrypted for it, a colleague's pasted key and a passphrase; the file begins `FWSEALED` and holds no
  word of the project; the colleague's key opens it; it imports again with the identity open and no question; locked,
  the dialog says it opens with any of 2 identities or a passphrase, refuses a wrong one, and opens with the right one.
  With the tests the change touched (project view, safety, identity, project export, password ZIP, shared project):
  22 passed in each engine.

## What it does not establish

- That a person keeps their identity file safe, or that a lost one is noticed before a backup is needed.
- Save to a GitHub repository: still plain. Sealing what collaborators read needs each one's public key; the next step.
- Browser storage, which stays plain by decision.
- The password ZIP's PDFs and raster windows: neither plain backup carries them, so the sealed ones do not either.
