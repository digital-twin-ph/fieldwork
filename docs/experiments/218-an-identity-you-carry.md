# 218 · An identity you carry

_Created 2026-11-15 · Updated 2026-11-16_

**Status:** tried. A design, written before the code; its spike built 2026-11-16 (steps 1, 2, 4, 5 and 6; 3 in part; 7 not yet), below.

## The question

The practitioner, 2026-11-15, preparing to onboard an Advanced FETP graduate from Sierra Leone to Fieldwork's
development: *"This also means we have to start working on collaborative projects, because this is how future worked
examples are going to be developed"*; *"Which means we have to strengthen the concept of identity within FW, perhaps
using Open Science as a platform (e.g., identities - ORCID, GitHub, etc.)"*; *"We have to develop an encrypted identity
file which user loads when identity requiring activities are active"*; and, asked whether the file should also carry
service tokens, *"Identity only"*.

So: **can a person carry their identity as an encrypted file, loaded only when the work needs it, that lets Fieldwork
credit and sign what they contribute, offline, without requiring an account to use Fieldwork at all?**

## What exists

| | Today | Where |
| --- | --- | --- |
| Who an author is | A GitHub login and a display name, `declared` (typed, asserts nothing) or `attested` (GitHub returned it for a presented credential) | `src/identity.ts`, experiment 150 |
| Where authors appear | A project's author list; an authored note's `author` | `src/project.ts`, `src/notes.ts` |
| Secrets for services | Encrypted at rest, locked after fifteen idle minutes; kept apart from identity on purpose ("an identity is not a credential") | `src/credentials.ts` |
| A researcher's identity, an organisation's, roles in the work, a way to check authorship offline | None | |

## The design

**The identity file.** A small file the person keeps, `<name>.fwid`, created in Fieldwork and backed up like a key.

| Inside it | What it is |
| --- | --- |
| Profile | Name; GitHub login; ORCID iD (its check digit validated offline); affiliation by ROR ID; the person's usual CRediT roles |
| Attestations | For each identity, when and how a provider confirmed it (GitHub; ORCID if its sign-in works from a browser alone) |
| A signing key pair | Generated in the browser; the private key never leaves the file; the public key is part of the profile and can also be published where others can find it (the person's GitHub account) |

**Not inside it:** service tokens or any secret for another service. They stay in the credential store, as the
practitioner decided: identity only.

**Encryption.** The whole file is encrypted with a key derived from the person's passphrase, with the browser's own
cryptography (Web Crypto: a key derivation such as PBKDF2 and an authenticated cipher such as AES-GCM); offline,
nothing installed.

**Use.**

| | |
| --- | --- |
| Loaded only for identity-requiring work | Signing a contribution, exporting a project repository, attesting an identity, contributing to a shared worked example. Fieldwork asks for the file and its passphrase at that moment |
| Held in memory only | Never written to browser storage; cleared when idle and when the tab closes |
| Everything else needs no identity | Opening, running and writing notes work as now; Fieldwork never requires an account |

**Signing contributions.** With the key, Fieldwork signs what a person contributes: an authored note, a workflow, a
validation. Anyone can check offline that it came from the identity whose public key the profile carries, without
asking GitHub or ORCID; where the network is poor, that is the difference between a name typed and a claim that can be
checked.

## Admission review

D1: a new primitive of the application, not a widget: the identity file and contribution signatures. The practitioner
asks for it by name.

| Distinction | Enforced as |
| --- | --- |
| An identity is not a credential | **hard stop**: the file's schema has no field for a service token, and reading one with such a field refuses it |
| Declared, attested and signed are three different claims | **validation rule**: each identity and each contribution says which it is, and a display never collapses them |
| The private key never leaves the file | **hard stop**: no export or storage path writes it in the clear |
| The identity is in memory only while loaded | **run-time check**: browser storage is checked to hold none of it after loading and after locking |
| A lost file or passphrase cannot be recovered | **limitation**, said plainly at creation, with a prompt to back up the file |
| Fieldwork works without an identity | **out-of-scope decision**: no feature outside identity-requiring work asks for one |

## Open questions, to settle in the design's next pass

1. **Signing algorithm.** Ed25519 is the natural choice; its Web Crypto support in some browsers, Safari especially, is
   recent and to be checked, with a standard fallback (ECDSA P-256).
2. **ORCID attestation from a browser alone.** Whether ORCID's sign-in can confirm an iD without a server of ours; if
   not, ORCID iDs stay declared and GitHub logins alone are attested.
3. **What is signed, exactly.** A canonical form of a note or a workflow, so a signature survives export and import;
   the project repository layout of experiment 150 is the candidate.
4. **Key rotation and revocation.** A new key when one is compromised, and how old signatures are read after it.
5. **Where contributions are recorded.** Notes carry an author today; workflows and validations do not.

## What it commits to, written before the result

- Unit tests: a file created, encrypted and read back with its passphrase; refused with a wrong one; a file holding a
  service token refused; a contribution signed and verified, and a tampered one failing verification.
- A browser test, Chromium and WebKit: create a file, sign a note, export the project as a repository, import it on a
  fresh page and see the note verified; browser storage holds none of the identity afterwards.
- **The observation that can come out badly:** with the Sierra Leone graduate as the second author of a worked
  example, whether carrying a file and a passphrase is workable, or is the step people skip.

## What it does not establish

That a signature shows who wrote the words: it shows which key signed them. That an ORCID iD or a GitHub login belongs
to the person holding the file, beyond what each provider attests. Anything about collaboration itself, which needs
reading a project repository back (experiment 150's unbuilt half).

## The spike: who did what, 2026-11-16

The practitioner, after 202's planning notes were designed: *"So a publication in fact can have an audit trail
including who generated what in collaborative projects. So before we proceed let's do a spike with identity as this is
needed for who did what."* And, the same day in 202: planning and non-planning notes *"Both should have versioning."*

An audit trail of a publication is a note's versions, each saying who made it. That needs the identity of this record,
and versions, which no note has. The spike takes the parts whose answer is not known in advance, in this order:

| Step | Question it answers | Done when |
| --- | --- | --- |
| 1. The file | Can a browser make, encrypt and reopen an identity file with nothing installed? | A profile and a key pair, encrypted with a passphrase (PBKDF2 and AES-GCM), saved as `.fwid`, reopened; refused with a wrong passphrase; refused if it holds a service token |
| 2. The key | Does Ed25519 sign and verify in both engines, or is ECDSA P-256 the fallback? (open question 1) | Measured in Chromium and WebKit |
| 3. What is signed | A canonical form of an authored note that survives a project export and import (open question 3) | The same bytes before and after the round trip |
| 4. A version | A note's version: when, by whom (login and public key), the canonical note's digest, the signature | Saving an authored note with an identity loaded appends a signed version; without one, an unsigned version says *declared* or *unattributed*, as today |
| 5. Checked | Each version verified offline against the key it names; a tampered note fails | A note's dialog lists its versions, each *signed and verified*, *signature fails*, or *not signed* |
| 6. Nothing left behind | The identity in memory only | Browser storage holds none of it after loading and after locking |

**GitHub's two roles (the practitioner, the same day):** *"GitHub therefore plays dual roles - for identity and
project coordination. Question is - is an identity token different from an access token that allows a user to post
something on GitHub?"* There is one kind of token; what differs is its permissions. A token with none can still ask
GitHub whose it is (`GET /user`, which `attestIdentity` uses); posting needs permissions on chosen repositories.
Least privilege is two tokens: one with no permissions, used once to confirm identity; one scoped to the project
repository, kept in Credentials. A token is a bearer secret and says only who holds it now; the identity file's key is
what can be checked offline later.

| Step | Question it answers | Done when |
| --- | --- | --- |
| 7. A key linked to an account, with no token | Can the identity file's public key be published as a GitHub SSH signing key, and read back from GitHub's public API by a browser? | The key converted to SSH form; `api.github.com/users/<login>/ssh_signing_keys` measured for an answer a browser can read; a match shown as *linked to @login* |

Open science, which identity serves, is its own experiment: [219](219-open-science-requirements.md).

**Out of the spike:** ORCID and GitHub attestation (open question 2); key rotation (4); versions of workflows, machined
notes and validations (5); reading a project repository back (150); planning notes (202). Each waits on what this
finds.

**The observation that can come out badly**, as above: whether carrying a file and a passphrase is workable for the
second author, or is the step people skip.

## The spike, result, 2026-11-16

| Step | Result |
| --- | --- |
| 1. The file | Built: `src/identity-file.ts`. Profile and key encrypted with PBKDF2 (600,000 rounds, SHA-256) and AES-GCM; reopened; a wrong passphrase refused; a file with a field named for a secret refused; an ORCID iD's check digit verified offline. The **Identity** button in the header, beside Credentials (`src/identity-ui.ts`) |
| 2. The key | **Ed25519 signs and verifies in both engines** (Playwright 1.64's Chromium and WebKit) and in Node 22, so ECDSA P-256 stays a fallback, tested in Node. Real Safari and older browsers not measured |
| 3. What is signed | The canonical content (keys sorted, no whitespace; versions and author excluded) survives storing and reading back through `readNotes`. **Not run:** a project's Back up and Import, and a repository export, which is the round trip 150 needs |
| 4. A version | Every save that changes a note of your own appends a version: content, time, digest, and where an identity is open, the signer and signature. Kept on the note, so it travels with the project |
| 5. Checked | The note's dialog lists its versions, each *signed, and the signature checks*, *signed, and the signature does not check: changed since*, or *not signed* |
| 6. Nothing left behind | After making, locking and reopening: neither the passphrase nor the sealed file nor the format name in localStorage or sessionStorage, no IndexedDB database named for identity. The public key is in each signed version by design |
| 7. A key linked to GitHub | Both halves measured 2026-11-16 (below); the link itself waits on a real account |

Checked: `tests/identity-file.test.mjs` (6), `tests/identity.browser.mjs` (1, Chromium and WebKit: an identity made in
the dialog, a wrong ORCID refused, a note signed and checked, a version altered in storage failing, lock, a wrong
passphrase refused, reopened from the file, storage clean).

**Found on the way:** a version is written after the note, once the signature is made, so Notes drawn in between showed
the note without it; Notes is now redrawn when the version is kept.

**Not established:** that the 600,000 rounds are tolerable on a low-end phone (measured only on this Mac, where the
whole test took about two seconds); that people keep the file and passphrase (the observation above); the glossary
terms *note version* and *identity file*, added the same day, have not been read by the practitioner.

**Avatars, the same day.** The practitioner: *"Can the identity button sport an avatar?"*, *"It could also be custom FW
avatars"*, *"Yes build both so we can also see the UI."* Built in `src/avatars.ts`: thirteen icons drawn for Fieldwork
on nine colours (white on each at 6.3:1 or better), kept in the file as two short names, initials until chosen; a
change seals the file again with the same key (`updateIdentityFile`). The key pattern, a mirrored 5 by 5 grid from the
public key, stands beside each signed version. The Identity button took the header's top-right place, where a
placeholder circle reading "FW" had stood. Checked: `tests/identity-file.test.mjs` (8), `tests/identity.browser.mjs`
(Chromium and WebKit).

**Step 7, measured 2026-11-16** (the practitioner: *"Ok for 3 probe signing"*). GitHub's
`/users/<login>/ssh_signing_keys` answered a request carrying an `Origin` with **200 and
`access-control-allow-origin: *`, no token**, using the public test account `octocat` (which has none published: an
empty list). A Web Crypto Ed25519 public key, its last 32 bytes wrapped in SSH's wire format, read as a valid
**ED25519** key to `ssh-keygen -l`. So a person can add their identity key to GitHub as a signing key, and Fieldwork
can confirm the link by reading GitHub's public answer, with no token at all. **Not run:** the match on a real account,
which needs the person to add their key; and the same request from a page in a browser (measured with `curl`).

**Identity and credentials stay apart (the practitioner, the same day: *"I thought we separated the identity and
credentials function. There will be pros and cons for sharing."*).** They are two files today. The one place they
touched is confirming a GitHub login, which until now meant unlocking a token in Credentials. With step 7 that needs no
token:

| | Confirm with a token | Confirm with the published key |
| --- | --- | --- |
| Needs | A token, pasted once, or kept in Credentials | The person adds their key on GitHub once |
| Proves | Who holds the token now | That the account published this key, which signs the notes |
| Lives in | Credentials (the token) and Identity (the result) | Identity only |
| Cost | A secret handled, for a one-off check | One step on GitHub; nothing secret leaves the file |

So confirmation can move into the Identity dialog as *Confirm with GitHub* by the published key, and Credentials
keeps only what acts on a service. Not built.

**Tried by hand the same day, on a local copy (rapid cycle).** What the practitioner found, and what changed: *Make*
was a collapsed line nobody saw (now two tabs, Make or Open); a passphrase mismatch said nothing where they looked
(now checked as typed, and said beside the button); opening a file gave no feedback (now said at the top); the open
identity's view showed the Make form and a second avatar chooser (now one view per state); the file is saved as
`FWID-<name>.fwid`; a GitHub login and an ORCID iD are checked as typed, and **Look up** shows the name each service has
on record, found and not verified (both answer a browser with no token: ORCID's public API and GitHub's users API,
measured with test identifiers). **Link your key to GitHub** shows the key in SSH form with Copy and a QR code. A code
holding the key as text was offered by the phone as a web search; it now holds a link to `key.html` on Fieldwork's
site, with the key after `#`, which no server receives. Found in testing: on WebKit the app's service worker carried
the lookups past the test's stubs to the real services; the test now blocks it.

## What each file holds, planned 2026-11-16

The practitioner: *"So let's also plan what goes into the identity and credentials file. For example, identify files
have GitHub, ORCID and ROR at least. The first two need user to do something. So we need an open science checklist for
the user to complete. Then credentials file -- GitHub for project management and coordination, Zenodo for data storage
and provenance (not sure about requirements, DOI (?)"*

| | Identity file (`.fwid`) | Credentials file (`.fwcredentials`) |
| --- | --- | --- |
| Says | Who you are; anyone may read it once published | What you may do on a service; never published |
| Holds | Name; **GitHub login**; **ORCID iD**; **ROR ID** of the affiliation; the person's usual CRediT roles; the signing key pair; when and how each identifier was confirmed | A **GitHub** token scoped to the project repository (coordination: contents, issues, discussions; never workflows); a **Zenodo** token (deposit, and publish where the person chooses to); any other service key |
| Needs the person to act | GitHub: an account. ORCID: register at orcid.org and make the iD public. ROR: nothing but choosing the organisation, as ROR IDs are public | Make each token on its service, with the least permission that does the job |
| If lost | Signatures already made still check; new ones cannot be made; no recovery | Revoke and remake the token on the service |

The two stay apart, as the design above requires: an identity is not a credential. The steps the person takes outside
Fieldwork are the open-science checklist of [219](219-open-science-requirements.md).

**ROR is confirmed by lookup, not by the person**: an affiliation chosen from ROR's public registry carries its ID and
name. Whether ROR's API answers a browser is to be measured.

**ORCID is declared until confirmed.** Confirming that a person holds an iD needs ORCID's sign-in, which needs a
client registered with ORCID; whether that works from a browser with no server of ours is open question 2 above. Until
then, two cheap links a reader can follow: the GitHub login listed on the ORCID record, and the ORCID iD on the GitHub
profile.

## Unlocked through a reload, ten minutes, 2026-11-16

Until today, an open identity and unlocked credentials were held in the page's memory only and locked at any reload.
Offered three ways to make a reload cost less (choose the files again, as before; remember the files so only the
passphrase is asked; or stay unlocked), the practitioner chose: *"I want stay unlocked but shorten the lock time to
10 minutes."*

**What changed** (`src/session-keep.ts`):
- While unlocked, both are kept in this browser's IndexedDB. The credentials and the identity's profile are encrypted
  with an AES-GCM key made in the browser, which cannot be exported. The signing key is kept as the non-exportable
  CryptoKey it already was.
- They lock after **10 minutes** without use (was 15), or at **Lock**. A reload, or closing and reopening the tab, no
  longer locks them.
- **Found by the test, and fixed:** deleting the kept copy takes a moment, so a reload straight after **Lock** came
  back unlocked. The time of a lock is now written synchronously, and a copy kept before it is never restored.

**What this costs, said plainly.** Encryption keeps the stored bytes unreadable in the browser's storage panel, in a
copy of the profile folder, and to other sites. It does not protect against a script running on this page: while
unlocked, that script can use the key and the tokens. Before today that held only while the page stayed open; now it
holds for up to ten minutes across reloads. The earlier rule, *never in browser storage*, is superseded by this
decision. It is not removed from the record above.

**Validation, 2026-11-16, Chromium only:** `tests/credentials.browser.mjs` (unlocked after a reload, the stored bytes
hold neither the token nor its reference, Lock then a reload stays locked, ten idle minutes lock) and
`tests/identity.browser.mjs` (open after a reload, the stored bytes hold neither the name nor the passphrase, the key is
not extractable, Lock then a reload stays locked). Both runs passed twice in a row.

**What this does not establish:**
- That WebKit stores a non-exportable CryptoKey in IndexedDB the way Chromium does. It is expected, not run.
- ~~The warning before the lock that WCAG 2.2.1 asks for.~~ Built the same day: a minute before, with **Keep them open**.

