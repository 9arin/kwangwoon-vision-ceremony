// Supabase 위에서 claude.use('db' | 'assets' | 'downloads' | 'user') 를 흉내 내는 어댑터.
// index.html 의 화면 코드는 Claude 아티팩트 시절 API 를 그대로 쓰고, 실제 저장은 여기서 Supabase 로 보냅니다.
(function () {
  const sb = supabase.createClient(window.SUPA_URL, window.SUPA_KEY);
  window.sb = sb;
  const BUCKET = 'files';
  const STORE = window.SUPA_URL.replace(/\/$/, '') + '/storage/v1/object/public/' + BUCKET + '/';
  // 'files/xxx.png' = 저장소(깃허브)에 같이 올라간 기존 시안, 그 외 = Supabase Storage 에 올린 파일
  window.BLOB = id => !id ? '' : /^(files\/|https?:)/.test(id) ? id : STORE + id;

  const err = (e, fallback) => { const x = new Error((e && e.message) || fallback || '오류'); x.code = (e && (e.code || e.status)) || fallback || 'error'; return x; };
  const loaders = {};
  const reload = t => (loaders[t] || []).forEach(f => f());
  let sessionP = sb.auth.getSession().then(r => r.data.session);

  function collection(t) {
    return {
      orderBy() {
        return {
          onSnapshot(cb, onErr) {
            let busy = false, again = false;
            const load = async () => {
              if (busy) { again = true; return; } busy = true;
              const { data, error } = await sb.from(t).select('id,o,data').order('o', { ascending: true });
              busy = false;
              if (error) { onErr && onErr(err(error)); }
              else cb({ docs: data.map(r => ({ id: r.id, data: () => ({ ...r.data }) })) });
              if (again) { again = false; load(); }
            };
            (loaders[t] = loaders[t] || []).push(load);
            load();
            sb.channel('rt-' + t + '-' + Math.random().toString(36).slice(2)).on('postgres_changes', { event: '*', schema: 'public', table: t }, () => load()).subscribe();
            document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
            return () => {};
          }
        };
      },
      async add(d) {
        const id = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
        const { error } = await sb.from(t).insert({ id, o: +d.o || 0, data: d });
        if (error) throw err(error, 'permission-denied');
        reload(t); return { id };
      }
    };
  }
  function doc(path) {
    const [t, id] = path.split('/');
    return {
      async update(p) {
        const { error } = await sb.rpc('patch_doc', { t, p_id: id, p });
        if (error) throw err(error, 'permission-denied');
        reload(t);
      },
      async set(d) {
        const { error } = await sb.from(t).upsert({ id, o: +d.o || 0, data: d });
        if (error) throw err(error, 'permission-denied');
        reload(t); docReload(path);
      },
      async delete() {
        const { data, error } = await sb.from(t).delete().eq('id', id).select('id');
        if (error) throw err(error);
        if (!data || !data.length) throw err(null, 'permission-denied');
        reload(t);
      },
      onSnapshot(cb) {
        const load = async () => {
          const { data } = await sb.from(t).select('data').eq('id', id).maybeSingle();
          cb({ exists: !!data, data: () => data ? { ...data.data } : undefined });
        };
        (docLoaders[path] = docLoaders[path] || []).push(load);
        load();
        sb.channel('rt-' + t + '-' + id + '-' + Math.random().toString(36).slice(2)).on('postgres_changes', { event: '*', schema: 'public', table: t, filter: 'id=eq.' + id }, () => load()).subscribe();
        return () => {};
      }
    };
  }
  const docLoaders = {};
  const docReload = p => (docLoaders[p] || []).forEach(f => f());
  const db = { collection, doc };

  const assets = {
    async upload(file) {
      const ext = ((file.name || '').match(/\.[A-Za-z0-9]{1,5}$/) || [''])[0].toLowerCase() || (file.type === 'application/pdf' ? '.pdf' : '');
      const name = Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + ext;
      const { error } = await sb.storage.from(BUCKET).upload(name, file, { contentType: file.type || undefined, upsert: false });
      if (error) throw err(error, 'permission-denied');
      return { id: name, url: STORE + name };
    },
    async delete(id) { if (!id || /^(files\/|https?:)/.test(id)) return; await sb.storage.from(BUCKET).remove([id]); }
  };
  const downloads = {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  };
  let editorP = null;
  const isEditor = () => editorP || (editorP = sessionP.then(async s => { if (!s) return false; const { data } = await sb.rpc('is_editor'); return !!data; }));
  const user = {
    async isOwner() { return false; },
    async canEdit() { return isEditor(); },
    async can(n) { return n === 'data.write' || n === 'assets.write' ? isEditor() : false; },
    async me() { const s = await sessionP; const e = s && s.user && s.user.email || null; return { id: s && s.user.id || null, name: e || '', email: e }; }
  };

  window.claude = {
    async use(name) {
      if (name === 'db') return db;
      if (name === 'assets') return (await sessionP) ? assets : null;
      if (name === 'downloads') return downloads;
      if (name === 'user') return user;
      return null; // mcp 등 Claude 앱 전용 기능은 없음
    }
  };

  // ── 로그인 바 (공용 편집 비밀번호) ──
  // 편집 계정은 하나(config.js 의 EDIT_EMAIL). 화면에는 비밀번호 칸만 보여 주고, 로그인은 브라우저에 유지돼요.
  function bar() {
    const host = document.getElementById('authbar'); if (!host) return;
    sessionP.then(s => {
      if (s) {
        host.innerHTML = '';
        const sp = document.createElement('span'); sp.textContent = '편집 모드';
        const b = document.createElement('button'); b.type = 'button'; b.textContent = '편집 끝내기';
        b.onclick = async () => { await sb.auth.signOut(); location.reload(); };
        host.append(sp, b);
      } else {
        host.innerHTML = '<form><input type="password" required placeholder="편집 비밀번호" aria-label="편집 비밀번호" autocomplete="current-password"><button type="submit">편집하기</button><span class="am" role="status"></span></form>';
        const f = host.querySelector('form'), am = f.querySelector('.am');
        f.onsubmit = async e => {
          e.preventDefault(); const password = f.querySelector('input').value; if (!password) return;
          am.textContent = '확인 중이에요…';
          const { error } = await sb.auth.signInWithPassword({ email: window.EDIT_EMAIL, password });
          if (error) { am.textContent = '비밀번호가 맞지 않아요.'; return; }
          location.reload();
        };
      }
    });
  }
  sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') { sessionP = sb.auth.getSession().then(r => r.data.session); editorP = null; } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bar); else bar();
})();
