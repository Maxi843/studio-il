# Editing the Studio Il website

The client edits everything at **https://YOUR-SITE/admin/**: home page text and slideshow,
projects with their spaces and pictures, journal notes and topics, contact details, footer
and Tamil translations. Every Publish saves the change to GitHub and Cloudflare
updates the live site within a minute or two.

All website text lives in `content/*.json`; pictures uploaded from the editor go to `uploads/`.
The pages read these files, so no code is touched when editing.

## How it fits together

- **GitHub** (`Maxi843/studio-il`) holds the site. Free.
- **Cloudflare Workers** publishes it on every change (settings in `wrangler.jsonc`). Free, no build step.
  `.assetsignore` lists files that must never be published (the `.git` folder, setup notes).
- **Editor login** runs on the site itself: `worker.js` answers `/api/auth` and `/api/callback`
  and signs the editor in with GitHub.
- **Contact form** sends through Web3Forms using the key in the dashboard (Contact, Form key).
  With no key the Send button opens the visitor's email app instead.

## One-time setup

1. **Cloudflare:** Workers & Pages, Create, Import a repository, pick `studio-il` (the existing repo,
   not a clone). Project name `studio-il`, build command empty, deploy command `npx wrangler deploy`.
2. **Site address:** put the address Cloudflare gives (e.g. `https://studio-il.<account>.workers.dev`,
   or the custom domain later) in `admin/config.yml` as `base_url`.
3. **GitHub login app:** github.com/settings/developers, OAuth Apps, New OAuth App.
   Homepage URL = the site address; callback URL = `<site address>/api/callback`.
   Copy the Client ID and generate a Client Secret.
4. **Keys in Cloudflare:** the Worker's Settings, Variables and Secrets, add
   `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` (as a secret). Then redeploy.
5. **Client access:** the client makes a free GitHub account; add them to the repository
   (Settings, Collaborators). They sign in at `/admin/` with "Login with GitHub".
6. **Contact form:** get a free access key at web3forms.com with the inbox that should receive
   enquiries, and paste it in the dashboard under Contact, Form key.

If the domain changes, update `base_url` in `admin/config.yml` and the two URLs in the GitHub OAuth app.

## Trying the editor on this computer

```bash
npx decap-server
```

Then open `http://localhost:7669/admin/` and press Login. Saves are written straight into
`content/` on this computer (nothing is published).

## Notes for the client

- **Pictures:** upload JPG, about 2000 px on the long side. Pictures are shown as uploaded,
  so very large files make the site slow.
- **Projects:** the short code must be unique; it is part of the project's web address.
  "Show under" decides which filter (Architecture, Interior Design) shows the project.
- **Journal:** the journal page shows the newest note of each topic, so keep newest notes at the top.
  Topics are managed under Journal, Topics.
- **Home paragraphs:** about 40 words each so the home page still fits on one screen.
- **Tamil:** a phrase appears in Tamil only if it has a row in Tamil translations whose English
  matches the website text exactly. Anything new stays in English until a row is added.
- **LinkedIn:** the footer icon appears once a LinkedIn link is filled in.

## Still to sort out before launch

- Real email address (currently `hello@studio-il.example`) and LinkedIn link.
- Tamil text should be checked by a native speaker.
