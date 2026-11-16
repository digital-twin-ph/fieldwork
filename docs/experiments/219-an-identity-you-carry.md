# 219 · An identity you carry

_Created 2026-11-16 · Updated 2026-11-16_

**Status:** asked. A design, written before the code. Nothing built.

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
