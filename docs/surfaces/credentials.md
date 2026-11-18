# Credentials

_Created 2026-11-17 · Updated 2026-11-18_

## What it does


Your credentials file holds the keys Fieldwork uses to reach other services, such as a GitHub token for a shared
project. It is a file on your computer, encrypted with a passphrase only you know. Fieldwork never keeps a key in a
project, a backup or a repository.

**One file per computer is fine.** A token is not tied to a computer, but you can make a separate one for each laptop.
Then, if a laptop is lost, you delete only that laptop's token on GitHub.

## How to use it

### Start a credentials file on this computer

1. Press **Credentials**, then **Start a new collection**.
2. Add each key, as below.
3. Type a long passphrase, at least 12 characters, in **File passphrase**, and again in **Confirm download
   passphrase**.
4. Press **Download encrypted credentials**. Keep the file in your Downloads folder, named for you and the
   computer, for example `FWCRED-<your name>-windows.fwcredentials`.

There is no way to recover a forgotten passphrase. Write it in your password manager.

### Open it next time

1. Press **Credentials**.
2. **Encrypted credential file**: choose your file.
3. **File passphrase**: type it.
4. Press **Unlock and activate**.

It stays unlocked for 10 minutes after you last use it, or until you press **Lock and discard session**. Using it
means working in this dialog, or Fieldwork reading a key for a request; working elsewhere in Fieldwork does not keep
it open. The button says how many keys are unlocked. **Start a new collection** opens an empty one, shown as
*Credentials: new, empty*, until you add a key.

## Make a GitHub token for one repository

On GitHub, signed in as yourself:

1. Your picture, top right, then **Settings**.
2. At the bottom of the left column, **Developer settings**.
3. **Personal access tokens**, then **Fine-grained tokens**, then **Generate new token**.
4. **Token name**: the project and the computer, for example `fieldwork measles-2026 windows`.
5. **Resource owner**: whoever owns the repository, shown before the slash in its address. For
   `digital-twin-ph/project-test-collaboration` that is `digital-twin-ph`, not you.
6. **Expiration**: 90 days. GitHub emails you before it ends.
7. **Repository access**: **Only select repositories**, and choose the project's repository. Only that one.
8. **Permissions**, **Repository permissions**:
   - **Contents**: Read and write.
   - **Discussions**: Read and write.
   - Leave everything else at **No access**. Never give **Workflows**.
   GitHub adds **Metadata: Read-only** by itself.
9. **Generate token**. Copy it at once: GitHub shows it only this time.

If the owner is an organization, an owner of that organization may have to approve the token before it works. GitHub
shows the token as pending until then.

## Fill in the form for a GitHub token

Under **Add or replace a credential**:

| Field | What to type | Example |
| --- | --- | --- |
| **Reference** | A short name of your own, unique in this file. The same reference replaces an existing key. | `project-test-collaboration` |
| **Provider identifier** | Exactly `github`, lower case. | `github` |
| **Label** | Optional: what you will recognise in a list. | `Test collaboration, Windows` |
| **Allowed HTTPS origin** | Exactly `https://api.github.com`, with no slash at the end. | `https://api.github.com` |
| **Repository it is for** | The repository, as owner/name, exactly as in its address. | `digital-twin-ph/project-test-collaboration` |
| **API key** | Paste the token you just copied. | (starts `github_pat_`) |

Then:

1. Press **Add and activate**. The list shows it, "for" the repository you named.
2. Press **Download encrypted credentials** to keep it, as above. A key you add and do not download is gone when the
   page is closed.

Fieldwork checks the token with GitHub as it unlocks it, and shows whose it is.

## When something does not work

- **The repository is not listed in Open shared GitHub project**: check **Repository it is for** is spelled exactly
  as the repository's address, and **Provider identifier** is `github`.
- **GitHub refuses the token**: it may have expired, or still be waiting for the organization's approval, or have
  been given the wrong **Resource owner**. Make a new one.
- **A lost laptop**: on GitHub, **Fine-grained tokens**, delete that laptop's token. The file on the laptop is then
  useless even to someone who learns its passphrase.
