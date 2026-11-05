(() => {
  'use strict';
  const CFG=window.DACO_CLOUD_CONFIG||{};
  const EMAIL_DOMAIN='daco-jp.invalid';
  const SESSION_KEY='daco_jp_cloud_session_v1';
  let session=null,currentUser=null,currentProfile=null,authMode='login',syncTimer=null,lastRemotePull=0,syncing=false,localOnly=false,refreshing=null;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const configReady=()=>/^https:\/\/.+\.supabase\.co$/i.test(String(CFG.supabaseUrl||''))&&!/PASTE_/i.test(String(CFG.supabaseAnonKey||''))&&String(CFG.supabaseAnonKey||'').length>20;
  function msg(t,err=false){let e=$('authMsg');if(e){e.textContent=t||'';e.style.color=err?'#b91c1c':'#b45309'}}
  function normalizeUsername(v){return String(v||'').trim().toLowerCase()}
  function validateUsername(v){return /^[a-z0-9_]{3,20}$/.test(v)}
  function emailFor(u){return `${u}@${EMAIL_DOMAIN}`}
  async function backendPassword(u,p){const bytes=new TextEncoder().encode(`DACO-JP-V1|${u}|${p}`);const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')}
  function stateTs(s){return Number(s?._updatedAt||0)}
  function meaningful(s){return window.DACOApp?.hasMeaningfulState?.(s)||false}
  function showGate(show=true){$('authGate')?.classList.toggle('hidden',!show)}
  function setCloudBadge(text,on=true){let e=$('cloudStatusBadge');if(!e)return;e.textContent=text;e.classList.toggle('off',!on)}
  function saveSession(s){session=s||null;if(s)try{localStorage.setItem(SESSION_KEY,JSON.stringify(s))}catch(_){ }else try{localStorage.removeItem(SESSION_KEY)}catch(_){ }}
  function loadSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(_){return null}}
  function setSessionFromResponse(data){if(!data?.access_token)return null;let s={access_token:data.access_token,refresh_token:data.refresh_token||'',expires_at:Date.now()+Number(data.expires_in||3600)*1000,user:data.user||null};saveSession(s);session=s;return s}
  async function parseResponse(res){let text=await res.text(),data={};try{data=text?JSON.parse(text):{}}catch(_){data={message:text||res.statusText}}if(!res.ok){let e=new Error(data.msg||data.message||data.error_description||data.error||`HTTP ${res.status}`);e.status=res.status;e.data=data;throw e}return data}
  async function authRequest(path,{method='GET',body=null,token=null,headers={}}={}){let h={'apikey':CFG.supabaseAnonKey,...headers};if(body!==null)h['Content-Type']='application/json';if(token)h['Authorization']='Bearer '+token;let res=await fetch(CFG.supabaseUrl+path,{method,headers:h,body:body===null?undefined:JSON.stringify(body)});return parseResponse(res)}
  async function refreshSession(){if(refreshing)return refreshing;refreshing=(async()=>{let s=session||loadSession();if(!s?.refresh_token)throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');let data=await authRequest('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:s.refresh_token}});return setSessionFromResponse(data)})().finally(()=>refreshing=null);return refreshing}
  async function ensureSession(){let s=session||loadSession();if(!s?.access_token)return null;session=s;if(Number(s.expires_at||0)<Date.now()+60000){try{s=await refreshSession()}catch(e){saveSession(null);session=null;return null}}return s}
  async function api(path,{method='GET',body=null,prefer='',auth=true}={}){let s=auth?await ensureSession():null;if(auth&&!s)throw new Error('로그인이 필요합니다.');let headers={'apikey':CFG.supabaseAnonKey};if(auth)headers['Authorization']='Bearer '+s.access_token;if(body!==null)headers['Content-Type']='application/json';if(prefer)headers['Prefer']=prefer;let res=await fetch(CFG.supabaseUrl+'/rest/v1/'+path,{method,headers,body:body===null?undefined:JSON.stringify(body)});if(res.status===401&&auth){s=await refreshSession();headers['Authorization']='Bearer '+s.access_token;res=await fetch(CFG.supabaseUrl+'/rest/v1/'+path,{method,headers,body:body===null?undefined:JSON.stringify(body)})}return parseResponse(res)}
  async function rpc(name,body={}){return api('rpc/'+name,{method:'POST',body})}
  function setAuthMode(mode){authMode=mode==='register'?'register':'login';$('loginTab')?.classList.toggle('on',authMode==='login');$('registerTab')?.classList.toggle('on',authMode==='register');$('displayNameField')?.classList.toggle('hidden',authMode!=='register');$('bootstrapAdminBtn')?.classList.toggle('hidden',authMode!=='register');$('authSubmit').textContent=authMode==='login'?'로그인':'아이디 만들기';$('authPassword').autocomplete=authMode==='login'?'current-password':'new-password';msg('')}
  async function submitAuth(){
    if(!configReady()){msg('클라우드 연결 설정이 아직 완료되지 않았습니다.',true);return}
    const u=normalizeUsername($('authUsername')?.value),p=$('authPassword')?.value||'',name=$('authDisplayName')?.value?.trim()||'';
    if(!validateUsername(u)){msg('아이디는 영문 소문자·숫자·_ 조합 3~20자로 입력하세요.',true);return}
    if(p.length<4){msg('비밀번호는 4자 이상 입력하세요.',true);return}
    msg(authMode==='login'?'로그인 중...':'계정 생성 중...');
    try{
      const bp=await backendPassword(u,p),email=emailFor(u);let data;
      if(authMode==='register'){
        data=await authRequest('/auth/v1/signup',{method:'POST',body:{email,password:bp,data:{username:u,display_name:name||u}}});
        if(!data.access_token){msg('계정은 생성됐지만 이메일 확인 설정이 켜져 있습니다. Supabase에서 Confirm email을 꺼주세요.',true);return}
      }else data=await authRequest('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password:bp}});
      setSessionFromResponse(data);await handleSession(session);msg('');
    }catch(e){msg(prettyError(e),true)}
  }
  async function bootstrapAdmin(){$('authUsername').value='admin';$('authPassword').value='admin';$('authDisplayName').value='관리자';authMode='register';await submitAuth()}
  function prettyError(e){let m=String(e?.message||e||'오류');if(/invalid login credentials/i.test(m))return '아이디 또는 비밀번호가 맞지 않습니다.';if(/user already registered|already been registered/i.test(m))return '이미 사용 중인 아이디입니다.';if(/database error/i.test(m))return '계정 생성 DB 설정을 확인해 주세요.';if(/failed to fetch|networkerror/i.test(m))return '인터넷 연결 또는 Supabase 설정을 확인해 주세요.';return m}
  async function fetchProfile(uid){let rows=await api(`profiles?select=*&user_id=eq.${encodeURIComponent(uid)}&limit=1`);return rows?.[0]||null}
  async function fetchProgress(uid){let rows=await api(`learning_progress?select=state,updated_at&user_id=eq.${encodeURIComponent(uid)}&limit=1`);return rows?.[0]||null}
  async function handleSession(s){
    if(!s?.user?.id)return;const uid=s.user.id,guest=window.DACOApp?.getState?.()||{};
    window.DACO_CLOUD_USER_ID=uid;const userLocal=window.DACOApp?.loadLocalForUser?.(uid)||{};
    let profile=await fetchProfile(uid);if(!profile){await new Promise(r=>setTimeout(r,300));profile=await fetchProfile(uid)}
    if(!profile)throw new Error('사용자 프로필을 불러오지 못했습니다. SQL 초기 설정을 확인해 주세요.');
    if(profile.active===false){await logoutSilently();throw new Error('사용이 중지된 계정입니다. 관리자에게 문의하세요.')}
    currentUser=s.user;currentProfile=profile;localOnly=false;try{await rpc('touch_last_login')}catch(_){ }
    const remote=await fetchProgress(uid);let chosen=userLocal,source='이 기기';
    if(remote?.state&&meaningful(remote.state)&&(!meaningful(chosen)||stateTs(remote.state)>=stateTs(chosen))){chosen=remote.state;source='클라우드'}
    if(!meaningful(chosen)&&meaningful(guest)){if(confirm('기존 기기에 저장된 학습기록이 있습니다. 이 계정으로 가져올까요?')){chosen=guest;source='기존 기록'}}
    window.DACOApp?.applyExternalState?.(chosen||{});await syncNow(true);updateAccountUI();showGate(false);setCloudBadge('☁ 동기화됨',true);toastSafe(`${profile.username} 계정 · ${source} 기록으로 시작합니다.`)
  }
  function scheduleSync(){if(localOnly||!currentUser||!configReady()||window.__DACOCloudApplying)return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncNow(false),700)}
  async function syncNow(manual=false){
    if(localOnly){if(manual)toastSafe('현재 로컬 모드입니다.');return false}if(!currentUser){if(manual)toastSafe('로그인이 필요합니다.');return false}if(syncing)return false;syncing=true;
    try{const st=window.DACOApp?.getState?.();if(!st)return false;await api('learning_progress?on_conflict=user_id',{method:'POST',body:{user_id:currentUser.id,state:st,updated_at:new Date().toISOString()},prefer:'resolution=merge-duplicates,return=minimal'});setCloudBadge('☁ 동기화됨',true);if(manual)toastSafe('클라우드에 저장했습니다.');return true}catch(e){setCloudBadge('☁ 저장 대기',false);if(manual)alert('동기화 실패: '+prettyError(e));return false}finally{syncing=false}}
  async function pullRemote(){
    if(localOnly||!currentUser||syncing||!navigator.onLine)return;const now=Date.now();if(now-lastRemotePull<5000)return;lastRemotePull=now;
    try{const data=await fetchProgress(currentUser.id),local=window.DACOApp?.getState?.()||{};if(data?.state&&stateTs(data.state)>stateTs(local)){window.DACOApp.applyExternalState(data.state);toastSafe('다른 기기의 최신 학습기록을 불러왔습니다.');setCloudBadge('☁ 최신',true)}else if(stateTs(local)>stateTs(data?.state||{})){scheduleSync()}}catch(_){setCloudBadge('☁ 오프라인',false)}
  }
  async function logoutSilently(){try{let s=await ensureSession();if(s)await authRequest('/auth/v1/logout',{method:'POST',token:s.access_token})}catch(_){ }saveSession(null);session=null;currentUser=null;currentProfile=null;window.DACO_CLOUD_USER_ID='guest';window.DACOApp?.loadLocalForUser?.('guest');updateAccountUI();showGate(true);setAuthMode('login');setCloudBadge('☁ 로그아웃',false)}
  async function logout(){if(!confirm('로그아웃할까요? 현재 기록은 클라우드와 이 기기에 저장됩니다.'))return;await syncNow(false);await logoutSilently()}
  function continueLocal(){localOnly=true;currentUser=null;currentProfile=null;window.DACO_CLOUD_USER_ID='guest';window.DACOApp?.setGuestMode?.();showGate(false);setCloudBadge('☁ 로컬',false);toastSafe('로컬 모드로 시작합니다.')}
  function updateAccountUI(){let ub=$('cloudUserBtn'),ab=$('adminBtn'),cs=$('cloudSettingsText');if(currentProfile){ub?.classList.remove('hidden');ub.textContent='👤 '+currentProfile.username;ab?.classList.toggle('hidden',currentProfile.role!=='admin');if(cs)cs.textContent=`${currentProfile.username} · 클라우드 자동 동기화 사용 중`}else{ub?.classList.add('hidden');ab?.classList.add('hidden');if(cs)cs.textContent='로그인하면 PC·휴대폰 기록이 자동 동기화됩니다.'}}
  function openAccount(){if(!currentProfile)return;let s=window.DACOApp?.summary?.(window.DACOApp.getState())||{};$('accountInfo').innerHTML=`<div class="panel" style="margin:0"><b style="font-size:20px">${esc(currentProfile.display_name||currentProfile.username)}</b><div style="color:#64748b;margin-top:3px">@${esc(currentProfile.username)} · ${currentProfile.role==='admin'?'관리자':'사용자'}</div><div class="adminCards"><div><b>${s.totalSessions||0}</b><span>학습 세션</span></div><div><b>${s.streak||0}</b><span>연속 학습일</span></div><div><b>${s.learned||0}</b><span>학습한 카드</span></div><div><b>${esc(s.lastStudy||'-')}</b><span>최근 학습일</span></div></div></div>`;$('accountModal').classList.add('on')}
  function closeModal(id){$(id)?.classList.remove('on')}
  function openPasswordChange(){if(!currentProfile){toastSafe('로그인이 필요합니다.');return}$('currentPassword').value='';$('newPassword').value='';$('passwordMsg').textContent='';closeModal('accountModal');$('passwordModal').classList.add('on')}
  async function rawLogin(username,rawPassword){let bp=await backendPassword(username,rawPassword);return authRequest('/auth/v1/token?grant_type=password',{method:'POST',body:{email:emailFor(username),password:bp}})}
  async function changePassword(){let oldp=$('currentPassword').value||'',newp=$('newPassword').value||'',m=$('passwordMsg');if(oldp.length<4||newp.length<4){m.textContent='현재/새 비밀번호를 4자 이상 입력하세요.';return}try{m.textContent='변경 중...';let verified=await rawLogin(currentProfile.username,oldp),newb=await backendPassword(currentProfile.username,newp);let updated=await authRequest('/auth/v1/user',{method:'PUT',body:{password:newb},token:verified.access_token});setSessionFromResponse({...verified,user:updated});m.textContent='비밀번호를 변경했습니다.';m.style.color='#047857';setTimeout(()=>closeModal('passwordModal'),900)}catch(e){m.textContent=prettyError(e);m.style.color='#b91c1c'}}
  async function openAdmin(){if(currentProfile?.role!=='admin')return;$('adminModal').classList.add('on');await loadAdminUsers()}
  async function loadAdminUsers(){
    if(currentProfile?.role!=='admin')return;let box=$('adminUsers');box.innerHTML='<div style="padding:18px;color:#64748b">불러오는 중...</div>';
    try{let profiles=await api('profiles?select=*&order=created_at.asc'),progress=await api('learning_progress?select=user_id,state,updated_at'),pm=new Map((progress||[]).map(x=>[x.user_id,x]));let active=(profiles||[]).filter(x=>x.active!==false).length,admins=(profiles||[]).filter(x=>x.role==='admin').length,totalSessions=0;(progress||[]).forEach(x=>totalSessions+=Number(x.state?.totalSessions||0));$('adminSummary').innerHTML=`<div><b>${profiles?.length||0}</b><span>전체 사용자</span></div><div><b>${active}</b><span>사용 중</span></div><div><b>${admins}</b><span>관리자</span></div><div><b>${totalSessions}</b><span>전체 학습 세션</span></div>`;let rows=(profiles||[]).map(p=>{let pr=pm.get(p.user_id),s=window.DACOApp?.summary?.(pr?.state||{})||{},self=p.user_id===currentUser.id;return `<tr><td><b>${esc(p.username)}</b><br><span style="color:#64748b">${esc(p.display_name||'')}</span></td><td>${p.role==='admin'?'관리자':'사용자'}</td><td>${p.active===false?'⛔ 중지':'✅ 사용'}</td><td>${s.totalSessions||0}</td><td>${s.streak||0}일</td><td>${s.learned||0}</td><td>${fmtDate(p.last_login)}</td><td>${fmtDate(pr?.updated_at)}</td><td><button class="miniBtn" onclick="DACOCloud.adminExport('${p.user_id}','${escAttr(p.username)}')">백업</button> <button class="miniBtn danger" onclick="DACOCloud.adminReset('${p.user_id}','${escAttr(p.username)}')">기록초기화</button> ${self?'':`<button class="miniBtn warn" onclick="DACOCloud.adminToggle('${p.user_id}',${p.active!==false},'${escAttr(p.username)}')">${p.active===false?'사용재개':'사용중지'}</button>`}</td></tr>`}).join('');box.innerHTML=`<div class="adminTableWrap"><table class="adminTable"><thead><tr><th>아이디</th><th>권한</th><th>상태</th><th>세션</th><th>연속</th><th>학습카드</th><th>최근 로그인</th><th>최근 동기화</th><th>관리</th></tr></thead><tbody>${rows||'<tr><td colspan="9">사용자가 없습니다.</td></tr>'}</tbody></table></div>`}catch(e){box.innerHTML=`<div class="setupWarn">관리자 데이터를 불러오지 못했습니다: ${esc(prettyError(e))}</div>`}
  }
  function escAttr(s){return String(s||'').replace(/['"\\]/g,'')}
  function fmtDate(v){if(!v)return '-';try{return new Date(v).toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(_){return '-'}}
  async function adminReset(uid,username){if(!confirm(`${username}의 학습기록을 초기화할까요?`))return;let blank=window.DACOApp.getDefaultState();blank._updatedAt=Date.now();blank._adminResetAt=Date.now();try{await api('learning_progress?on_conflict=user_id',{method:'POST',body:{user_id:uid,state:blank,updated_at:new Date().toISOString()},prefer:'resolution=merge-duplicates,return=minimal'});if(uid===currentUser.id)window.DACOApp.applyExternalState(blank);toastSafe(`${username} 학습기록을 초기화했습니다.`);loadAdminUsers()}catch(e){alert(prettyError(e))}}
  async function adminToggle(uid,isActive,username){let action=isActive?'사용 중지':'사용 재개';if(!confirm(`${username} 계정을 ${action}할까요?`))return;try{await api(`profiles?user_id=eq.${encodeURIComponent(uid)}`,{method:'PATCH',body:{active:!isActive},prefer:'return=minimal'});toastSafe(`${username}: ${action} 완료`);loadAdminUsers()}catch(e){alert(prettyError(e))}}
  async function adminExport(uid,username){try{let rows=await api(`learning_progress?select=state&user_id=eq.${encodeURIComponent(uid)}&limit=1`),blob=new Blob([JSON.stringify(rows?.[0]?.state||{},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${username}_japanese_progress.json`;a.click();URL.revokeObjectURL(a.href)}catch(e){alert(prettyError(e))}}
  function toastSafe(t){if(typeof window.toast==='function')window.toast(t);else console.log(t)}
  async function init(){
    setAuthMode('login');
    if(!configReady()){$('localOnlyBtn')?.classList.remove('hidden');$('authSetupWarn')?.classList.remove('hidden');$('authSetupWarn').innerHTML='클라우드 연결 전입니다.<br><b>cloud-config.js</b>에 Supabase Project URL과 publishable/anon key를 입력하면 로그인·기기간 동기화가 활성화됩니다.';msg('먼저 클라우드 연결 설정이 필요합니다.');setCloudBadge('☁ 미설정',false);return}
    try{session=loadSession();session=await ensureSession();if(session){currentUser=session.user||null;if(!currentUser){let u=await authRequest('/auth/v1/user',{token:session.access_token});session.user=u;saveSession(session)}await handleSession(session)}else{showGate(true);setCloudBadge('☁ 로그인 필요',false)}}catch(e){saveSession(null);session=null;msg(prettyError(e),true);showGate(true)}
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pullRemote()});window.addEventListener('focus',pullRemote);window.addEventListener('online',()=>{setCloudBadge('☁ 연결됨',true);syncNow(false);pullRemote()});window.addEventListener('offline',()=>setCloudBadge('☁ 오프라인',false));
  }
  window.DACOCloud={setAuthMode,submitAuth,bootstrapAdmin,continueLocal,scheduleSync,syncNow,pullRemote,logout,openAccount,openPasswordChange,changePassword,openAdmin,loadAdminUsers,adminReset,adminToggle,adminExport,closeModal,get currentUser(){return currentUser},get profile(){return currentProfile}};
  window.addEventListener('load',init);
})();
