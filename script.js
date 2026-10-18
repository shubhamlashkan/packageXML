/* Salesforce Package XML Generator — browser-only, no dependencies. */
(() => {
  "use strict";

  const metadataTypes = [
    { api: "ApexClass", label: "Apex Classes", hint: "e.g. AccountService" },
    { api: "ApexTrigger", label: "Apex Triggers", hint: "e.g. AccountTrigger" },
    { api: "ApexPage", label: "Visualforce Pages", hint: "e.g. AccountPage" },
    { api: "ApexComponent", label: "Visualforce Components", hint: "e.g. AccountHeader" },
    { api: "ApexTestSuite", label: "Apex Test Suites", hint: "e.g. SmokeTests" },
    { api: "AuraDefinitionBundle", label: "Aura Components", hint: "e.g. accountPanel" },
    { api: "LightningComponentBundle", label: "Lightning Web Components", hint: "e.g. accountCard" },
    { api: "CustomApplication", label: "Custom Applications", hint: "e.g. Sales_Console" },
    { api: "Flow", label: "Flows", hint: "e.g. Account_After_Save" },
    { api: "FlowDefinition", label: "Flow Definitions", hint: "e.g. Account_After_Save" },
    { api: "PermissionSet", label: "Permission Sets", hint: "e.g. Sales_Manager" },
    { api: "PermissionSetGroup", label: "Permission Set Groups", hint: "e.g. Sales_Operations" },
    { api: "Profile", label: "Profiles", hint: "e.g. System Administrator" },
    { api: "CustomObject", label: "Custom Objects", hint: "e.g. Invoice__c" },
    { api: "CustomField", label: "Custom Fields", hint: "e.g. Account.External_Id__c" },
    { api: "ValidationRule", label: "Validation Rules", hint: "e.g. Account.Require_Phone" },
    { api: "Layout", label: "Page Layouts", hint: "e.g. Account-Account Layout" },
    { api: "CustomMetadata", label: "Custom Metadata", hint: "e.g. Feature_Flag.Default" },
    { api: "CustomLabel", label: "Custom Labels", hint: "e.g. Welcome_Message" },
    { api: "EmailTemplate", label: "Email Templates", hint: "e.g. unfiled$public/Welcome" },
    { api: "Report", label: "Reports", hint: "e.g. Public Reports/Sales_Summary" },
    { api: "Dashboard", label: "Dashboards", hint: "e.g. Sales_Dashboard" },
    { api: "StaticResource", label: "Static Resources", hint: "e.g. BrandAssets" },
    { api: "CustomTab", label: "Custom Tabs", hint: "e.g. Invoice__c" },
    { api: "ListView", label: "List Views", hint: "e.g. Account.My_List_View" },
    { api: "RecordType", label: "Record Types", hint: "e.g. Account.Business_Account" },
    { api: "WorkflowRule", label: "Workflow Rules", hint: "e.g. Account.Rule_Name" },
    { api: "SharingRules", label: "Sharing Rules", hint: "e.g. Account" },
    { api: "GlobalValueSet", label: "Global Value Sets", hint: "e.g. Industry_Values" },
    { api: "RemoteSiteSetting", label: "Remote Site Settings", hint: "e.g. External_API" },
    { api: "NamedCredential", label: "Named Credentials", hint: "e.g. External_Service" },
    { api: "ConnectedApp", label: "Connected Apps", hint: "e.g. Internal_Integration" },
    { api: "CustomPermission", label: "Custom Permissions", hint: "e.g. Can_Approve_Invoice" },
    { api: "Queue", label: "Queues", hint: "e.g. Support_Queue" },
    { api: "Group", label: "Public Groups", hint: "e.g. Sales_Team" }
  ];

  const selected = new Set();
  const values = new Map();
  const list = document.getElementById("metadata-list");
  const search = document.getElementById("type-search");
  const editors = document.getElementById("component-editors");
  const xmlOutput = document.getElementById("xml-output");
  const versionSelect = document.getElementById("api-version");
  const status = document.getElementById("xml-status");
  const validation = document.getElementById("validation-message");
  const memberCount = document.getElementById("member-count");
  const selectedCount = document.getElementById("selected-count");
  const standardModeButton = document.getElementById("standard-mode");
  const destructiveModeButton = document.getElementById("destructive-mode");
  const modeNote = document.getElementById("mode-note");
  const modeWarning = document.getElementById("mode-warning");
  const previewFilename = document.getElementById("preview-filename");
  let manifestMode = "package";

  function renderTypes() {
    const query = search.value.trim().toLowerCase();
    list.replaceChildren();
    metadataTypes.filter(t => `${t.label} ${t.api}`.toLowerCase().includes(query)).forEach(type => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "metadata-option";
      button.setAttribute("aria-pressed", String(selected.has(type.api)));
      const check = document.createElement("span");
      check.className = "check-square";
      check.textContent = selected.has(type.api) ? "✓" : "";
      const label = document.createElement("span");
      label.textContent = type.label;
      button.append(check, label);
      button.addEventListener("click", () => {
        if (selected.has(type.api)) selected.delete(type.api);
        else selected.add(type.api);
        renderTypes();
        renderEditors();
        updatePreview();
      });
      list.append(button);
    });
    selectedCount.textContent = `${selected.size} selected`;
  }

  function parseNames(raw) {
    const seen = new Set();
    return raw.split(/[\n,]+/).map(n => n.trim()).filter(n => {
      if (!n || seen.has(n)) return false;
      seen.add(n);
      return true;
    });
  }

  function renderEditors() {
    editors.replaceChildren();
    const types = metadataTypes.filter(t => selected.has(t.api));
    if (!types.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = '<span class="empty-icon">＋</span><strong>No metadata types selected</strong><p>Select one or more types above to add their members.</p>';
      editors.append(empty);
      return;
    }
    types.forEach(type => {
      const block = document.createElement("div");
      block.className = "editor-block";
      const label = document.createElement("label");
      label.htmlFor = `members-${type.api}`;
      const title = document.createElement("strong");
      title.textContent = type.label;
      const hint = document.createElement("span");
      hint.textContent = type.api;
      label.append(title, hint);
      const textarea = document.createElement("textarea");
      textarea.id = `members-${type.api}`;
      textarea.placeholder = `${type.hint}\nPaste multiple names on separate lines`;
      textarea.value = values.get(type.api) || "";
      textarea.setAttribute("aria-label", `${type.label} component names`);
      textarea.addEventListener("input", () => {
        values.set(type.api, textarea.value);
        updatePreview();
      });
      block.append(label, textarea);
      editors.append(block);
    });
  }

  function escapeXml(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  function buildXml() {
    const version = versionSelect.value;
    const sections = [];
    let count = 0;
    const emptyTypes = [];
    metadataTypes.filter(t => selected.has(t.api)).forEach(type => {
      const members = parseNames(values.get(type.api) || "");
      if (!members.length) {
        emptyTypes.push(type.label);
        return;
      }
      count += members.length;
      sections.push(`  <types>\n${members.map(name => `    <members>${escapeXml(name)}</members>`).join("\n")}\n    <name>${type.api}</name>\n  </types>`);
    });
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n${sections.length ? sections.join("\n") + "\n" : ""}  <version>${version}</version>\n</Package>\n`;
    return { xml, count, emptyTypes, hasSelected: selected.size > 0 };
  }

  function updatePreview() {
    const result = buildXml();
    xmlOutput.textContent = result.xml;
    memberCount.textContent = `${result.count} ${result.count === 1 ? "member" : "members"}`;
    status.textContent = result.count ? "Preview updated" : "Ready to build";
    status.classList.toggle("success", result.count > 0);
    validation.classList.remove("error", "warning", "success");
    if (!result.hasSelected) {
      validation.textContent = "Select metadata types and add component names to build your manifest.";
    } else if (!result.count) {
      validation.textContent = "Add at least one component name to generate a useful manifest.";
    } else if (result.emptyTypes.length) {
      validation.textContent = `Empty types skipped: ${result.emptyTypes.join(", ")}. Add names to include them.`;
    } else {
      validation.textContent = "Preview updated. Run validation to check common manifest issues.";
    }
    previewFilename.textContent = manifestMode === "package" ? "package.xml" : "destructiveChanges.xml";
  }

  function buildManifestXml(mode = manifestMode) {
    const version = versionSelect.value;
    const sections = [];
    let count = 0;
    const emptyTypes = [];
    const duplicates = [];
    metadataTypes.filter(t => selected.has(t.api)).forEach(type => {
      const rawNames = (values.get(type.api) || "").split(/[\n,]+/).map(n => n.trim()).filter(Boolean);
      const seen = new Set();
      const members = rawNames.filter(name => { if (seen.has(name)) { duplicates.push(`${type.api}: ${name}`); return false; } seen.add(name); return true; });
      if (!members.length) { emptyTypes.push(type.label); return; }
      count += members.length;
      sections.push(`  <types>\n${members.map(name => `    <members>${escapeXml(name)}</members>`).join("\n")}\n    <name>${type.api}</name>\n  </types>`);
    });
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n${sections.length ? sections.join("\n") + "\n" : ""}  <version>${version}</version>\n</Package>\n`;
    return { xml, count, emptyTypes, duplicates, hasSelected: selected.size > 0, version, mode };
  }

  function buildXml() { return buildManifestXml(manifestMode); }

  function validateManifest(showMessage = true) {
    const result = buildXml(), issues = [], warnings = [];
    if (!result.count) issues.push("Add at least one component name.");
    if (!/^\d+\.\d+$/.test(result.version) || Number(result.version) <= 0) issues.push("API version must be a positive number in a format such as 66.0.");
    if (result.duplicates.length) warnings.push(`Duplicate members found and deduplicated (${result.duplicates.length}).`);
    if (result.emptyTypes.length) warnings.push(`Selected types without names are skipped: ${result.emptyTypes.join(", ")}.`);
    if (manifestMode === "destructive") warnings.push("Destructive changes can delete metadata when deployed. Review every member carefully.");
    if (showMessage) {
      validation.classList.remove("error", "warning", "success");
      if (issues.length) { validation.textContent = `Validation failed: ${issues.join(" ")}`; validation.classList.add("error"); }
      else if (warnings.length) { validation.textContent = `No blocking issues found. ${warnings.join(" ")}`; validation.classList.add("warning"); }
      else { validation.textContent = "No common manifest issues found. Component existence and deployment success are not verified."; validation.classList.add("success"); }
    }
    return { valid: !issues.length, issues, warnings, result };
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob), anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadXml() {
    const check = validateManifest(false);
    validation.classList.remove("error", "warning", "success");
    if (!check.valid) {
      validation.textContent = `Please fix this before downloading: ${check.issues.join(" ")}`;
      validation.classList.add("error");
      return;
    }

    if (manifestMode === "destructive") {
      const version = check.result.version;
      const emptyPackage = `<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n  <version>${version}</version>\n</Package>\n`;
      const files = [
        { name: "package.xml", content: emptyPackage },
        { name: "destructiveChanges.xml", content: check.result.xml }
      ];
      downloadBlob("salesforce-destructive-changes.zip", makeZip(files));
      status.textContent = "Deployment ZIP generated";
      status.classList.add("success");
      validation.textContent = "Downloaded a ZIP containing package.xml and destructiveChanges.xml. Review every deletion target and follow Salesforce deployment requirements.";
      validation.classList.add("warning");
      return;
    }

    downloadBlob("package.xml", new Blob([check.result.xml], { type: "application/xml;charset=utf-8" }));
    status.textContent = "Manifest generated";
    status.classList.add("success");
    if (check.warnings.length) {
      validation.textContent = `Downloaded package.xml. ${check.warnings.join(" ")}`;
      validation.classList.add("warning");
    } else {
      validation.textContent = "Downloaded package.xml. Common local checks passed; this does not guarantee deployment success.";
      validation.classList.add("success");
    }
  }

  const crcTable = (() => { const t = new Uint32Array(256); for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t; })();
  function crc32(bytes){let c=0xFFFFFFFF;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
  function makeZip(files) {
    const enc=new TextEncoder(), locals=[], centrals=[];let offset=0;
    const u16=n=>[n&255,(n>>>8)&255],u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
    files.forEach(f=>{const name=enc.encode(f.name),data=enc.encode(f.content),crc=crc32(data);
      const local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name,...data]);locals.push(local);
      const central=new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]);centrals.push(central);offset+=local.length;});
    const csize=centrals.reduce((s,p)=>s+p.length,0),end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(csize),...u32(offset),...u16(0)]);
    return new Blob([...locals,...centrals,end],{type:"application/zip"});
  }
  function downloadZip(){
    const check=validateManifest(false);if(!check.valid){validation.textContent=`Validation failed: ${check.issues.join(" ")}`;validation.classList.add("error");return;}
    const files=manifestMode==="package"?[{name:"package.xml",content:buildManifestXml("package").xml}]:[{name:"package.xml",content:`<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n  <version>${versionSelect.value}</version>\n</Package>\n`},{name:"destructiveChanges.xml",content:buildManifestXml("destructive").xml}];
    downloadBlob("salesforce-manifest-files.zip",makeZip(files));validation.classList.remove("error");validation.classList.toggle("warning",manifestMode==="destructive");
    validation.textContent=manifestMode==="package"?"ZIP downloaded with package.xml.":"ZIP downloaded with package.xml and destructiveChanges.xml. Review deletion targets before deployment.";
  }
  function setMode(mode){manifestMode=mode;const d=mode==="destructive";standardModeButton.classList.toggle("active",!d);destructiveModeButton.classList.toggle("active",d);standardModeButton.setAttribute("aria-pressed",String(!d));destructiveModeButton.setAttribute("aria-pressed",String(d));modeNote.textContent=d?"Generate destructiveChanges.xml for metadata you intend to delete. ZIP includes both manifest files.":"Generate a package.xml for retrieving or deploying selected metadata.";modeWarning.hidden=!d;document.getElementById("generate-button").innerHTML=d?'<span aria-hidden="true">↓</span> Download deployment ZIP':'<span aria-hidden="true">↓</span> Download package.xml';previewFilename.textContent=d?"destructiveChanges.xml":"package.xml";updatePreview();
  }

  async function copyXml() {
    const result = buildXml();
    const button = document.getElementById("copy-button");

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(result.xml);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      button.innerHTML = '<span aria-hidden="true">✓</span> Copied';
      validation.textContent = "XML copied to clipboard.";
      validation.classList.remove("error");
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = result.xml;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.append(textArea);
      textArea.focus();
      textArea.select();
      let success = false;
      try {
        success = document.execCommand("copy");
      } catch {
        success = false;
      }
      textArea.remove();

      if (success) {
        button.innerHTML = '<span aria-hidden="true">✓</span> Copied';
        validation.textContent = "XML copied to clipboard.";
        validation.classList.remove("error");
      } else {
        validation.textContent = "Copy was blocked by the browser. Select the XML preview and copy it manually.";
        validation.classList.add("error");
      }
    }

    window.setTimeout(() => {
      button.innerHTML = '<span aria-hidden="true">▢</span> Copy XML';
    }, 1600);
  }



  // Import & Merge — file is parsed and previewed first; current state changes only on confirmation.
  const importMergeModal = document.getElementById("import-merge-modal");
  const importMergeOpenButton = document.getElementById("import-merge-open-button");
  const importMergeCloseButton = document.getElementById("import-merge-close");
  const importMergeCancelButton = document.getElementById("import-merge-cancel");
  const importMergeFileInput = document.getElementById("import-merge-file");
  const importMergeDropzone = document.getElementById("import-merge-dropzone");
  const importMergeFileInfo = document.getElementById("import-merge-file-info");
  const importMergeFileName = document.getElementById("import-merge-file-name");
  const importMergeFileDetail = document.getElementById("import-merge-file-detail");
  const importMergeError = document.getElementById("import-merge-error");
  const importMergeSummary = document.getElementById("import-merge-summary");
  const importMergeApplyButton = document.getElementById("import-merge-apply");
  const importMergeWarning = document.getElementById("import-merge-warning");
  const importMergeReviewList = document.getElementById("import-merge-review-list");
  let pendingImport = null;
  let importMergePreviousFocus = null;

  function openImportMerge() {
    importMergePreviousFocus = document.activeElement;
    resetImportMergeDialog();
    importMergeModal.hidden = false;
    document.body.classList.add("import-merge-open");
    importMergeDropzone.focus();
  }

  function closeImportMerge() {
    importMergeModal.hidden = true;
    document.body.classList.remove("import-merge-open");
    if (importMergePreviousFocus && typeof importMergePreviousFocus.focus === "function") importMergePreviousFocus.focus();
  }

  function resetImportMergeDialog() {
    pendingImport = null;
    importMergeFileInput.value = "";
    importMergeFileInfo.hidden = true;
    importMergeSummary.hidden = true;
    importMergeError.hidden = true;
    importMergeWarning.hidden = true;
    importMergeReviewList.replaceChildren();
    importMergeApplyButton.disabled = true;
  }

  function parseImportedManifest(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("This file isn't valid XML. Check the file and try again.");
    const root = doc.documentElement;
    if (!root || root.localName !== "Package") throw new Error("This doesn't look like a Salesforce package.xml. The root element must be <Package>.");
    const expectedNamespace = "http://soap.sforce.com/2006/04/metadata";
    if (root.namespaceURI && root.namespaceURI !== expectedNamespace) throw new Error("The XML uses an unexpected namespace. Expected the Salesforce Metadata API namespace.");
    const blocks = [...root.children].filter(node => node.localName === "types");
    if (!blocks.length) throw new Error("No <types> entries were found. Import a manifest containing metadata members.");
    const imported = new Map();
    blocks.forEach(block => {
      const typeNode = [...block.children].find(node => node.localName === "name");
      const typeName = typeNode?.textContent.trim();
      const members = [...block.children].filter(node => node.localName === "members").map(node => node.textContent.trim());
      if (!typeName) throw new Error("A <types> block is missing its <name> element.");
      if (!members.length) throw new Error(`Metadata type "${typeName}" has no <members> entries.`);
      if (members.some(member => !member)) throw new Error(`Metadata type "${typeName}" contains an empty member.`);
      if (!imported.has(typeName)) imported.set(typeName, new Set());
      members.forEach(member => imported.get(typeName).add(member));
    });
    const versionNode = [...root.children].find(node => node.localName === "version");
    return { imported, version: versionNode?.textContent.trim() || "" };
  }

  function getCurrentManifestMembers() {
    const current = new Map();
    metadataTypes.forEach(type => {
      if (!selected.has(type.api)) return;
      const members = parseNames(values.get(type.api) || "");
      if (members.length) current.set(type.api, new Set(members));
    });
    return current;
  }

  async function handleImportMergeFile(file) {
    resetImportMergeDialog();
    if (!file) return;
    if (!/\.xml$/i.test(file.name) && !["text/xml", "application/xml"].includes(file.type)) {
      importMergeError.textContent = "Please choose an XML file with a .xml extension.";
      importMergeError.hidden = false;
      return;
    }
    try {
      const parsed = parseImportedManifest(await file.text());
      const current = getCurrentManifestMembers();
      let newCount = 0, duplicateCount = 0;
      const review = [];
      parsed.imported.forEach((members, typeName) => {
        const existing = current.get(typeName) || new Set();
        const newMembers = [...members].filter(member => {
          if (existing.has(member)) { duplicateCount++; return false; }
          newCount++;
          return true;
        });
        review.push({ typeName, members: [...members], newMembers });
      });
      pendingImport = { ...parsed, newCount, duplicateCount };
      importMergeFileName.textContent = file.name;
      importMergeFileDetail.textContent = `${parsed.imported.size} metadata types · ${[...parsed.imported.values()].reduce((n, set) => n + set.size, 0)} unique imported members`;
      importMergeFileInfo.hidden = false;
      document.getElementById("import-merge-new-count").textContent = String(newCount);
      document.getElementById("import-merge-duplicate-count").textContent = String(duplicateCount);
      document.getElementById("import-merge-type-count").textContent = String(parsed.imported.size);
      importMergeReviewList.replaceChildren();
      review.sort((a,b) => a.typeName.localeCompare(b.typeName)).forEach(item => {
        const group = document.createElement("div");
        group.className = "import-merge-review-group";
        const title = document.createElement("strong");
        title.textContent = `${item.typeName} · ${item.newMembers.length} new / ${item.members.length} imported`;
        const members = document.createElement("p");
        members.textContent = item.members.join(", ");
        group.append(title, members);
        importMergeReviewList.append(group);
      });
      const warnings = [];
      if (parsed.version && parsed.version !== versionSelect.value.trim()) {
        warnings.push(`Imported API version is ${parsed.version}; your current version is ${versionSelect.value.trim() || "blank"}. The merge will keep your current version.`);
      }
      const knownApis = new Set(metadataTypes.map(type => type.api));
      const unknownTypes = [...parsed.imported.keys()].filter(type => !knownApis.has(type));
      if (unknownTypes.length) warnings.push(`The following types aren't in the built-in picker. They'll be added as imported types so their members can be preserved: ${unknownTypes.sort().join(", ")}.`);
      if (manifestMode === "destructive") warnings.push("You are in destructive-changes mode. Imported members will become deletion targets in destructiveChanges.xml. Review carefully before downloading.");
      if (warnings.length) {
        importMergeWarning.textContent = warnings.join(" ");
        importMergeWarning.hidden = false;
      }
      importMergeSummary.hidden = false;
      importMergeApplyButton.disabled = false;
    } catch (error) {
      pendingImport = null;
      importMergeError.textContent = error instanceof Error ? error.message : "Unable to read this manifest.";
      importMergeError.hidden = false;
    }
  }

  function applyImportMerge() {
    if (!pendingImport) return;
    const merged = getCurrentManifestMembers();
    pendingImport.imported.forEach((members, typeName) => {
      if (!merged.has(typeName)) merged.set(typeName, new Set());
      members.forEach(member => merged.get(typeName).add(member));
    });

    // Add unknown metadata types to the picker so they can still be reviewed and retained.
    pendingImport.imported.forEach((members, typeName) => {
      if (!metadataTypes.some(type => type.api === typeName)) {
        metadataTypes.push({ api: typeName, label: `Imported: ${typeName}`, hint: `Members for ${typeName}` });
      }
      selected.add(typeName);
      values.set(typeName, [...(merged.get(typeName) || [])].join("\n"));
    });

    // Keep the user's selected API version; only adopt imported version if the field is blank.
    if (!versionSelect.value.trim() && pendingImport.version) versionSelect.value = pendingImport.version;
    renderTypes();
    renderEditors();
    updatePreview();
    validation.classList.remove("error", "warning", "success");
    validation.classList.add("success");
    validation.textContent = `Import complete: merged ${pendingImport.imported.size} metadata types, added ${pendingImport.newCount} new members, and skipped ${pendingImport.duplicateCount} duplicates. Review the preview before downloading.`;
    status.textContent = "Manifest merged";
    status.classList.add("success");
    closeImportMerge();
  }

  importMergeOpenButton.addEventListener("click", openImportMerge);
  importMergeCloseButton.addEventListener("click", closeImportMerge);
  importMergeCancelButton.addEventListener("click", closeImportMerge);
  importMergeModal.querySelectorAll("[data-close-import-merge]").forEach(el => el.addEventListener("click", closeImportMerge));
  importMergeDropzone.addEventListener("click", () => importMergeFileInput.click());
  importMergeDropzone.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); importMergeFileInput.click(); }
  });
  importMergeDropzone.addEventListener("dragover", event => { event.preventDefault(); importMergeDropzone.classList.add("is-dragging"); });
  importMergeDropzone.addEventListener("dragleave", () => importMergeDropzone.classList.remove("is-dragging"));
  importMergeDropzone.addEventListener("drop", event => {
    event.preventDefault();
    importMergeDropzone.classList.remove("is-dragging");
    handleImportMergeFile(event.dataTransfer.files && event.dataTransfer.files[0]);
  });
  importMergeFileInput.addEventListener("change", event => handleImportMergeFile(event.target.files && event.target.files[0]));
  document.getElementById("import-merge-remove-file").addEventListener("click", resetImportMergeDialog);
  importMergeApplyButton.addEventListener("click", applyImportMerge);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !importMergeModal.hidden) closeImportMerge();
  });

  // Manifest comparison: generated XML is captured from the live preview; pasted XML stays local.
  const compareModal = document.getElementById("compare-modal");
  const compareOpenButton = document.getElementById("compare-open-button");
  const compareCloseButton = document.getElementById("compare-close-button");
  const compareGeneratedXml = document.getElementById("compare-generated-xml");
  const comparePastedXml = document.getElementById("compare-pasted-xml");
  const compareRunButton = document.getElementById("compare-run-button");
  const compareError = document.getElementById("compare-error");
  const compareResults = document.getElementById("compare-results");
  const compareResultList = document.getElementById("compare-result-list");
  const compareResultSearch = document.getElementById("compare-result-search");
  const compareSummary = document.getElementById("compare-summary");
  const compareVersionNote = document.getElementById("compare-version-note");
  const compareWildcardNote = document.getElementById("compare-wildcard-note");
  const compareFilters = [...document.querySelectorAll("[data-compare-filter]")];
  let comparisonRows = [];
  let comparisonFilter = "all";

  function openCompareModal() {
    compareGeneratedXml.value = buildXml().xml;
    comparePastedXml.value = "";
    compareError.hidden = true;
    compareResults.hidden = true;
    compareVersionNote.hidden = true;
    compareWildcardNote.hidden = true;
    comparisonRows = [];
    comparisonFilter = "all";
    compareResultSearch.value = "";
    compareFilters.forEach(button => {
      const active = button.dataset.compareFilter === "all";
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    compareModal.hidden = false;
    document.body.classList.add("compare-open");
    window.setTimeout(() => comparePastedXml.focus(), 30);
  }

  function closeCompareModal() {
    compareModal.hidden = true;
    document.body.classList.remove("compare-open");
    compareOpenButton.focus();
  }

  function parseManifest(xmlText, label) {
    if (!xmlText.trim()) throw new Error(`${label} is empty. ${label === "Your generated XML" ? "Add component names in the generator first." : "Paste a package.xml to compare."}`);
    const parsed = new DOMParser().parseFromString(xmlText, "application/xml");
    if (parsed.querySelector("parsererror")) throw new Error(`${label} is not valid XML. Check for missing tags or unescaped characters.`);
    const root = parsed.documentElement;
    if (!root || root.localName !== "Package") throw new Error(`${label} must have a <Package> root element.`);
    const versionNode = [...root.children].find(node => node.localName === "version");
    const version = versionNode ? versionNode.textContent.trim() : "";
    const entries = new Map();
    const wildcards = new Set();
    const types = [...root.children].filter(node => node.localName === "types");
    types.forEach(typeNode => {
      const nameNode = [...typeNode.children].find(node => node.localName === "name");
      const typeName = nameNode ? nameNode.textContent.trim() : "";
      if (!typeName) throw new Error(`${label} contains a <types> block without a <name>.`);
      const memberNodes = [...typeNode.children].filter(node => node.localName === "members");
      if (!memberNodes.length) throw new Error(`${label} contains metadata type "${typeName}" without any <members>.`);
      memberNodes.forEach(memberNode => {
        const member = memberNode.textContent.trim();
        if (!member) throw new Error(`${label} contains an empty <members> entry for ${typeName}.`);
        if (member === "*") wildcards.add(typeName);
        const key = `${typeName}\u0000${member}`;
        entries.set(key, { type: typeName, member });
      });
    });
    if (!types.length) throw new Error(`${label} doesn't contain any <types> entries to compare.`);
    return { entries, version, wildcards };
  }

  function runComparison() {
    compareError.hidden = true;
    compareResults.hidden = true;
    try {
      const a = parseManifest(compareGeneratedXml.value, "Your generated XML");
      const b = parseManifest(comparePastedXml.value, "Pasted XML");
      const wildcardTypes = new Set([...a.wildcards, ...b.wildcards]);
      comparisonRows = [];
      const allKeys = new Set([...a.entries.keys(), ...b.entries.keys()]);
      allKeys.forEach(key => {
        const item = a.entries.get(key) || b.entries.get(key);
        const inA = a.entries.has(key), inB = b.entries.has(key);
        let status = inA && inB ? "unchanged" : inB ? "added" : "removed";
        if (wildcardTypes.has(item.type) && item.member !== "*") status = "ambiguous";
        comparisonRows.push({ ...item, status });
      });
      comparisonRows.sort((x, y) => x.type.localeCompare(y.type) || x.member.localeCompare(y.member));
      document.getElementById("compare-added-count").textContent = comparisonRows.filter(r => r.status === "added").length;
      document.getElementById("compare-removed-count").textContent = comparisonRows.filter(r => r.status === "removed").length;
      document.getElementById("compare-unchanged-count").textContent = comparisonRows.filter(r => r.status === "unchanged").length;
      const ambiguous = comparisonRows.filter(r => r.status === "ambiguous").length;
      compareSummary.textContent = `${comparisonRows.length} unique type/member entries compared${ambiguous ? ` · ${ambiguous} wildcard-affected entries need manual review` : ""}.`;
      if (a.version && b.version && a.version !== b.version) {
        compareVersionNote.textContent = `API version differs: generated XML uses ${a.version}, while pasted XML uses ${b.version}. Version differences do not change the member comparison.`;
        compareVersionNote.hidden = false;
      }
      if (wildcardTypes.size) {
        compareWildcardNote.textContent = `Wildcard detected for ${[...wildcardTypes].sort().join(", ")}. A member of "*" represents all members of that metadata type, so entries for these types are marked "Needs review" instead of being treated as definite additions or removals.`;
        compareWildcardNote.hidden = false;
      }
      comparisonFilter = "all";
      compareFilters.forEach(button => {
        const active = button.dataset.compareFilter === "all";
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      compareResults.hidden = false;
      renderComparisonRows();
    } catch (error) {
      compareError.textContent = error instanceof Error ? error.message : "Unable to compare these manifests.";
      compareError.hidden = false;
    }
  }

  function renderComparisonRows() {
    compareResultList.replaceChildren();
    const query = compareResultSearch.value.trim().toLowerCase();
    const rows = comparisonRows.filter(row => {
      const filterMatch = comparisonFilter === "all" || row.status === comparisonFilter;
      const searchMatch = `${row.type} ${row.member} ${row.status}`.toLowerCase().includes(query);
      return filterMatch && searchMatch;
    });
    const header = document.createElement("div");
    header.className = "compare-result-row header";
    ["Status", "Metadata type", "Member"].forEach(text => {
      const cell = document.createElement("span");
      cell.textContent = text;
      header.append(cell);
    });
    compareResultList.append(header);
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "compare-empty";
      empty.textContent = comparisonRows.length ? "No results match your search or filter." : "These manifests have no metadata members to compare.";
      compareResultList.append(empty);
      return;
    }
    rows.forEach(row => {
      const line = document.createElement("div");
      line.className = "compare-result-row";
      const statusCell = document.createElement("span");
      statusCell.className = `compare-status ${row.status}`;
      statusCell.textContent = ({ added: "+ Added", removed: "− Removed", unchanged: "✓ Unchanged", ambiguous: "⚠ Needs review" })[row.status];
      const typeCell = document.createElement("span");
      typeCell.textContent = row.type;
      const memberCell = document.createElement("span");
      memberCell.className = "result-member";
      memberCell.textContent = row.member;
      line.append(statusCell, typeCell, memberCell);
      compareResultList.append(line);
    });
  }

  compareOpenButton.addEventListener("click", openCompareModal);
  compareCloseButton.addEventListener("click", closeCompareModal);
  compareModal.querySelectorAll("[data-close-compare]").forEach(element => element.addEventListener("click", closeCompareModal));
  compareRunButton.addEventListener("click", runComparison);
  compareResultSearch.addEventListener("input", renderComparisonRows);
  compareFilters.forEach(button => button.addEventListener("click", () => {
    comparisonFilter = button.dataset.compareFilter;
    compareFilters.forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    renderComparisonRows();
  }));
  document.getElementById("compare-reset-button").addEventListener("click", () => {
    comparisonRows = [];
    compareResults.hidden = true;
    compareVersionNote.hidden = true;
    compareWildcardNote.hidden = true;
    compareResultSearch.value = "";
    compareError.hidden = true;
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !compareModal.hidden) closeCompareModal();
  });

  standardModeButton.addEventListener("click", () => setMode("package"));
  destructiveModeButton.addEventListener("click", () => setMode("destructive"));
  search.addEventListener("input", renderTypes);
  versionSelect.addEventListener("change", updatePreview);
  document.getElementById("generate-button").addEventListener("click", downloadXml);
  document.getElementById("copy-button").addEventListener("click", copyXml);
  document.getElementById("clear-button").addEventListener("click", () => {
    selected.clear();
    values.clear();
    search.value = "";
    versionSelect.value = "66.0";
    renderTypes();
    renderEditors();
    updatePreview();
    validation.classList.remove("error", "warning", "success");
    validation.textContent = "All selections cleared. Choose metadata types to start a new manifest.";
    status.textContent = "Ready to build";
    status.classList.remove("success");
  });

  renderTypes();
  renderEditors();
  updatePreview();
})();
