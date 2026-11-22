# Shared through GitHub

_Created 2026-11-19 · Updated 2026-11-19_

## What it does

A project shared through GitHub is kept in a GitHub repository as well as in your browser. Your co-authors open the
same repository in their own Fieldwork. Each person works on their own computer, and saves to the repository when they
choose. Nothing is sent until someone presses **Save to the repository**.

The header's "Saved on this device" is about your browser only. A project saved to GitHub can still say "Not backed
up": a backup is a file on your computer, which is a separate thing.

You need:

- a repository made from the project template, `digital-twin-ph/fieldwork-project-template`, on GitHub;
- a GitHub token for that repository, unlocked in **Credentials** (see the Credentials manual);
- for your name to appear in the project: your identity file (the **Identity** button at the right of the header).

## How to use it

Everything below is in the **Project** tab (next to **Workflow**, above the canvas), in the section **Shared through
GitHub**.

### Share a project you have made here

1. Under **Repository**, type the repository as `owner/name`, for example `digital-twin-ph/project-test-collaboration`.
2. Under **GitHub token**, choose the token for that repository.
3. Press **Share through this repository**.

If it answers "It already holds a project", someone has already saved a project there. Open that one instead (below),
so neither project is lost.

### Open a project someone has shared

1. Press **+ New project**, then choose **Open shared GitHub project**.
2. Choose your token, or type the repository, and press **Check the repository**.
3. Press **Load the project**.

### Save your work to the repository

1. Under **What this save is**, type a few words, for example "first question, DRC study area".
2. Press **Save to the repository**.
3. It answers **Saved.**, with a link to see the save on GitHub.

If it answers "Someone saved to GitHub since", press **Get the latest** first, then save.

### Encrypted on GitHub

A project shared from now on is **encrypted on GitHub**: each file is locked so that only the project's members can
read it, each with their own identity. GitHub's pages show that the files are there, not what they say.

- **Open your identity before you save.** A save locks the files for you and for every member who has a key.
- **A member gives their key** by pressing **This is me** under **People**, with their identity open. Someone who
  cannot open the project yet sends you their key (they find it under **Identity**, *Your key for encrypted files*);
  paste it beside their name under **People** and press **Add**. Your next save includes them.
- **A member with no key yet** is named when you save. The save still goes ahead.
- **To make a project open**, for a worked example anyone may read, untick **Encrypted on GitHub**. The next save
  writes plain files and removes the locked ones.

Someone removed from the project keeps what they could already read. To shut someone out completely, move the project
to a new repository.

### Get your co-authors' work

Press **Get the latest**. What changed on GitHub comes in. What you changed here is kept, for you to save. If the same
workflow was changed in both places, you choose which to keep.

### See where things stand

Press **Check GitHub**. Two lines answer:

- **Nothing changed here since last read or saved**, or what has changed;
- **GitHub has nothing newer**, or that someone saved since.

### Say who you are

GitHub records the login of whoever saves. The project can also carry your name, ORCID iD and affiliation, signed
with your identity file so others can check it is you.

1. Press **Check GitHub**, so the **People** list shows who has access.
2. On the row with your login, choose your **Project role**.
3. Press **This is me**. If your identity file is not open, Fieldwork opens it for you: open it, then press **This is
   me** again.
4. Save to the repository, so your co-authors see it.

Until you do, your row says "Has not said who they are yet", and each save reminds you. A save is never refused for
it.

Your row shows what your identity file holds. To add your ORCID iD or an affiliation with its ROR ID, press
**Identity**, open **Change your avatar, ORCID iD or affiliations**, fill them in, choose your identity file, enter its
passphrase and press **Save the new file**. Keep the new file in place of the old one: your key is the same. Then press
**This is me** again and save to the repository.

### Give a co-author a project role

On their row under **People**, choose a **Project role**. The role is saved with the project. Inviting them to the
repository, and what they may do there, is done on GitHub. If their GitHub access is too low for their role, the row
says so.

### Talk about the project

Under **Discussions**, press **Check GitHub** to see the latest. To start one, choose a category, write a title and
a message, and press **Post to Discussions**.

### Stop sharing

**Stop sharing on this device** keeps the project here and leaves the repository as it is.

## What it will not do

- It does not save by itself. Only **Save to the repository** sends your work.
- It does not send your keys. Tokens stay in your credentials file, never in the repository.
- It does not invite people or change their access. That is done on GitHub, by the repository's owner.
- It does not refuse a save because you have not said who you are. It reminds you.
- It does not encrypt Discussions, file names, sizes or the words of a save. Those stay visible to anyone who can see the
  repository.

## When something does not work

- **"GitHub refused the token"**: the token has expired or was made again. Make a new one (Credentials manual).
- **"The token may not write the repository's files"**: the token needs **Contents: Read and write** on this
  repository. If the repository belongs to an organization, its owner may also need to approve the token.
- **No "This is me" button on your row**: unlock your GitHub token in **Credentials**, or open your identity file,
  so Fieldwork knows which row is yours.
