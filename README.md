# Salesforce Package XML Generator

A lightweight, browser-only Salesforce `package.xml` generator built with plain HTML, CSS, and JavaScript. No build step, backend, account, or dependencies required.

## Run locally

1. Download or clone this repository.
2. Open `index.html` in a modern browser.

## Deploy to GitHub Pages

1. Create a GitHub repository and add `index.html`, `styles.css`, `script.js`, and `README.md` to the repository root.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`, then save.
5. GitHub Pages will provide a public URL after deployment.

## Features

- Searchable Salesforce metadata type list
- Bulk component-name input (one per line or comma-separated)
- Duplicate-name removal
- Live XML preview
- Copy and download `package.xml`
- Local validation for empty manifests and duplicate members
- Destructive changes manifest mode
- Dependency-free ZIP download for manifest files
- Helpful FAQ section
- API version selector
- Responsive layout
- Browser-only processing

## Important notes

- This tool creates manifests; it does not deploy metadata, connect to Salesforce, or verify that components exist in an org.
- Local validation cannot guarantee deployment success.
- Destructive changes can delete metadata when deployed; review all generated files carefully.
- Metadata naming rules can vary by metadata type. Validate the resulting manifest against the target Salesforce org and Metadata API version.
- Update the canonical URL and Open Graph URL in `index.html` to the final deployed domain. The included `https://shubhamlashkan.com/` value is a placeholder until you confirm the final hosting URL and route.
- Google search ranking is not guaranteed. Search visibility depends on the domain, content quality, links, technical indexing, competition, and time. Submit the deployed URL through Google Search Console and add a sitemap if the site grows.


## Metadata coverage

The selector includes all metadata types requested in the project brief, including ApexTestSuite, CustomApplication, FlowDefinition, PermissionSetGroup, ListView, and WorkflowRule. Metadata API support and valid member-name formats can vary by type and API version; this tool does not verify the existence of members in a target org.

The Metadata API version is an editable text field with a default value of `66.0`. Use a version supported by your target org and project.


## Compare manifests

Use **Compare XML** in the XML preview toolbar. The comparison modal pre-fills the current generated manifest as a read-only baseline; paste another `package.xml` into the second editor and choose **Compare manifests**. Results are grouped by metadata type/member and include added, removed, unchanged, search, status filters, and an API-version warning. Wildcard-affected entries are marked for manual review. XML parsing and comparison run locally in the browser; no file upload or Salesforce connection is used.

The comparison is a manifest membership comparison, not a source-code diff and not a deployment validation.


## Import & Merge

Choose **Import & Merge** in the XML preview toolbar to load an existing `package.xml` from your device. The tool parses and previews it before changing the current selections, merges members by metadata type and member name, and removes duplicates. Unknown metadata types are added to the picker as imported types so their member names can remain in the generated manifest. The current API version is retained; a version mismatch is shown as a warning. File parsing runs in the browser and does not upload the XML.

In destructive-changes mode, imported members become deletion targets. The modal warns about this so the user can review the mode before applying the merge.


## Custom domain and SEO setup

This version is configured for the canonical production URL `https://packagexml.dev/`.

Included SEO files:
- `robots.txt` — allows crawling and points crawlers to the sitemap.
- `sitemap.xml` — lists the canonical homepage.
- `index.html` — includes a descriptive title, meta description, canonical URL, Open Graph/Twitter metadata, and WebApplication structured data.

### Before publishing
1. In your GitHub repository, open **Settings → Pages → Custom domain** and enter `packagexml.dev`.
2. Configure the DNS records recommended by GitHub Pages for your domain registrar. Follow GitHub's current documentation and verify DNS before enforcing HTTPS.
3. Enable **Enforce HTTPS** once GitHub Pages shows the certificate is ready.
4. Choose one canonical host (`https://packagexml.dev/` is configured here) and ensure the `www` variant redirects to it if you configure `www`.
5. Add and verify `packagexml.dev` in Google Search Console, then submit `https://packagexml.dev/sitemap.xml`.
6. Use Search Console's URL Inspection to request indexing after the domain is live.

The files cannot activate DNS, HTTPS, Search Console verification, or indexing by themselves. Those steps require access to your registrar and GitHub/Search Console accounts. Google may choose its own search-result title/snippet and indexing is not guaranteed.


### Buy Me a Coffee support link
The footer includes a small, brand-colored “Buy me a coffee” link to `https://buymeacoffee.com/shubhamlashkan`. It opens in a new tab and does not load a third-party widget or tracking script, keeping the tool lightweight and browser-only.
