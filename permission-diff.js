(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const MISSING = 'Not specified';
  const categories = [
    {tag:'objectPermissions',label:'Object Permissions',key:'object',props:['allowCreate','allowRead','allowEdit','allowDelete','viewAllRecords','modifyAllRecords']},
    {tag:'fieldPermissions',label:'Field Permissions',key:'field',props:['readable','editable']},
    {tag:'classAccesses',label:'Apex Class Access',key:'apexClass',props:['enabled']},
    {tag:'pageAccesses',label:'Visualforce Page Access',key:'apexPage',props:['enabled']},
    {tag:'userPermissions',label:'System / User Permissions',key:'name',props:['enabled']},
    {tag:'customPermissions',label:'Custom Permissions',key:'name',props:['enabled']},
    {tag:'flowAccesses',label:'Flow Access',key:'flow',props:['enabled']},
    {tag:'recordTypeVisibilities',label:'Record Type Access',key:'recordType',props:['visible','default']},
    {tag:'tabVisibilities',label:'Tab Settings',key:'tab',props:['visibility']},
    {tag:'customMetadataTypeAccesses',label:'Custom Metadata Type Access',key:'name',props:['enabled']},
    {tag:'customSettingAccesses',label:'Custom Setting Access',key:'name',props:['enabled']},
    {tag:'applicationVisibilities',label:'Application Visibility',key:'application',props:['visible','default']},
    {tag:'externalDataSourceAccesses',label:'External Data Source Access',key:'externalDataSource',props:['enabled']},
    {tag:'layoutAssignments',label:'Layout Assignments',key:null,props:['layout']},
    {tag:'loginHours',label:'Login Hours',key:null,props:['mondayStart','mondayEnd','tuesdayStart','tuesdayEnd','wednesdayStart','wednesdayEnd','thursdayStart','thursdayEnd','fridayStart','fridayEnd','saturdayStart','saturdayEnd','sundayStart','sundayEnd']},
    {tag:'loginIpRanges',label:'Login IP Ranges',key:null,props:['startAddress','endAddress']}
  ];
  const rootSettings = ['custom','userLicense','description'];
  let parsed = [null,null], allRows = [], activeCategory = 'all';
  const text = node => node ? node.textContent.trim() : null;
  const children = (node, tag) => Array.from(node.children).filter(child => child.localName === tag);
  const childValue = (node, tag) => text(children(node, tag)[0]);
  const display = value => value === null || value === undefined ? MISSING : value === '' ? '(empty)' : String(value);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const layoutIdentity = element => {
    const recordType = childValue(element, 'recordType');
    if (recordType) return recordType;
    const layout = childValue(element, 'layout') || '';
    const baseObject = layout.includes('-') ? layout.split('-')[0] : (layout.split('.')[0] || 'Unknown object');
    return `${baseObject} (Master Layout)`;
  };
  const keyFor = (element, category, index) => {
    if (category.tag === 'layoutAssignments') return layoutIdentity(element);
    if (category.tag === 'loginHours') return 'Login Schedule';
    if (category.key) return childValue(element, category.key) ?? `__missing_key_${index}`;
    return `${childValue(element,'startAddress') ?? ''}|${childValue(element,'endAddress') ?? ''}`;
  };
  function parseXML(source, filename) {
    const doc = new DOMParser().parseFromString(source, 'text/xml');
    if (doc.querySelector('parsererror') || doc.doctype) throw new Error(`${filename}: invalid XML or document type declaration.`);
    const root = doc.documentElement;
    if (!root || !['Profile','PermissionSet'].includes(root.localName)) throw new Error(`${filename}: root element must be <Profile> or <PermissionSet>.`);
    const records = [];
    categories.forEach(category => {
      if (category.tag === 'tabVisibilities') return; // Profiles use tabVisibilities; Permission Sets use tabSettings.
      children(root, category.tag).forEach((element,index) => {
        const identity = category.key ? childValue(element,category.key) : null;
        const props = {};
        Array.from(element.children).forEach(child => {
          const isKey = child.localName === category.key;
          const isLayoutRecordTypeKey = category.tag === 'layoutAssignments' && child.localName === 'recordType';
          if (!isKey && !isLayoutRecordTypeKey) props[child.localName] = text(child);
        });
        const key = keyFor(element,category,index);
        let recordIdentity = identity;
        if (category.tag === 'layoutAssignments') recordIdentity = key;
        else if (category.tag === 'loginHours') recordIdentity = 'Login Schedule';
        else if (category.tag === 'loginIpRanges') recordIdentity = key;
        else if (!recordIdentity) recordIdentity = `(missing ${category.key})`;
        records.push({category:category.tag,categoryLabel:category.label,key,identity:recordIdentity,props});
      });
    });
    // Normalize both Profile tabVisibilities and Permission Set tabSettings into one category.
    const tabCategory = categories.find(category => category.tag === 'tabVisibilities');
    const tabNodes = doc.querySelectorAll('tabVisibilities, tabSettings');
    tabNodes.forEach((element,index) => {
      // Ignore any similarly named descendants not directly owned by the metadata root.
      if (element.parentElement !== root) return;
      const identity = childValue(element, 'tab');
      const props = {};
      Array.from(element.children).forEach(child => {
        if (child.localName !== 'tab') props[child.localName] = text(child);
      });
      const key = identity ?? `__missing_key_${index}`;
      records.push({category:tabCategory.tag,categoryLabel:tabCategory.label,key,identity:identity || '(missing tab)',props});
    });
    const rootValues = {};
    [...rootSettings,'label','fullName','license','hasActivationRequired'].forEach(tag => { rootValues[tag] = childValue(root,tag); });
    return {type:root.localName,label:rootValues.label || rootValues.fullName || filename,rootValues,records};
  }
  function makeRow(status, category, identity, setting, before, after) {
    const categoryLabel = category?.label || (category === 'root' ? 'Root Settings' : 'Metadata Details');
    return {status,category:typeof category === 'string' ? category : category.tag,categoryLabel,identity,setting,before,after,search:`${categoryLabel} ${identity} ${setting} ${before ?? ''} ${after ?? ''}`.toLowerCase()};
  }
  function configuredValue(record, category) {
    if (category.tag === 'objectPermissions') {
      const symbols = [['allowCreate','C'],['allowRead','R'],['allowEdit','U'],['allowDelete','D'],['viewAllRecords','V'],['modifyAllRecords','M']];
      const access = symbols.filter(([key]) => record.props[key] === 'true').map(([,symbol])=>symbol).join('');
      return access ? `${access} (${symbols.map(([key])=>`${key}=${display(record.props[key])}`).join(', ')})` : symbols.map(([key])=>`${key}=${display(record.props[key])}`).join(', ');
    }
    return category.props.map(prop => `${prop}=${display(record.props[prop])}`).join('; ');
  }
  function compareRecords(base, target, category) {
    const baseMap = new Map(base.map(record=>[record.key,record]));
    const targetMap = new Map(target.map(record=>[record.key,record]));
    const result=[];
    [...new Set([...baseMap.keys(),...targetMap.keys()])].forEach(key=>{
      const a=baseMap.get(key), b=targetMap.get(key), record=b||a;
      if (!a) { result.push(makeRow('Added',category,record.identity,'Entry','—',configuredValue(record,category))); return; }
      if (!b) { result.push(makeRow('Removed',category,a.identity,'Entry','Present (with config): '+configuredValue(a,category),'—')); return; }
      const props = new Set([...category.props,...Object.keys(a.props),...Object.keys(b.props)]);
      let changed=false;
      props.forEach(prop=>{
        const av=a.props[prop] ?? null, bv=b.props[prop] ?? null;
        if (av !== bv) { changed=true; result.push(makeRow('Changed',category,b.identity,prop,display(av),display(bv))); }
      });
      if (!changed) result.push(makeRow('Unchanged',category,b.identity,'Entry',configuredValue(a,category),configuredValue(b,category)));
    });
    return result;
  }
  function compareRoot(base,target) {
    const result=[];
    [...rootSettings,'label','fullName','license','hasActivationRequired'].forEach(key=>{
      const a=base.rootValues[key], b=target.rootValues[key];
      if (a===b) { if(a!==null) result.push(makeRow('Unchanged','root',key,key,a,b)); return; }
      if(a===null && b!==null) result.push(makeRow('Added','root',key,key,'—',b));
      else if(a!==null && b===null) result.push(makeRow('Removed','root',key,key,a,'—'));
      else result.push(makeRow('Changed','root',key,key,a,b));
    });
    return result;
  }
  function compare() {
    if(!parsed[0]||!parsed[1]) return;
    if(parsed[0].type!==parsed[1].type) { showError(`These files have different root types (${parsed[0].type} and ${parsed[1].type}). Compare two Profiles or two Permission Sets.`); $('results').hidden=true; return; }
    allRows=categories.flatMap(category=>compareRecords(parsed[0].records.filter(r=>r.category===category.tag),parsed[1].records.filter(r=>r.category===category.tag),category)).concat(compareRoot(parsed[0],parsed[1]));
    $('errorBox').hidden=true; $('results').hidden=false; $('emptyState').hidden=true;
    ['Added','Changed','Removed','Unchanged'].forEach(status=>{ $('count'+status).textContent=allRows.filter(row=>row.status===status).length; });
    $('resultSubtitle').textContent=`${parsed[0].type}: ${parsed[0].label} vs ${parsed[1].label}`;
    renderCategoryOptions(); renderRows();
  }
  function renderCategoryOptions() {
    const select=$('categoryFilter'), old=activeCategory;
    const labels=new Map(allRows.map(row=>[row.category,row.categoryLabel]));
    select.innerHTML='<option value="all">All categories</option>'+[...labels].sort((a,b)=>a[1].localeCompare(b[1])).map(([key,label])=>`<option value="${esc(key)}">${esc(label)}</option>`).join('');
    activeCategory=labels.has(old)||old==='all'?old:'all'; select.value=activeCategory;
  }
  function filteredRows() {
    const statuses=new Set(Array.from(document.querySelectorAll('[data-status]:checked')).map(input=>input.dataset.status));
    const query=$('searchInput').value.trim().toLowerCase();
    return allRows.filter(row=>statuses.has(row.status)&&(activeCategory==='all'||row.category===activeCategory)&&(!query||row.search.includes(query)));
  }
  const truthy = value => String(value ?? '').toLowerCase() === 'true';
  const privilegeProps = new Set(['allowCreate','allowRead','allowEdit','allowDelete','viewAllRecords','modifyAllRecords','readable','editable','enabled','visible','default']);
  function impactFor(row) {
    if (row.category === 'root') return {label:'—',kind:'neutral',icon:'•',detail:'Root metadata change; review context'};
    const setting = row.setting;
    const before = row.before, after = row.after;
    if (row.status === 'Added') {
      if (row.category === 'objectPermissions' && /modifyAllRecords=true/i.test(after)) return {label:'Escalation',kind:'escalation',icon:'↗',detail:'Modify All Records granted'};
      if (row.category === 'objectPermissions' && /viewAllRecords=true/i.test(after)) return {label:'Escalation',kind:'escalation',icon:'↗',detail:'View All Records granted'};
      if (/(enabled|visible|default|allowCreate|allowRead|allowEdit|allowDelete|viewAllRecords|modifyAllRecords|readable|editable)=true/i.test(after) || /visibility=DefaultOn/i.test(after)) return {label:'Escalation',kind:'escalation',icon:'↗',detail:'New access granted'};
      return {label:'Review',kind:'neutral',icon:'•',detail:'Component added; review its configuration'};
    }
    if (row.status === 'Removed') return {label:'Restriction',kind:'restriction',icon:'↘',detail:'Permission component removed'};
    if (row.status !== 'Changed') return {label:'No change',kind:'neutral',icon:'•',detail:'No permission change detected'};
    if (setting === 'modifyAllRecords' && truthy(after)) return {label:'High risk',kind:'escalation high-risk',icon:'↗',detail:'Modify All Records enabled'};
    if (setting === 'viewAllRecords' && truthy(after)) return {label:'Escalation',kind:'escalation',icon:'↗',detail:'View All Records enabled'};
    if (privilegeProps.has(setting)) {
      const was = truthy(before), now = truthy(after);
      if (!was && now) return {label:'Escalation',kind:'escalation',icon:'↗',detail:`${setting} granted`};
      if (was && !now) return {label:'Restriction',kind:'restriction',icon:'↘',detail:`${setting} revoked`};
    }
    if (setting === 'visibility') {
      const rank = {Hidden:0,DefaultOff:1,DefaultOn:2};
      if ((rank[after] ?? 0) > (rank[before] ?? 0)) return {label:'Escalation',kind:'escalation',icon:'↗',detail:'Visibility increased'};
      if ((rank[after] ?? 0) < (rank[before] ?? 0)) return {label:'Restriction',kind:'restriction',icon:'↘',detail:'Visibility reduced'};
    }
    return {label:'Review',kind:'neutral',icon:'•',detail:'Setting changed; review manually'};
  }
  function renderRows() {
    const visible=filteredRows();
    $('resultsBody').innerHTML=visible.map(row=>{
      const impact=impactFor(row);
      return `<tr class="impact-row-${impact.kind.split(' ')[0]}"><td><span class="status ${row.status.toLowerCase()}">${row.status}</span></td><td><span class="category-label">${esc(row.categoryLabel)}</span></td><td><div class="permission-name">${esc(row.identity)}</div></td><td><span class="setting-name">${esc(row.setting)}</span></td><td><span class="value ${row.status==='Removed'?'removed':row.status==='Changed'?'changed':''}">${esc(row.before===null?'—':row.before)}</span></td><td><span class="value ${row.status==='Added'?'added':row.status==='Changed'?'changed':''}">${esc(row.after===null?'—':row.after)}</span></td><td><span class="impact ${impact.kind}" title="${esc(impact.detail)}"><span aria-hidden="true">${impact.icon}</span> ${impact.label}</span></td></tr>`;
    }).join('');
    $('emptyResults').hidden=visible.length!==0;
    $('visibleCount').textContent=`Showing ${visible.length} of ${allRows.length} rows`;
  }
  function showError(message) { $('errorBox').textContent=message; $('errorBox').hidden=false; }
  function readFile(index,file) {
    if(!file)return;
    if(!/\.xml$/i.test(file.name) && file.type && !/xml/i.test(file.type)) { showError('Choose an XML file.'); return; }
    const reader=new FileReader();
    reader.onload=()=>{try { const result=parseXML(String(reader.result||''),file.name); parsed[index]=result; const suffix=index?'B':'A'; $('label'+suffix).textContent=file.name; $('meta'+suffix).textContent=`${(file.size/1024).toFixed(1)} KB · ${result.type}`; $('errorBox').hidden=true; if(parsed[0]&&parsed[1])compare(); } catch(error) { parsed[index]=null; showError(error.message||'Could not parse XML.'); $('results').hidden=true; }};
    reader.onerror=()=>showError(`Could not read ${file.name}.`);
    reader.readAsText(file);
  }
  function clearAll() {
    parsed=[null,null];allRows=[];activeCategory='all';
    ['A','B'].forEach(suffix=>{$('file'+suffix).value='';$('label'+suffix).textContent='Choose or drop an XML file';$('meta'+suffix).textContent='Profile or PermissionSet metadata';});
    document.querySelectorAll('[data-status]').forEach(input=>{input.checked=input.dataset.status!=='Unchanged';});
    $('searchInput').value='';$('categoryFilter').innerHTML='<option value="all">All categories</option>';$('results').hidden=true;$('emptyState').hidden=false;$('errorBox').hidden=true;
  }
  ['A','B'].forEach((suffix,index)=>{
    $('file'+suffix).addEventListener('change',event=>readFile(index,event.target.files[0]));
    const zone=$('drop'+suffix);
    zone.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();$('file'+suffix).click();}});
    ['dragenter','dragover'].forEach(type=>zone.addEventListener(type,event=>{event.preventDefault();zone.classList.add('dragover');}));
    ['dragleave','drop'].forEach(type=>zone.addEventListener(type,event=>{event.preventDefault();zone.classList.remove('dragover');}));
    zone.addEventListener('drop',event=>readFile(index,event.dataTransfer.files[0]));
  });
  $('categoryFilter').addEventListener('change',event=>{activeCategory=event.target.value;renderRows();});
  $('searchInput').addEventListener('input',renderRows);
  document.querySelectorAll('[data-status]').forEach(input=>input.addEventListener('change',renderRows));
  $('clearBtn').addEventListener('click',clearAll);
  $('exportBtn').addEventListener('click',()=>{
    const quote=value=>`"${String(value??'').replace(/"/g,'""')}"`;
    const header=['Status','Category','Permission / Component','Setting','Baseline','Compare'];
    const data=filteredRows().map(row=>[row.status,row.categoryLabel,row.identity,row.setting,row.before===null?'—':row.before,row.after===null?'—':row.after]);
    const csv=[header,...data].map(line=>line.map(quote).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8;'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download='salesforce-permission-diff.csv';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
  });
})();
