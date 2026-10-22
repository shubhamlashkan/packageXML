(() => {
const $ = id => document.getElementById(id);
const input = $('formulaInput');
let lastFormatted = '', collapsed = new Set(), nodeId = 0, parseWarnings = [];
const knownKeywords = new Set(['TRUE','FALSE','NULL']);
const operators = ['===','!==','<=','>=','<>','!=','==','&&','||','+','-','*','/','^','=','<','>','&','!'];
function tokenize(src) {
  const out=[]; let i=0;
  while(i<src.length){
    const c=src[i];
    if(/\s/.test(c)){i++;continue;}
    if(c==='"'||c==="'"){
      const start=i, q=c; i++;
      while(i<src.length){if(src[i]==='\\'){i+=2;continue;} if(src[i]===q){if(src[i+1]===q){i+=2;continue;}i++;break;}i++;}
      out.push({type:'string',value:src.slice(start,i)});continue;
    }
    if(/[0-9]/.test(c)||(c==='.'&&/[0-9]/.test(src[i+1]||''))){
      const start=i; i++; while(i<src.length&&/[0-9.eE+-]/.test(src[i])){if((src[i]==='+'||src[i]==='-')&&!/[eE]/.test(src[i-1]))break;i++;}
      out.push({type:'number',value:src.slice(start,i)});continue;
    }
    if(/[A-Za-z_$]/.test(c)){
      const start=i++; while(i<src.length&&/[A-Za-z0-9_.$]/.test(src[i]))i++;
      const value=src.slice(start,i), upper=value.toUpperCase();
      let j=i;while(/\s/.test(src[j]||'')&&j<src.length)j++;
      out.push({type:knownKeywords.has(upper)?'bool':(src[j]==='('? 'function':'identifier'),value});continue;
    }
    const op=operators.find(o=>src.startsWith(o,i));
    if(op){out.push({type:'operator',value:op});i+=op.length;continue;}
    if('(),'.includes(c)){out.push({type:c==='('? 'open':c===')'?'close':'comma',value:c});i++;continue;}
    out.push({type:'unknown',value:c});i++;
  }
  return out;
}
function parse(tokens){
  let p=0;parseWarnings=[];
  function expression(stopAtComma=false){
    const parts=[];
    while(p<tokens.length){
      const t=tokens[p];
      if(t.type==='close'||(stopAtComma&&t.type==='comma'))break;
      if(t.type==='open'){
        p++;const inner=expression(false);
        if(tokens[p]?.type==='close')p++;else parseWarnings.push('Unmatched opening parenthesis');
        parts.push({kind:'group',children:inner,id:++nodeId});continue;
      }
      if(t.type==='function'&&tokens[p+1]?.type==='open'){
        p+=2;const args=[];
        while(p<tokens.length&&tokens[p].type!=='close'){
          const before=p;args.push(expression(true));
          if(tokens[p]?.type==='comma'){p++;continue;}
          if(p===before){p++;break;}
          if(tokens[p]?.type!=='close')break;
        }
        if(tokens[p]?.type==='close')p++;else parseWarnings.push('Unmatched parenthesis in '+t.value);
        parts.push({kind:'call',name:t.value,args,id:++nodeId});continue;
      }
      parts.push({kind:'token',token:t});p++;
    }
    return parts;
  }
  const ast=expression();
  if(tokens.slice(p).some(t=>t.type==='close'))parseWarnings.push('Unmatched closing parenthesis');
  return ast;
}
function nodeText(n){if(n.kind==='token')return n.token.value;if(n.kind==='group')return '('+nodesText(n.children)+')';return n.name+'('+n.args.map(nodesText).join(', ')+')';}
function nodesText(nodes){return nodes.map(nodeText).join(' ');}
function formatNodes(nodes,depth=0){
  const lines=[];const pad='  '.repeat(depth);let line=pad;
  const flush=()=>{if(line.trim()){lines.push(line.replace(/\s+$/,''));line=pad;}};
  function append(s){line+=s;}
  nodes.forEach((n,idx)=>{
    if(n.kind==='call'){
      if(idx>0&&line.trim()&&!/[ (]$/.test(line))append(' ');
      append(n.name+'(');flush();
      if(n.args.length===0){line=pad+')';return;}
      n.args.forEach((arg,ai)=>{
        const argLines=formatNodes(arg,depth+1);
        argLines.forEach((l,li)=>lines.push(l));
        if(ai<n.args.length-1)lines[lines.length-1]+=',';
      });
      line=pad+')';
      if(idx<nodes.length-1)append(' ');
    } else if(n.kind==='group'){
      append('(');flush();formatNodes(n.children,depth+1).forEach(l=>lines.push(l));line=pad+')';
    } else {
      const t=n.token;
      if(t.type==='comma'){flush();return;}
      if(t.type==='operator'){line=line.replace(/\s+$/,'')+' '+t.value+' ';}
      else {if(line.trim()&&!/[ (\.]$/.test(line))append(' ');append(t.value);}
    }
  });
  flush();return lines.length?lines:[pad];
}
function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function highlight(text){
  const toks=tokenize(text);
  return toks.map(t=>`<span class="tok-${t.type==='identifier'?'field':t.type==='function'?'fn':t.type==='unknown'?'field':t.type}">${escapeHtml(t.value)}</span>`).join('');
}
function renderTree(nodes,depth=0,compactMode=false){
  let html='';
  for(let i=0;i<nodes.length;i++){
    const n=nodes[i];
    if(n.kind==='call'){
      const key=String(n.id), isFold=collapsed.has(key);
      const head=`<span class="tok-fn">${escapeHtml(n.name)}</span><span class="tok-paren">(</span>`;
      if(isFold){html+=head+`<button class="fold-toggle" data-fold="${key}" title="Expand ${escapeHtml(n.name)}" aria-label="Expand ${escapeHtml(n.name)}">+</button><span class="collapsed">… ${n.args.length} arg${n.args.length===1?'':'s'}</span><span class="tok-paren">)</span>`;if(i<nodes.length-1)html+='<span> </span>';continue;}
      html+=head;
      if(!compactMode)html+=`<button class="fold-toggle" data-fold="${key}" title="Collapse ${escapeHtml(n.name)}" aria-label="Collapse ${escapeHtml(n.name)}">−</button>`;
      html+='<br>';
      n.args.forEach((arg,ai)=>{html+=`<span class="indent" style="display:inline-block;width:${(depth+1)*2}ch"></span>`+renderTree(arg,depth+1,compactMode);if(ai<n.args.length-1)html+='<span class="tok-comma">,</span>';html+='<br>';});
      html+=`<span style="display:inline-block;width:${depth*2}ch"></span><span class="tok-paren">)</span>`;
      if(i<nodes.length-1)html+='<span> </span>';
    } else if(n.kind==='group'){
      html+='<span class="tok-paren">(</span>'+renderTree(n.children,depth+1,compactMode)+'<span class="tok-paren">)</span>';
    } else {
      const t=n.token, cls=t.type==='identifier'?'field':t.type==='function'?'fn':t.type;
      html+=`<span class="tok-${cls}">${escapeHtml(t.value)}</span>`;
      if(i<nodes.length-1&&t.type!=='comma')html+=' ';
    }
  }
  return html;
}
function walk(nodes,cb){nodes.forEach(n=>{cb(n);if(n.kind==='call')n.args.forEach(a=>walk(a,cb));if(n.kind==='group')walk(n.children,cb);});}
function run(){
  const src=input.value;
  $('inputCount').textContent=src.length+' characters';$('inputLines').textContent=(src?src.split(/\r\n|\r|\n/).length:0)+' lines';
  if(!src.trim()){lastFormatted='';$('output').innerHTML='<div class="formula-empty">Your formatted formula will appear here.</div>';$('outputCount').textContent='Waiting for input';$('status').className='formula-status';$('status').firstElementChild.textContent='Ready to format';$('nestingStatus').textContent='Nesting: —';$('expandBtn').disabled=true;$('collapseBtn').disabled=true;return;}
  nodeId=0;const tokens=tokenize(src), ast=parse(tokens);
  if(parseWarnings.length){
    lastFormatted=src;
    $('output').innerHTML='<div class="formula-empty" style="color:#fca5a5">The formula has unmatched parentheses. The original input is preserved below; check the expression before relying on the formatted view.</div><pre style="margin:0;padding:0 18px 18px;white-space:pre;color:#e5edf8">'+escapeHtml(src)+'</pre>';
    $('outputCount').textContent=(src.split(/\r\n|\r|\n/).length)+' input lines';
    $('status').className='formula-status error';
    $('status').firstElementChild.textContent='Unable to confidently format: '+parseWarnings.join('; ');
    $('nestingStatus').textContent='Nesting: —';
    $('expandBtn').disabled=true;$('collapseBtn').disabled=true;
    return;
  }
  let funcs=[],fields=new Set(),literals=0,maxDepth=0;
  walk(ast,n=>{if(n.kind==='call')funcs.push(n.name);if(n.kind==='token'){if(n.token.type==='identifier'&&!knownKeywords.has(n.token.value.toUpperCase()))fields.add(n.token.value);if(['string','number','bool'].includes(n.token.type))literals++;}});
  function depth(nodes,d=0){maxDepth=Math.max(maxDepth,d);nodes.forEach(n=>{if(n.kind==='call')n.args.forEach(a=>depth(a,d+1));if(n.kind==='group')depth(n.children,d+1);});}depth(ast);
  const formatted=formatNodes(ast).join('\n');lastFormatted=formatted;
  const html=renderTree(ast,0,false);
  $('output').innerHTML=html?`<div class="code-line"><span class="ln">1</span><span class="code-content">${html}</span></div>`:'';
  $('outputCount').textContent=formatted.split('\n').length+' formatted lines';
  $('status').className='formula-status'+(parseWarnings.length?' error':'');
  $('status').firstElementChild.textContent=parseWarnings.length?'Check structure: '+parseWarnings.join('; '):'Structure parsed · Review output before using in production';
  $('nestingStatus').textContent='Nesting: '+maxDepth;
  $('expandBtn').disabled=collapsed.size===0;$('collapseBtn').disabled=funcs.length===0||collapsed.size>=funcs.length;
}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1900);}
input.addEventListener('input',()=>{collapsed.clear();run();});
input.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run();}});
$('clearBtn').onclick=()=>{input.value='';collapsed.clear();run();input.focus();};
$('copyBtn').onclick=async()=>{if(!lastFormatted){toast('Paste a formula first');return;}try{await navigator.clipboard.writeText(lastFormatted);toast('Formatted formula copied');}catch{const ta=document.createElement('textarea');ta.value=lastFormatted;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('Formatted formula copied');}};
$('expandBtn').onclick=()=>{collapsed.clear();run();};
$('collapseBtn').onclick=()=>{function collect(nodes){nodes.forEach(n=>{if(n.kind==='call'){collapsed.add(String(n.id));n.args.forEach(collect);}if(n.kind==='group')collect(n.children);});}nodeId=0;const ast=parse(tokenize(input.value));collect(ast);run();};
$('output').addEventListener('click',e=>{const b=e.target.closest('[data-fold]');if(!b)return;const key=b.dataset.fold;collapsed.has(key)?collapsed.delete(key):collapsed.add(key);run();});
run();
})();
