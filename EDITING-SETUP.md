# Editing the Studio Il website

The client edits everything at **https://YOUR-SITE/admin/**: home page text and slideshow,
projects with their spaces and pictures, journal notes and topics, contact details, footer
and Tamil translations. Every Publish saves the change and the live site updates in a minute or two.

All website text lives in `content/*.json`; pictures uploaded from the editor go to `uploads/`.
The pages read these files, so no code is touched when editing.

## One-time setup (done by us, not the client)

1. **Put the site on GitHub.** Create a private repository and push this `studio-il` folder to it
   (branch `main`).
2. **Connect Netlify to the repository.** In Netlify: Site configuration, Build & deploy,
   Link repository. No build command, publish directory `/` (the folder root).
   From now on every save in the editor redeploys the site automatically.
3. **Allow GitHub login.**
   - GitHub, Settings, Developer settings, OAuth Apps, New OAuth App.
     Homepage URL: the site address. Callback URL: `https://api.netlify.com/auth/done`.
   - Copy the Client ID and generate a Client Secret.
   - Netlify: Site configuration, Access & security, OAuth, Install provider, GitHub,
     paste both values.
4. **Point the editor at the repository.** In `admin/config.yml` replace `OWNER/REPO`
   with the real repository (for example `sozo-studio/studio-il`) and update `site_url`
   and `display_url` if the domain changes.
5. **Give the client access.** The client makes a free GitHub account; add them to the
   repository as a collaborator (Settings, Collaborators). They then sign in at `/admin/`
   with "Login with GitHub".

## Trying the editor on this computer

```bash
npx decap-server
```

Then open `http://localhost:7669/admin/` and press Login. Saves are written straight into
`content/` on this computer (nothing is published).

## Notes for the client

- **Pictures:** upload JPG or PNG, ideally 2000 to 3000 px on the long side. Netlify resizes
  and compresses them for phones automatically.
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
- The "Powered by Netlify" badge comes from Netlify, not this code: claim the site / turn it off
  in the Netlify dashboard.
