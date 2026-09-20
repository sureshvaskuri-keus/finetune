(() => {
'use strict';
const CATEGORIES={
  downlights:{label:'Down Lights',file:'./data/downlights.csv'},
  tracklights:{label:'Track Lights',file:'./data/tracklights.csv'},
  profiles:{label:'Profiles',file:'./data/profiles.csv'},
  outdoor:{label:'Outdoor Lights',file:'./data/outdoor-lights.csv'}
};
const aliases={
  name:['name','product name','product'],
  itemNo:['item no','item number','itemno','item code'],
  vf:['vf','voltage'],imax:['imax','current','max current'],
  cct:['cct','colour temperature','color temperature'],cri:['cri'],
  cutout:['cutout','cut out','cut-out'],beam:['beam angle','beam','beamangle'],
  wattage:['wattage','watt','watts','power'],
  batchCode:['batch code','batch','batchcode'],
  stockCode:['stock code','stock','stockcode','sku'],
  bisNo:['bis no','bis number','bisno','bis registration no','bis registration number'],
  bisSpec:['bis sec','bissec','bis spec','bis specification','bisspec','bis standard','is standard'],
  mrp:['mrp','maximum retail price','retail price','price'],
  mfgBy:['mfg by','mfgby','manufacturer','manufactured by','manufacturing by','manufacturer name'],
  newDescription:['new description','newdescription','description','product description'],
  image:['image','image url','image link','imageurl'],
  finish:['finish','colour','color','finish colour','finish color']
};
const finishCodeMap={W:'White',B:'Mat Black',CG:'Champagne Gold',RG:'Rose Gold',BR:'Brown',COF:'Coffee',DGR:'Dark Gray',BB:'Ballet Blue',CH:'Chrome',CHB:'Chrome Black'};
const finishClasses={'White':'sw-white','Mat Black':'sw-mat-black','Champagne Gold':'sw-champagne-gold','Rose Gold':'sw-rose-gold','Brown':'sw-brown','Coffee':'sw-coffee','Dark Gray':'sw-dark-gray','Ballet Blue':'sw-ballet-blue','Chrome':'sw-chrome','Chrome Black':'sw-chrome-black','Standard':'sw-standard'};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const clean=s=>String(s??'').replace(/^\uFEFF/,'').trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
const unique=a=>[...new Set(a.map(v=>String(v??'').trim()).filter(Boolean))];
function delimiter(text){const first=text.replace(/^\uFEFF/,'').split(/\r?\n/).find(x=>x.trim())||'';let q=false,c={',':0,';':0,'\t':0};for(let i=0;i<first.length;i++){const ch=first[i];if(ch==='"'){if(q&&first[i+1]==='"'){i++;continue}q=!q;continue}if(!q&&ch in c)c[ch]++}return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0]}
function parseCSV(text){text=String(text??'').replace(/^\uFEFF/,'');const d=delimiter(text),rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const ch=text[i];if(q){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++}else if(ch==='"')q=false;else cell+=ch}else{if(ch==='"')q=true;else if(ch===d){row.push(cell);cell=''}else if(ch==='\n'){row.push(cell);rows.push(row);row=[];cell=''}else if(ch!=='\r')cell+=ch}}if(cell.length||row.length){row.push(cell);rows.push(row)}return rows.filter(r=>r.some(v=>String(v).trim()))}
function sourceImageUrl(value){const raw=String(value||'').trim();if(!raw)return '';try{const u=new URL(raw,location.href);if(u.hostname==='wsrv.nl'||u.hostname==='images.weserv.nl'){let src=u.searchParams.get('url')||'';if(src&&!/^https?:\/\//i.test(src))src='https://'+src;return src||raw}}catch(_){}return raw}
function optimized(value,w=0){const raw=String(value||'').trim();if(!raw)return '';try{const u=new URL(raw,location.href);if(u.hostname==='wsrv.nl'||u.hostname==='images.weserv.nl'){u.protocol='https:';u.hostname='wsrv.nl';u.searchParams.set('output','webp');u.searchParams.set('q','78');if(w)u.searchParams.set('w',String(w));return u.toString()}if(u.hostname==='i.ibb.co'||u.hostname==='ibb.co'){const p=new URL('https://wsrv.nl/');p.searchParams.set('url',u.href);p.searchParams.set('output','webp');p.searchParams.set('q','78');if(w)p.searchParams.set('w',String(w));return p.toString()}}catch(_){}return raw}
function normalizeFinishText(v){const x=clean(v).replace(/\bdefault\b/g,'').trim();const m={white:'White',w:'White',black:'Mat Black','mat black':'Mat Black','matte black':'Mat Black',b:'Mat Black','champagne gold':'Champagne Gold','champeing gold':'Champagne Gold',cg:'Champagne Gold','rose gold':'Rose Gold',rg:'Rose Gold',brown:'Brown',br:'Brown',coffee:'Coffee',cof:'Coffee','dark gray':'Dark Gray','dark grey':'Dark Gray',dgr:'Dark Gray','ballet blue':'Ballet Blue',bb:'Ballet Blue',chrome:'Chrome',ch:'Chrome','chrome black':'Chrome Black',chb:'Chrome Black'};return m[x]||String(v||'').trim()}
function inferFinish(r){const code=String(r.stockCode||'').trim().toUpperCase();const suffix=code.split('/').filter(Boolean).pop()||'';if(finishCodeMap[suffix])return finishCodeMap[suffix];const img=decodeURIComponent(sourceImageUrl(r.image)).toLowerCase().replace(/_/g,'-');const t=[[/chrome[- ]?black/,'Chrome Black'],[/champagne[- ]?gold|champeing[- ]?gold/,'Champagne Gold'],[/rose[- ]?gold/,'Rose Gold'],[/ballet[- ]?blue/,'Ballet Blue'],[/dark[- ]?gr(?:a|e)y/,'Dark Gray'],[/coffee|cofee/,'Coffee'],[/brown/,'Brown'],[/chrome|crome/,'Chrome'],[/mat[- ]?black|matte[- ]?black|black|balck/,'Mat Black'],[/white/,'White']];for(const [re,l] of t)if(re.test(img))return l;return 'Standard'}
function normalize(rows){if(rows.length<2)return[];const h=rows[0].map(String),map={};h.forEach((x,i)=>map[clean(x)]=i);const idx={};for(const f in aliases){idx[f]=-1;for(const a of aliases[f]){if(clean(a) in map){idx[f]=map[clean(a)];break}}}const get=(r,k)=>idx[k]>=0?String(r[idx[k]]??'').trim():'';return rows.slice(1).map(r=>{const o={};for(const k in idx)o[k]=get(r,k);o.finish=normalizeFinishText(o.finish)||inferFinish(o);return o}).filter(r=>r.name)}
function swatch(f){return `<span class="swatch ${finishClasses[f]||'sw-standard'}"></span>`}

function profileVariationFromDescription(value){
  let s=String(value||'')
    .replace(/<br\s*\/?>/gi,' ')
    .replace(/\r?\n/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .toLowerCase()
    .replace(/transparant/g,'transparent')
    .replace(/transperant/g,'transparent');
  const tests=[
    ['Iron Grey & White Diffuser','iron grey & white diffuser'],
    ['Champagne & White Diffuser','champagne & white diffuser'],
    ['Grey & White Diffuser','grey & white diffuser'],
    ['Black & White Diffuser','black & white diffuser'],
    ['White & White Diffuser','white & white diffuser'],
    ['Black & Black Diffuser','black & black diffuser'],
    ['White & Black Diffuser','white & black diffuser'],
    ['White & Transparent Diffuser','white & transparent diffuser'],
    ['Black & Transparent Diffuser','black & transparent diffuser']
  ];
  for(const [label,phrase] of tests)if(s.includes(phrase))return label;
  if(/\bwhite\b/.test(s))return 'White';
  if(/\bblack\b/.test(s))return 'Black';
  return '';
}
const profileVariationMeta={
  'White':{code:'WH',cls:'pv-white'},
  'Grey & White Diffuser':{code:'GW',cls:'pv-grey-white'},
  'Champagne & White Diffuser':{code:'CW',cls:'pv-champagne-white'},
  'Black & White Diffuser':{code:'BW',cls:'pv-black-white'},
  'Iron Grey & White Diffuser':{code:'IGW',cls:'pv-iron-white'},
  'White & White Diffuser':{code:'WW',cls:'pv-white-white'},
  'Black & Black Diffuser':{code:'BB',cls:'pv-black-black'},
  'White & Black Diffuser':{code:'WB',cls:'pv-white-black'},
  'White & Transparent Diffuser':{code:'WT',cls:'pv-white-transparent'},
  'Black & Transparent Diffuser':{code:'BT',cls:'pv-black-transparent'},
  'Black':{code:'BK',cls:'pv-black'}
};
function profileVariationCode(v){return (profileVariationMeta[v]||{}).code||v||'—'}
function profileVariationSwatch(v){
  const m=profileVariationMeta[v]||{cls:'pv-standard'};
  return `<span class="profile-variation-dot ${m.cls}"></span>`;
}

function spec(l,v){const id=l==='Stock Code'?' id="selectedStockCode"':'';return `<div class="spec"><div class="spec-label">${esc(l)}</div><div class="spec-value"${id}>${esc(v||'—')}</div></div>`}
function specFull(l,v){return `<div class="spec spec-full"><div class="spec-label">${esc(l)}</div><div class="spec-value">${esc(v||'—')}</div></div>`}
function summary(vals,join=' / '){const a=unique(vals);return a.length?a.join(join):'—'}


function profileDescriptionHead(value){
  const parts=String(value||'')
    .replace(/<br\s*\/?>/gi,'\n')
    .split(/\r?\n/)
    .map(s=>s.trim())
    .filter(Boolean);
  return parts[0]||'';
}
function profileFamilyName(row){
  const s=clean(profileDescriptionHead(row.newDescription));
  if(s.startsWith('under cabinet'))return 'Under Cabinet';
  if(s.startsWith('cove profile flexible'))return 'Cove Flexible';
  if(s.startsWith('cove profile'))return 'Cove';
  if(s.startsWith('wide recessed'))return 'Wide Recessed';
  if(s.startsWith('slim recessed'))return 'Slim Recessed';
  if(s.startsWith('slim trimless'))return 'Slim Trimless';
  if(s.startsWith('thin recessed'))return 'Thin Recessed';
  if(s.startsWith('thin surface'))return 'Thin Surface';
  if(s.startsWith('wide surface'))return 'Wide Surface';
  if(s.startsWith('ceiling recessed')||s.startsWith('ceiling trimless'))return 'Ceiling';
  if(s.startsWith('curtain grazer'))return 'Grazer';
  if(s.startsWith('wall mounted'))return 'Wall Mounted UP/DOWN Profile';
  if(s.startsWith('wall grazer'))return 'Wall Grazer Profile';
  if(s.startsWith('lumen fly'))return 'Lumen';
  if(s.startsWith('bendable curve'))return 'Bendable';
  if(s.startsWith('thin trimless')||s.startsWith('wide trimless')||s.startsWith('deep trimless'))return 'Trimless';
  if(s.startsWith('deep surface'))return 'Surface';
  if(s.startsWith('deep recessed'))return 'Recessed';
  if(/^suspended\b/.test(s))return 'Suspended';
  if(s.startsWith('water proof'))return 'Water Proof Profile';
  if(s.startsWith('surface indirect'))return 'Wall Mounted Profile';
  return String(row.name||profileDescriptionHead(row.newDescription)||'Profile').trim();
}
function profileFamilyKey(row){return clean(profileFamilyName(row))}
function profileRowKey(row){return `${String(row.stockCode||'').trim()}::${String(row.newDescription||'').trim()}`}
function profileFastImage(row,w){return row&&row.image?optimized(row.image,w):''}
function profileFallbackImage(row){return row&&row.image?sourceImageUrl(row.image):''}
function profileImageError(img){
  const fb=img.dataset.fallback||'';
  if(fb&&img.dataset.fallbackUsed!=='1'){
    img.dataset.fallbackUsed='1';
    img.src=fb;
    return;
  }
  img.style.display='none';
  const p=img.parentElement;
  if(p&&!p.querySelector('.profile-image-unavailable')){
    const s=document.createElement('span');
    s.className='profile-image-unavailable';
    s.textContent='Image unavailable';
    p.appendChild(s);
  }
}

const params=new URLSearchParams(location.search);
const category=params.get('category')||'downlights';
const product=params.get('product')||'';
let selectedFinish=params.get('finish')||'';
let selectedProfileVariation=params.get('variation')||'';
const requestedProfileKey=params.get('profileKey')||'';
const requestedStockCode=params.get('stockCode')||'';
const requestedDescription=params.get('description')||'';
const cfg=CATEGORIES[category]||CATEGORIES.downlights;
$('breadcrumb').textContent=`${cfg.label} · ${product||'Product Details'}`;
$('backBtn').addEventListener('click',()=>history.length>1?history.back():location.href='index.html');

fetch(encodeURI(cfg.file),{cache:'default'})
.then(r=>{if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return r.text()})
.then(text=>{
  const all=normalize(parseCSV(text));
  const rows=category==='profiles'?all.filter(r=>requestedProfileKey?profileFamilyKey(r)===requestedProfileKey:clean(r.name)===clean(product)):all.filter(r=>clean(r.name)===clean(product));
  if(!rows.length)throw new Error('Product not found in catalogue.');
  render(rows);
  $('app').setAttribute('aria-busy','false');
})
.catch(err=>{
  $('app').innerHTML=`<div class="status"><h2>Product details unavailable</h2><p>${esc(err.message)}</p></div>`;
  $('app').setAttribute('aria-busy','false');
});

function render(rows){
  const isProfile=category==='profiles';
  const name=rows[0].name;

  if(isProfile){
    let selectedIndex=0;
    if(requestedStockCode||requestedDescription){
      const hit=rows.findIndex(r=>
        (!requestedStockCode||r.stockCode===requestedStockCode) &&
        (!requestedDescription||r.newDescription===requestedDescription)
      );
      if(hit>=0)selectedIndex=hit;
    }

    const renderProfileDetail=(idx)=>{
      selectedIndex=Math.max(0,Math.min(rows.length-1,idx));
      const row=rows[selectedIndex];
      const variation=profileVariationFromDescription(row.newDescription);
      const main=profileFastImage(row,900);
      const fallback=profileFallbackImage(row);

      const optionMarkup=rows.map((r,i)=>{
        const v=profileVariationFromDescription(r.newDescription);
        return `<button class="profile-combo-option ${i===selectedIndex?'active':''}" type="button" data-profile-combo="${i}">
          <span class="profile-combo-thumb">${r.image?`<img src="${esc(profileFastImage(r,120))}" data-fallback="${esc(profileFallbackImage(r))}" loading="lazy" decoding="async" fetchpriority="low" onerror="profileImageError(this)" alt="">`:''}</span>
          <span class="profile-combo-copy">
            <b>${esc(r.stockCode||'—')}</b>
            <small>${esc(profileVariationCode(v))} · ${esc(v||'Standard')}</small>
          </span>
        </button>`;
      }).join('');

      $('app').innerHTML=`<section class="layout profile-only exact-profile-detail">
        <div class="visual">
          <div class="image-box">${main?`<img id="mainImage" src="${esc(main)}" data-fallback="${esc(fallback)}" decoding="async" fetchpriority="high" onerror="profileImageError(this)" alt="${esc(name)} · ${esc(row.stockCode||'')}">`:'<span class="profile-image-unavailable">Image unavailable</span>'}</div>
          <div class="profile-combo-wrap">
            <div class="label">Available Variants & Colours</div>
            <div class="profile-combo-options">${optionMarkup}</div>
          </div>
        </div>
        <div class="info">
          <div class="kicker">Profile</div>
          <h1>${esc(name)}</h1>
          <p class="description">${esc(row.newDescription||'—')}</p>
          <div class="spec-grid">
            ${spec('Stock Code',row.stockCode||'—')}
            ${spec('Cutout',row.cutout||'—')}
            ${spec('Colour Variation',variation||'—')}
            ${spec('Variation Code',profileVariationCode(variation))}
          </div>
        </div>
      </section>`;

      document.querySelectorAll('[data-profile-combo]').forEach(btn=>btn.addEventListener('click',()=>{
        const next=Number(btn.dataset.profileCombo||0);
        const chosen=rows[next];
        const url=new URL(location.href);
        url.searchParams.set('stockCode',chosen.stockCode||'');
        url.searchParams.set('description',chosen.newDescription||'');
        history.replaceState(null,'',url);
        renderProfileDetail(next);
      }));

      const profileImageBox=document.querySelector('.exact-profile-detail .image-box');
      if(profileImageBox&&rows.length>1){
        let startX=0,startY=0;
        profileImageBox.addEventListener('touchstart',e=>{
          const t=e.touches&&e.touches[0];
          if(!t)return;
          startX=t.clientX;
          startY=t.clientY;
        },{passive:true});
        profileImageBox.addEventListener('touchend',e=>{
          if(!window.matchMedia('(max-width:780px)').matches)return;
          const t=e.changedTouches&&e.changedTouches[0];
          if(!t)return;
          const dx=t.clientX-startX;
          const dy=t.clientY-startY;
          if(Math.abs(dx)<34||Math.abs(dx)<=Math.abs(dy))return;

          const next=dx<0
            ? (selectedIndex+1)%rows.length
            : (selectedIndex-1+rows.length)%rows.length;

          const chosen=rows[next];
          const url=new URL(location.href);
          url.searchParams.set('stockCode',chosen.stockCode||'');
          url.searchParams.set('description',chosen.newDescription||'');
          history.replaceState(null,'',url);
          renderProfileDetail(next);
        },{passive:true});
      }
    };

    renderProfileDetail(selectedIndex);
    return;
  }

  const finishes=unique(rows.map(r=>r.finish));
  if(!selectedFinish||!finishes.includes(selectedFinish))selectedFinish=finishes.includes('White')?'White':(finishes[0]||'');
  const selectedRows=rows.filter(r=>r.finish===selectedFinish).length?rows.filter(r=>r.finish===selectedFinish):rows;
  const selectedVariant=selectedRows.find(r=>r.image)||selectedRows[0]||rows[0];
  const images=unique(selectedRows.map(r=>r.image));
  const main=(selectedVariant&&selectedVariant.image)||images[0]||'';
  const displayedVariant=selectedRows.find(r=>r.image===main)||selectedVariant||selectedRows[0]||rows[0];
  const mrp=displayedVariant&&displayedVariant.mrp?displayedVariant.mrp:'—';
  const selectedStockCode=displayedVariant&&displayedVariant.stockCode?displayedVariant.stockCode:'—';
  const description=summary(rows.map(r=>r.newDescription),' ');

  const specs=[
    ['Stock Code',selectedStockCode],
    ['Item No.',summary(selectedRows.map(r=>r.itemNo))],
    ['Wattage',summary(selectedRows.map(r=>r.wattage))],
    ['CCT',summary(selectedRows.map(r=>r.cct))],
    ['Vf',summary(selectedRows.map(r=>r.vf))],
    ['Imax',summary(selectedRows.map(r=>r.imax))],
    ['CRI',summary(selectedRows.map(r=>r.cri))],
    ['Beam Angle',summary(selectedRows.map(r=>r.beam))],
    ['Cutout',summary(selectedRows.map(r=>r.cutout))],
    ['Batch Code',summary(selectedRows.map(r=>r.batchCode))],
    ['BIS No',summary(selectedRows.map(r=>r.bisNo))],
    ['BIS SEC',summary(selectedRows.map(r=>r.bisSpec))]
  ].map(([l,v])=>spec(l,v)).join('') + specFull('MFG BY',summary(selectedRows.map(r=>r.mfgBy)));

  $('app').innerHTML=`<section class="layout">
    <div class="visual">
      <div class="image-box">${main?`<img id="mainImage" src="${esc(optimized(main,900))}" alt="${esc(name)}" decoding="async" fetchpriority="high">`:'<span>No image</span>'}</div>
      <div class="thumbs" id="thumbs">${images.map((u,i)=>`<button class="thumb ${i===0?'active':''}" type="button" data-img="${esc(u)}"><img src="${esc(optimized(u,120))}" alt="" loading="lazy" decoding="async" fetchpriority="low"></button>`).join('')}</div>
      <div class="finish-wrap">
        <div class="label">Available Finishes</div>
        <div class="finishes" id="finishes">${finishes.map(f=>`<button class="finish-btn ${f===selectedFinish?'active':''}" type="button" data-finish="${esc(f)}">${swatch(f)}<span>${esc(f)}</span></button>`).join('')}</div>
      </div>
    </div>
    <div class="info">
      <div class="kicker">Lighting Product</div>
      <h1>${esc(name)}</h1>
      <div class="price" id="selectedRate">MRP ${esc(mrp)}</div>
      ${description!=='—'?`<p class="description">${esc(description)}</p>`:''}
      <div class="spec-grid">${specs}</div>
    </div>
  </section>
  <section class="variants">
    <h2>Available Variants</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Finish</th><th>CCT</th><th>Wattage</th><th>Beam</th><th>CRI</th><th>Cutout</th><th>Stock Code</th><th>MRP</th><th>BIS No</th><th>BIS SEC</th></tr></thead>
      <tbody>${selectedRows.map(r=>`<tr><td>${esc(r.finish)}</td><td>${esc(r.cct||'—')}</td><td>${esc(r.wattage||'—')}</td><td>${esc(r.beam||'—')}</td><td>${esc(r.cri||'—')}</td><td>${esc(r.cutout||'—')}</td><td>${esc(r.stockCode||'—')}</td><td>${esc(r.mrp||'—')}</td><td>${esc(r.bisNo||'—')}</td><td>${esc(r.bisSpec||'—')}</td></tr>`).join('')}</tbody>
    </table></div>
  </section>`;

  document.querySelectorAll('[data-img]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-img]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const im=$('mainImage');
    if(im)im.src=optimized(btn.dataset.img,900);

    const row=selectedRows.find(r=>r.image===btn.dataset.img);
    if(row){
      const stock=$('selectedStockCode');
      const rate=$('selectedRate');
      if(stock)stock.textContent=row.stockCode||'—';
      if(rate)rate.textContent=row.mrp?`MRP ${row.mrp}`:'MRP —';
    }
  }));

  document.querySelectorAll('[data-finish]').forEach(btn=>btn.addEventListener('click',()=>{
    selectedFinish=btn.dataset.finish;
    const url=new URL(location.href);
    url.searchParams.set('finish',selectedFinish);
    history.replaceState(null,'',url);
    render(rows);
  }));

  const detailImageBox=document.querySelector('.layout:not(.profile-only) .image-box');
  if(detailImageBox&&finishes.length>1){
    let startX=0,startY=0;
    detailImageBox.addEventListener('touchstart',e=>{
      const t=e.touches&&e.touches[0];
      if(!t)return;
      startX=t.clientX;
      startY=t.clientY;
    },{passive:true});
    detailImageBox.addEventListener('touchend',e=>{
      if(!window.matchMedia('(max-width:780px)').matches)return;
      const t=e.changedTouches&&e.changedTouches[0];
      if(!t)return;
      const dx=t.clientX-startX;
      const dy=t.clientY-startY;
      if(Math.abs(dx)<34||Math.abs(dx)<=Math.abs(dy))return;

      let idx=finishes.indexOf(selectedFinish);
      if(idx<0)idx=0;
      idx=dx<0
        ? (idx+1)%finishes.length
        : (idx-1+finishes.length)%finishes.length;

      selectedFinish=finishes[idx];
      const url=new URL(location.href);
      url.searchParams.set('finish',selectedFinish);
      history.replaceState(null,'',url);
      render(rows);
    },{passive:true});
  }
}

})();

(function(){
  const loader=document.getElementById('keusPageLoader');
  if(!loader)return;
  let hidden=false;
  const hideLoader=()=>{
    if(hidden)return;
    hidden=true;
    requestAnimationFrame(()=>{
      loader.classList.add('is-hidden');
      setTimeout(()=>loader.remove(),320);
    });
  };
  if(document.readyState==='complete')setTimeout(hideLoader,120);
  else window.addEventListener('load',()=>setTimeout(hideLoader,120),{once:true});
  setTimeout(hideLoader,3500);
})();
