# Salesforce Package XML Generator

A lightweight, browser-only Salesforce `package.xml` generator built with plain HTML, CSS, and JavaScript. No build step, backend, account, or dependencies required.

## Run locally

1. Download or clone this repository.
2. Open `index.html` in a modern browser.

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


## Metadata coverage

The selector includes all metadata types requested in the project brief, including ApexTestSuite, CustomApplication, FlowDefinition, PermissionSetGroup, ListView, and WorkflowRule. Metadata API support and valid member-name formats can vary by type and API version; this tool does not verify the existence of members in a target org.

The Metadata API version is an editable text field with a default value of `66.0`. Use a version supported by your target org and project.


## Compare manifests

Use **Compare XML** in the XML preview toolbar. The comparison modal pre-fills the current generated manifest as a read-only baseline; paste another `package.xml` into the second editor and choose **Compare manifests**. Results are grouped by metadata type/member and include added, removed, unchanged, search, status filters, and an API-version warning. Wildcard-affected entries are marked for manual review. XML parsing and comparison run locally in the browser; no file upload or Salesforce connection is used.

The comparison is a manifest membership comparison, not a source-code diff and not a deployment validation.


## Import & Merge

Choose **Import & Merge** in the XML preview toolbar to load an existing `package.xml` from your device. The tool parses and previews it before changing the current selections, merges members by metadata type and member name, and removes duplicates. Unknown metadata types are added to the picker as imported types so their member names can remain in the generated manifest. The current API version is retained; a version mismatch is shown as a warning. File parsing runs in the browser and does not upload the XML.

In destructive-changes mode, imported members become deletion targets. The modal warns about this so the user can review the mode before applying the merge.
