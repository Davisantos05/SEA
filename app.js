'use strict';
// Demonstração LOCAL. Perfis e dados neste arquivo não substituem autenticação e regras de segurança no servidor.
const DATA_KEY = 'sea-mcm-campeonatos-v3';
const LEGACY_KEYS = ['sea-mcm-campeonatos-v2','sea-mcm-campeonatos-v1'];
const ACCOUNTS_KEY = 'sea-mcm-demo-users-v1';
const SESSION_KEY = 'sea-mcm-demo-session-v2';
const ADMIN_EMAIL = 'seamcm2a@gmail.com';
const ADMIN_DEMO_PASSWORD = '@23032026';
const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const uid = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const state = {user:null,mode:'public',page:'inicio',authEmail:'',detailId:null,googleAuth:null};
let champs = readChamps();

function safeGet(storage,key){try{return storage.getItem(key)}catch{return null}}
function safeSet(storage,key,value){try{storage.setItem(key,value);return true}catch{return false}}
function cleanChamps(items){
  if(!Array.isArray(items))return [];
  return items.filter(c=>c && typeof c.id==='string' && typeof c.nome==='string')
    .map(c=>({id:c.id,nome:c.nome,modalidade:typeof c.modalidade==='string'?c.modalidade:'Outro',data:typeof c.data==='string'?c.data:'',status:typeof c.status==='string'?c.status:'Planejado',teams:Array.isArray(c.teams)?c.teams.filter(t=>t&&typeof t.id==='string'&&typeof t.nome==='string'):[],matches:Array.isArray(c.matches)?c.matches.filter(m=>m&&typeof m.id==='string'&&typeof m.a==='string'&&typeof m.b==='string'&&Number.isFinite(Number(m.sa))&&Number.isFinite(Number(m.sb))):[]}));
}
function readChamps(){
  for(const key of [DATA_KEY,...LEGACY_KEYS]){
    const raw=safeGet(localStorage,key);
    if(raw){try{return cleanChamps(JSON.parse(raw))}catch{/* tente versão anterior */}}
  }
  return [];
}
function saveChamps(){const success=safeSet(localStorage,DATA_KEY,JSON.stringify(champs));if(!success)toast('Não foi possível gravar os campeonatos neste navegador.',true);return success}
function loadAccounts(){try{const a=JSON.parse(safeGet(localStorage,ACCOUNTS_KEY)||'[]');return Array.isArray(a)?a:[]}catch{return []}}
function persistAccounts(a){return safeSet(localStorage,ACCOUNTS_KEY,JSON.stringify(a))}
function userNameFromEmail(email){return email.split('@')[0]}
function isAdmin(){return state.user?.role==='admin'}
function canManage(){return isAdmin()&&state.mode==='admin'}
function getSession(){try{const s=JSON.parse(safeGet(sessionStorage,SESSION_KEY)||'null');return s&&typeof s.email==='string'&&['public','admin'].includes(s.role)?s:null}catch{return null}}
function startSession(email,name,role,provider='local'){
  state.user={email,name,role,provider};state.mode=role==='admin'?'admin':'public';state.page='inicio';
  safeSet(sessionStorage,SESSION_KEY,JSON.stringify(state.user));
  $('#auth').classList.add('is-hidden');$('#app').classList.remove('is-hidden');
  hideAuthError();renderAll();
}
function logout(){
  try{sessionStorage.removeItem(SESSION_KEY)}catch{}
  state.user=null;state.mode='public';state.page='inicio';
  $('#app').classList.add('is-hidden');$('#auth').classList.remove('is-hidden');
  authStep('start');$('#email-step-form').reset();$('#password-form').reset();$('#register-form').reset();
  // login com Google também precisa encerrar sessão no Firebase quando usado.
  if(state.googleAuth){state.googleAuth.signOut().catch(()=>{});state.googleAuth=null}
}
function authStep(step){
  for(const key of ['start','password','register'])$('#auth-step-'+key).classList.toggle('is-hidden',key!==step);
  hideAuthError();
}
function authError(msg){const el=$('#auth-error');el.textContent=msg;el.classList.remove('is-hidden')}
function hideAuthError(){const el=$('#auth-error');el.textContent='';el.classList.add('is-hidden')}
function info(title,msg){$('#info-title').textContent=title;$('#info-body').textContent=msg;$('#info-dialog').showModal()}
async function hashDemoPassword(email,password){
  const value=`SEA-MCM-DEMO-V1:${email.toLowerCase()}:${password}`;
  if(globalThis.crypto?.subtle){
    const encoded=new TextEncoder().encode(value);
    const digest=await crypto.subtle.digest('SHA-256',encoded);
    return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  // Alternativa de compatibilidade para navegadores que restringem Web Crypto em file://.
  let h=2166136261;
  for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}
  return 'demo-'+(h>>>0).toString(16);
}
function goNextWithEmail(email){
  const clean=String(email).trim().toLowerCase();
  state.authEmail=clean;
  if(clean===ADMIN_EMAIL){
    $('#password-title').textContent='Acesso da organização';
    $('#password-email').textContent=clean;
    $('#admin-demo-hint').classList.remove('is-hidden');
    authStep('password');$('#password-input').focus();return;
  }
  const found=loadAccounts().find(u=>u.email===clean);
  if(found){
    $('#password-title').textContent='Bem-vindo de volta';
    $('#password-email').textContent=clean;
    $('#admin-demo-hint').classList.add('is-hidden');
    authStep('password');$('#password-input').focus();
  }else{
    authStep('register');$('#register-name').focus();
  }
}
async function emailLogin(password){
  const email=state.authEmail;
  if(email===ADMIN_EMAIL){
    if(password!==ADMIN_DEMO_PASSWORD){authError('Senha de demonstração incorreta. Confira a dica abaixo.');return}
    startSession(email,'Organização SEA-MCM','admin','demo');return;
  }
  const user=loadAccounts().find(u=>u.email===email);
  if(!user){authError('Esta conta de teste não foi encontrada. Volte e crie seu cadastro.');return}
  const supplied=await hashDemoPassword(email,password);
  if(supplied!==user.hash){authError('Senha incorreta para esta conta local.');return}
  startSession(email,user.name,'public','demo');
}
async function emailRegister(name,password,confirm){
  if(password.length<8){authError('Crie uma senha de teste com pelo menos 8 caracteres.');return}
  if(password!==confirm){authError('As senhas digitadas são diferentes.');return}
  const email=state.authEmail;
  if(email===ADMIN_EMAIL){authError('Esta conta é reservada para a organização.');return}
  const accounts=loadAccounts();
  if(accounts.some(u=>u.email===email)){authError('Já existe cadastro local para este e-mail. Volte e entre.');return}
  const hash=await hashDemoPassword(email,password);
  accounts.push({email,name:name.trim(),hash});
  if(!persistAccounts(accounts)){authError('Não foi possível salvar seu cadastro de teste no navegador.');return}
  startSession(email,name.trim(),'public','demo');
}

function loadRemoteScript(url){return new Promise((resolve,reject)=>{const src=document.createElement('script');src.src=url;src.onload=resolve;src.onerror=()=>reject(new Error('Não foi possível carregar o Firebase. Verifique sua internet.'));document.head.append(src)})}
let firebaseReady=null;
async function ensureFirebase(){
  if(!window.SEA_FIREBASE_CONFIG?.apiKey || !window.SEA_FIREBASE_CONFIG?.authDomain)throw new Error('Login Google real ainda não configurado. Abra CONFIGURAR_GOOGLE.md, configure o Firebase e use localhost ou HTTPS. A entrada por e-mail de demonstração e a área pública já funcionam offline.');
  if(location.protocol==='file:')throw new Error('O login Google real precisa ser aberto via servidor local (INICIAR_SERVIDOR_LOCAL.bat) ou domínio HTTPS autorizado, não diretamente pelo arquivo HTML.');
  if(!firebaseReady){firebaseReady=(async()=>{
    await loadRemoteScript('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
    await loadRemoteScript('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth-compat.js');
    if(!firebase.apps.length)firebase.initializeApp(window.SEA_FIREBASE_CONFIG);
    return firebase.auth();
  })().catch(err=>{firebaseReady=null;throw err})}
  return firebaseReady;
}
async function googleLogin(){
  const button=$('#google-btn');button.disabled=true;
  try{
    const auth=await ensureFirebase();
    const result=await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    const user=result.user;
    if(!user?.email || !user.emailVerified)throw new Error('A conta Google não retornou um e-mail verificado.');
    state.googleAuth=auth;
    const email=user.email.toLowerCase();
    startSession(email,user.displayName||userNameFromEmail(email),email===ADMIN_EMAIL?'admin':'public','google');
  }catch(err){
    const msg=err?.code==='auth/popup-closed-by-user'?'O login Google foi cancelado.':err?.message||'Falha ao autenticar com Google. Verifique seu projeto Firebase.';
    info('Acesso com Google',msg);
  }finally{button.disabled=false}
}

function toast(msg,isError=false){
  const box=$('#alert');box.textContent=msg;box.className=`notice${isError?' error':''}`;
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>{box.textContent='';box.className=''},6000);
}
function el(tag,text='',cls=''){const n=document.createElement(tag);n.textContent=String(text);if(cls)n.className=cls;return n}
function addButton(text,handler,cls=''){const button=el('button',text,cls);button.type='button';button.addEventListener('click',handler);return button}
function datePt(iso){if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))return 'Data a definir';const [y,m,d]=iso.split('-');return `${d}/${m}/${y}`}
function sportEmoji(sport){return ({Futsal:'⚽',Vôlei:'🏐',Basquete:'🏀',Handebol:'🤾',Xadrez:'♟️',FIFA:'🎮',UNO:'🃏'})[sport]||'🏆'}
function goPage(page){
  if(page==='configuracoes'&&!canManage())page='inicio';
  if(!['inicio','campeonatos','classificacao','configuracoes'].includes(page))page='inicio';
  state.page=page;
  $$('.page').forEach(n=>n.classList.toggle('is-hidden',n.id!=='page-'+page));
  $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===page));
  $('#page-title').textContent={inicio:canManage()?'Painel administrativo':'Início',campeonatos:'Campeonatos',classificacao:'Classificação',configuracoes:'Gestão e backup'}[page];
  $('#top-context').textContent=canManage()?'PAINEL DE CONTROLE':'PORTAL DOS JOGOS';
  renderViews();
}
function renderRole(){
  const admin=canManage();
  $$('.admin-only:not(.page)').forEach(n=>n.classList.toggle('is-hidden',!admin));
  $('#side-mode').textContent=admin?'ADMINISTRAÇÃO':'ÁREA PÚBLICA';
  $('#mode-badge').textContent=admin?'Administrador':'Área pública';
  $('#home-nav-label').textContent=admin?'Painel':'Início';
  $('#user-label').textContent=state.user?.name||'Visitante';
  $('#role-label').textContent=admin?'Gestão dos jogos':'Consulta de resultados';
  $('#switch-mode').classList.toggle('is-hidden',!isAdmin());
  $('#switch-mode').textContent=admin?'Ver área pública':'Voltar à administração';
  $('#hero-title').textContent=admin?'Todos os jogos, sob controle.':'O jogo começa aqui.';
  $('#hero-desc').textContent=admin?'Gerencie campeonatos, equipes e resultados em um só lugar.':'Explore os campeonatos, confira os placares e acompanhe as classificações.';
  $('#hero-action').innerHTML=admin?'Criar campeonato <span>↗</span>':'Explorar campeonatos <span>↗</span>';
  $('#champs-subtitle').textContent=admin?'Organize e edite as competições da SEA-MCM.':'Consulte as competições, equipes e resultados da SEA-MCM.';
}
function buildCard(c){
  const card=el('article','','champ-card'),top=el('div','','champ-card-top');
  const ico=el('span',sportEmoji(c.modalidade),'sport-icon');
  const status=el('span',c.status||'Planejado','status-pill'+(c.status==='Em andamento'?' active':c.status==='Concluído'?' done':''));
  top.append(ico,status);
  const mid=el('div');mid.append(el('h4',c.nome),el('p',`${c.modalidade} · ${datePt(c.data)}`));
  const foot=el('div','','champ-card-bottom'),sm=el('small',`${(c.teams||[]).length} equipes · ${(c.matches||[]).length} partidas`),actions=el('div','','card-actions');
  actions.append(addButton('Ver detalhes',()=>openDetail(c.id)));
  if(canManage()){
    actions.append(addButton('Editar',()=>openChampForm(c)));
    actions.append(addButton('Excluir',()=>deleteChamp(c.id),'danger'));
  }
  foot.append(sm,actions);card.append(top,mid,foot);return card;
}
function emptyCard(parent,message){
  const wrap=el('div','','empty-state');wrap.append(el('div','🏆','empty-icon'),el('strong','Nenhum campeonato por aqui.'),el('p',message));parent.append(wrap);
}
function showCards(container,items,emptyMessage){container.replaceChildren();if(!items.length){emptyCard(container,emptyMessage);return}items.forEach(c=>container.append(buildCard(c)))}
function renderViews(){
  $('#stat-champs').textContent=champs.length;
  $('#stat-teams').textContent=champs.reduce((sum,c)=>sum+(c.teams?.length||0),0);
  $('#stat-matches').textContent=champs.reduce((sum,c)=>sum+(c.matches?.length||0),0);
  showCards($('#home-list'),[...champs].reverse().slice(0,4),canManage()?'Crie seu primeiro campeonato usando o botão acima.':'Assim que a organização cadastrar competições, elas aparecerão aqui.');
  const search=$('#search-champ').value.trim().toLowerCase(),status=$('#filter-status').value;
  const filtered=champs.filter(c=>(!search||`${c.nome} ${c.modalidade}`.toLowerCase().includes(search))&&(!status||c.status===status));
  showCards($('#champ-list'),[...filtered].reverse(),'Nenhum campeonato encontrado para este filtro.');
  const sel=$('#classification-select'),prev=sel.value;
  sel.replaceChildren();
  champs.forEach(c=>sel.append(new Option(c.nome,c.id)));
  if(champs.some(c=>c.id===prev))sel.value=prev;
  renderClassification();
}
function renderAll(){renderRole();goPage(state.page)}
function openChampForm(c=null){
  if(!canManage())return;
  const f=$('#champ-form');f.reset();
  f.elements.namedItem('id').value=c?.id||'';
  f.elements.namedItem('nome').value=c?.nome||'';
  f.elements.namedItem('modalidade').value=c?.modalidade||'Futsal';
  f.elements.namedItem('data').value=c?.data||'';
  f.elements.namedItem('status').value=c?.status||'Planejado';
  $('#champ-dialog-title').textContent=c?'Editar campeonato':'Novo campeonato';
  $('#champ-dialog').showModal();
}
function deleteChamp(id){
  if(!canManage())return;
  if(!confirm('Excluir este campeonato e TODOS os seus resultados? Esta ação não pode ser desfeita.'))return;
  champs=champs.filter(c=>c.id!==id);
  if(saveChamps()){renderViews();toast('Campeonato excluído com sucesso.')}
}
function currentChamp(){return champs.find(c=>c.id===state.detailId)}
function openDetail(id){state.detailId=id;renderDetail();$('#detail-dialog').showModal()}
function renderDetail(){
  const c=currentChamp();if(!c)return;
  $('#detail-title').textContent=c.nome;
  $('#detail-meta').textContent=`${c.modalidade} · ${datePt(c.data)} · ${c.status}`;
  $('#team-form').classList.toggle('is-hidden',!canManage());
  $('#match-form').classList.toggle('is-hidden',!canManage());
  const list=$('#team-list');list.replaceChildren();
  c.teams.forEach(t=>{
    const item=el('div','','mini-item');item.append(el('span',t.nome));
    if(canManage())item.append(addButton('Remover',()=>{
      if(c.matches.some(m=>m.a===t.id||m.b===t.id)){toast('Remova as partidas vinculadas antes de excluir esta equipe.',true);return}
      if(!confirm(`Excluir a equipe ${t.nome}?`))return;
      c.teams=c.teams.filter(x=>x.id!==t.id);saveChamps();renderDetail();renderViews();
    }));
    list.append(item);
  });
  if(!c.teams.length)list.append(el('p','Nenhuma equipe cadastrada.','mini-empty'));
  for(const key of ['teamA','teamB']){
    const select=$(`#match-form [name="${key}"]`);select.replaceChildren();
    c.teams.forEach(t=>select.append(new Option(t.nome,t.id)));
  }
  if(c.teams.length>1)$('#match-form [name="teamB"]').selectedIndex=1;
  const matches=$('#match-list');matches.replaceChildren();
  c.matches.forEach(m=>{
    const a=c.teams.find(t=>t.id===m.a)?.nome||'Equipe',b=c.teams.find(t=>t.id===m.b)?.nome||'Equipe';
    const item=el('div','','mini-item');item.append(el('span',`${a} ${m.sa} × ${m.sb} ${b}`));
    if(canManage())item.append(addButton('Remover',()=>{
      if(!confirm('Excluir o registro desta partida?'))return;
      c.matches=c.matches.filter(x=>x.id!==m.id);saveChamps();renderDetail();renderViews();
    }));
    matches.append(item);
  });
  if(!c.matches.length)matches.append(el('p','Nenhum resultado registrado.','mini-empty'));
}
function renderClassification(){
  const body=$('#classification-body'),c=champs.find(x=>x.id===$('#classification-select').value);body.replaceChildren();
  if(!c){const tr=el('tr'),td=el('td','Selecione um campeonato cadastrado.');td.colSpan=8;tr.append(td);body.append(tr);return}
  const rows=c.teams.map(t=>({id:t.id,nome:t.nome,p:0,j:0,v:0,e:0,d:0,sg:0}));
  for(const m of c.matches){
    const a=rows.find(r=>r.id===m.a),b=rows.find(r=>r.id===m.b),sa=Number(m.sa),sb=Number(m.sb);
    if(!a||!b||!Number.isFinite(sa)||!Number.isFinite(sb))continue;
    a.j++;b.j++;a.sg+=sa-sb;b.sg+=sb-sa;
    if(sa>sb){a.v++;a.p+=3;b.d++}else if(sa<sb){b.v++;b.p+=3;a.d++}else{a.e++;b.e++;a.p++;b.p++}
  }
  rows.sort((a,b)=>b.p-a.p||b.v-a.v||b.sg-a.sg||a.nome.localeCompare(b.nome,'pt-BR'));
  for(const [i,r] of rows.entries()){
    const tr=el('tr');[i+1,r.nome,r.p,r.j,r.v,r.e,r.d,r.sg].forEach((v,index)=>{const td=el('td',v,index===0?'rank':'');tr.append(td)});body.append(tr);
  }
  if(!rows.length){const tr=el('tr'),td=el('td','Nenhuma equipe cadastrada neste campeonato.');td.colSpan=8;tr.append(td);body.append(tr)}
}
function sampleChamp(){
  if(!canManage())return;
  const id=uid(),names=['2º A','2º B','2º C','2º D'];
  const teams=names.map(nome=>({id:uid(),nome}));
  champs.push({id,nome:'Interclasses 2026 · EXEMPLO',modalidade:'Futsal',data:'2026-10-15',status:'Em andamento',teams,matches:[{id:uid(),a:teams[0].id,b:teams[1].id,sa:3,sb:1},{id:uid(),a:teams[2].id,b:teams[3].id,sa:2,sb:2},{id:uid(),a:teams[1].id,b:teams[2].id,sa:1,sb:0}]});
  if(saveChamps()){goPage('campeonatos');toast('Campeonato fictício adicionado para testes.')}
}
function exportData(){
  if(!canManage())return;
  const blob=new Blob([JSON.stringify({version:1,championships:champs},null,2)],{type:'application/json'});
  const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='backup-sea-mcm.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
async function importData(file){
  if(!canManage()||!file)return;
  try{
    const payload=JSON.parse(await file.text());
    if(payload.version!==1||!Array.isArray(payload.championships))throw new Error('Formato inválido');
    const cleaned=cleanChamps(payload.championships);
    if(cleaned.length!==payload.championships.length)throw new Error('O arquivo contém campeonatos incompletos');
    if(!confirm('Substituir todos os campeonatos atuais pelos dados do backup?'))return;
    champs=cleaned;if(saveChamps()){renderViews();toast('Backup importado com sucesso.')}
  }catch(err){toast('Falha ao importar: '+(err.message||'arquivo inválido'),true)}
}
function bind(){
  $('#email-step-form').addEventListener('submit',ev=>{ev.preventDefault();goNextWithEmail($('#email-input').value)});
  $('#password-form').addEventListener('submit',async ev=>{ev.preventDefault();await emailLogin($('#password-input').value)});
  $('#register-form').addEventListener('submit',async ev=>{ev.preventDefault();await emailRegister($('#register-name').value,$('#register-password').value,$('#register-confirm').value)});
  $$('[data-auth-back]').forEach(btn=>btn.addEventListener('click',()=>authStep('start')));
  $('#google-btn').addEventListener('click',googleLogin);
  $('#guest-btn').addEventListener('click',()=>startSession('visitante@local','Visitante','public','guest'));
  $('#logout-btn').addEventListener('click',logout);
  $('#logout-mobile').addEventListener('click',logout);
  $('#switch-mode').addEventListener('click',()=>{if(!isAdmin())return;state.mode=canManage()?'public':'admin';renderAll();toast(canManage()?'Visão administrativa ativada.':'Você está visualizando a experiência do público.')} );
  $$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>goPage(btn.dataset.page)));
  $$('[data-go]').forEach(btn=>btn.addEventListener('click',()=>goPage(btn.dataset.go)));
  $$('[data-close]').forEach(btn=>btn.addEventListener('click',()=>$('#'+btn.dataset.close).close()));
  $('#hero-action').addEventListener('click',()=>canManage()?openChampForm():goPage('campeonatos'));
  $('#new-champ-btn').addEventListener('click',()=>openChampForm());
  $('#search-champ').addEventListener('input',renderViews);
  $('#filter-status').addEventListener('change',renderViews);
  $('#classification-select').addEventListener('change',renderClassification);
  $('#seed-sample').addEventListener('click',sampleChamp);
  $('#export-data').addEventListener('click',exportData);
  $('#import-data').addEventListener('change',async ev=>{await importData(ev.target.files[0]);ev.target.value=''});
  $('#champ-form').addEventListener('submit',ev=>{
    ev.preventDefault();if(!canManage())return;
    const f=ev.currentTarget,d=new FormData(f),id=String(d.get('id')),old=champs.find(c=>c.id===id);
    const entry={nome:String(d.get('nome')).trim(),modalidade:String(d.get('modalidade')),data:String(d.get('data')),status:String(d.get('status'))};
    if(!entry.nome||!entry.data)return;
    if(old)Object.assign(old,entry);else champs.push({id:uid(),...entry,teams:[],matches:[]});
    if(saveChamps()){$('#champ-dialog').close();renderViews();toast(old?'Campeonato atualizado.':'Campeonato criado e salvo neste navegador.')}
  });
  $('#team-form').addEventListener('submit',ev=>{
    ev.preventDefault();if(!canManage())return;
    const f=ev.currentTarget,c=currentChamp(),nome=f.elements.namedItem('nome').value.trim();
    if(!c||!nome)return;
    if(c.teams.some(t=>t.nome.toLowerCase()===nome.toLowerCase())){toast('Esta equipe já está cadastrada.',true);return}
    c.teams.push({id:uid(),nome});if(saveChamps()){f.reset();renderDetail();renderViews();toast('Equipe cadastrada.')}
  });
  $('#match-form').addEventListener('submit',ev=>{
    ev.preventDefault();if(!canManage())return;
    const f=ev.currentTarget,c=currentChamp();if(!c)return;
    const a=f.elements.namedItem('teamA').value,b=f.elements.namedItem('teamB').value,sa=Number(f.elements.namedItem('scoreA').value),sb=Number(f.elements.namedItem('scoreB').value);
    if(!a||!b||a===b||!Number.isInteger(sa)||!Number.isInteger(sb)||sa<0||sb<0||sa>999||sb>999){toast('Escolha duas equipes diferentes e placares válidos.',true);return}
    c.matches.push({id:uid(),a,b,sa,sb});
    if(saveChamps()){f.reset();renderDetail();renderViews();toast('Resultado registrado.')}
  });
}
function boot(){
  bind();
  // Pré-carrega a SDK caso o Firebase esteja configurado; evita atrasos no popup do Google.
  if(window.SEA_FIREBASE_CONFIG?.apiKey && location.protocol!=='file:')ensureFirebase().catch(()=>{});
  const previous=getSession();
  if(previous){state.user=previous;state.mode=previous.role==='admin'?'admin':'public';}
  const delay=window.matchMedia('(prefers-reduced-motion: reduce)').matches?300:1350;
  setTimeout(()=>{
    if(previous){$('#app').classList.remove('is-hidden');renderAll()}
    else $('#auth').classList.remove('is-hidden');
    $('#splash').classList.add('leaving');
    setTimeout(()=>$('#splash').remove(),650);
  },delay);
}
boot();
