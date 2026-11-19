# Credentials

_Created 2026-11-17 · Updated 2026-11-19_

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

> **The step people miss: Resource owner.** At the top of GitHub's token form, **Resource owner** starts as your own
> name. For a shared project it must be the **organization that owns the repository**, `digital-twin-ph` for
> `digital-twin-ph/project-test-collaboration`. Left as your name, the repository never appears when you choose it,
> and GitHub says only "No repositories found". Change it first (step 5).

On GitHub, signed in as yourself:

1. Your picture, top right, then **Settings**.
2. At the bottom of the left column, **Developer settings**.
3. **Personal access tokens**, then **Fine-grained tokens**, then **Generate new token**.
4. **Token name**: the project and the computer, for example `fieldwork measles-2026 windows`.
5. **Resource owner: change it before anything else.** It is the drop-down at the top of the form, above
   **Expiration**, and it starts as **your own name**. Set it to whoever owns the repository, shown before the slash
   in its address: for `digital-twin-ph/project-test-collaboration` that is `digital-twin-ph`, not you. **Left as your
   name, the project's repository never appears in step 7, however you search for it.** The organization is offered
   only once you are a member of it; if it is missing from the drop-down, ask one of its owners to add you.
6. **Expiration**: 90 days. GitHub emails you before it ends.
7. **Repository access**: **Only select repositories**, and choose the project's repository. Only that one.
8. **Permissions**, **Repository permissions**:
   - **Contents**: Read and write.
   - **Discussions**: Read and write.
   - Leave everything else at **No access**. Never give **Workflows**.
   GitHub adds **Metadata: Read-only** by itself.
9. **Generate token**. Copy it at once: GitHub shows it only this time.

If the owner is an organization, an owner of that organization may have to approve the token before it works (next
section). GitHub shows the token as pending until then, and emails you when it is approved or denied.

## For an organization's owner: approve a member's token

A project shared through an organization's repository works for a member only once their token is approved, where the
organization asks for approval. Tokens made by the organization's own owners need none.

1. On GitHub, the organization's page (for example `github.com/digital-twin-ph`), then **Settings**.
2. In the left column, under **Personal access tokens**, **Pending requests**.
3. Open the member's request. Check **which repository** it asks for (only the project's) and **which permissions**
   (**Contents** and **Discussions**, read and write; never **Workflows**).
4. **Approve**, or **Deny** with a reason, which GitHub sends to the member.

GitHub emails the organization's owners once a day while any request waits. To take a token's access away later:
**Personal access tokens**, **Active tokens**, then **Revoke**. Steps from GitHub's own pages, read 2026-11-19:
*Managing requests for personal access tokens in your organization* and *Reviewing and revoking personal access tokens
in your organization* (docs.github.com).

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

## Make a CARTO basemap key

A CARTO key lets the interactive map show CARTO's light and dark basemaps (Positron, Voyager, Dark Matter), which keep
your data in front, while your credentials are unlocked.

You do not need a CARTO account. CARTO's Workspace has its own **Create new credential** page: that is for CARTO's data
platform, not for basemaps, so do not use it.

1. Go to [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey/).
2. **Request a key** with your email address. Say the use is **not commercial**: research, teaching and non-profit
   work count. That allows 5 million requests a month.
3. Copy the key from the email.
4. To limit the key to Fieldwork, sign in at [dashboard.basemaps.carto.com](https://dashboard.basemaps.carto.com/)
   with the link CARTO emails you, and add the website `digital-twin-ph.github.io`. Type the host only: no `https://`,
   no path. A key limited this way does not work on your own computer's test server (`localhost`).

## Fill in the form for a CARTO key

| Field | What to type | Example |
| --- | --- | --- |
| **Reference** | A short name of your own, unique in this file. | `carto` |
| **Provider identifier** | Exactly `carto`, lower case. | `carto` |
| **Label** | Optional: what you will recognise in a list. | `CARTO basemaps` |
| **Allowed HTTPS origin** | Exactly `https://basemaps.cartocdn.com`, with no slash at the end. | `https://basemaps.cartocdn.com` |
| **Repository it is for** | Leave empty. | |
| **API key** | Paste the key from CARTO's email. | |

Then press **Add and activate**, and **Download encrypted credentials** to keep it.

A CARTO key travels in the address of every tile, so anyone watching the network can read it.
CARTO asks that a key not be shared between unrelated projects: everyone makes their own.

## Make an Esri basemap key

An Esri key lets the interactive map show Esri's satellite imagery and its street and outdoor maps. It is optional, and
takes longer to make than a CARTO key: make one if you want satellite imagery. For street maps, CARTO is simpler.

Use an **ArcGIS Location Platform** account. An ArcGIS Online account, or the license strings for Esri's app kits,
will not work. New accounts have pay-as-you-go **off**: the maps then stop for the month if the free 2 million tiles
run out, and nothing is charged. Leave it off.

Esri's pages do not say whether signing up asks for a card. If it does, you can still leave pay-as-you-go off.

1. Go to [location.arcgis.com/sign-up](https://location.arcgis.com/sign-up/) and create a free account.
2. Sign in and open **Create developer credentials** (in **My portal**: **Content**, **New item**, **Developer
   credentials**).
3. **Select credential type**: **API key credentials**. **Next**.
4. **Where will you use these credentials?**: **Public application**. Never either *Private application* choice: those
   give the key your own account's powers. **Next**.
5. **Item access**: **No item access**. **Next**.
6. **Privileges**: turn on the **Basemaps** switch only, so it reads 2 of 2. Not the *Location services* switch above
   it, and not *Static maps*. **Next**.
7. **Settings**:
   - **Expiration date**: the latest the calendar allows, a year from today. Put the date in your calendar.
   - **Referrer URLs**: `https://digital-twin-ph.github.io`, with no path and no slash at the end.
   **Next**.
8. Give it a title, such as `Fieldwork basemaps`, and finish.
9. The page then shows a **client ID** and a **client secret**. Fieldwork needs neither: do not copy them anywhere.
   Generate the **API key** on that page and copy it at once. Esri shows it only this one time.

These are Esri's screens as of November 2026. If they change, follow Esri's names and tell us, so this page can be
corrected.

## Fill in the form for an Esri key

| Field | What to type | Example |
| --- | --- | --- |
| **Reference** | A short name of your own, unique in this file. | `esri` |
| **Provider identifier** | Exactly `esri`, lower case. | `esri` |
| **Label** | Optional: what you will recognise in a list. | `Esri basemaps` |
| **Allowed HTTPS origin** | Exactly `https://static-map-tiles-api.arcgis.com`, with no slash at the end. | `https://static-map-tiles-api.arcgis.com` |
| **Repository it is for** | Leave empty. | |
| **API key** | Paste the key you copied. | |

Then press **Add and activate**, and **Download encrypted credentials** to keep it.

Before the key expires, make a new one on the same page (Esri lets a key hold two at once) and replace it here.

## When something does not work

- **"No repositories found" when choosing the repository on GitHub's token page**: the **Resource owner** at the top of
  the form is still your own name. Change it to the repository's owner, `digital-twin-ph` for example, and search again.
- **The repository is not listed in Open shared GitHub project**: check **Repository it is for** is spelled exactly
  as the repository's address, and **Provider identifier** is `github`.
- **GitHub refuses the token**: it may have expired, or still be waiting for the organization's approval, or have
  been given the wrong **Resource owner**. Make a new one.
- **CARTO maps do not appear**: check **Provider identifier** is `carto` and **Allowed HTTPS origin** is exactly
  `https://basemaps.cartocdn.com`. A key limited to Fieldwork's address works only there.
- **Esri maps do not appear**: the key may have expired, or the free tiles for the month are used up. Check
  **Provider identifier** is `esri` and **Allowed HTTPS origin** is exactly `https://static-map-tiles-api.arcgis.com`.
- **A lost laptop**: on GitHub, **Fine-grained tokens**, delete that laptop's token. The file on the laptop is then
  useless even to someone who learns its passphrase.
