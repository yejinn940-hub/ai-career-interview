/* 서버 없는 버전: /api/* 호출을 이 기기 안의 처리로 대신한다. (화면 코드는 그대로) */
(function(){
  'use strict';
  var FIGURES = __FIGURES__;
  var scripted = (function(){ var module = {exports:{}}; __SCRIPTED__
    return module.exports; })();
  var SHARED_KEY = 'offline-shared-v1';
  var ARCHIVE_KEY = 'ai-interview-archive-v1';
  var ROOM_KEY = 'ai-interview-room-v1';

  function json(obj){ return new Response(JSON.stringify(obj), {status:200, headers:{'content-type':'application/json'}}); }
  function readLS(key, fallback){ try{ var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }catch(e){ return fallback; } }
  function shared(){ var s = readLS(SHARED_KEY, null); return (s && Array.isArray(s.items)) ? s.items : []; }
  function delay(ms, v){ return new Promise(function(r){ setTimeout(function(){ r(v); }, ms); }); }

  function download(filename, obj){
    var blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  function safeName(s){ return String(s || '').replace(/[\\/:*?"<>|\s]+/g, '_'); }

  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function(url, opts){
    var u = String(url);
    if(u.indexOf('/api/') !== 0){ return realFetch ? realFetch(url, opts) : Promise.reject(new Error('no fetch')); }
    var body = {};
    try{ body = JSON.parse((opts && opts.body) || '{}'); }catch(e){}

    if(u === '/api/figures'){ return Promise.resolve(json({figures: FIGURES})); }

    if(u === '/api/chat'){
      var fig = FIGURES.filter(function(f){ return f.id === body.figureId; })[0];
      var msgs = (body.messages || []).filter(function(m){ return m.role === 'user'; });
      var last = msgs.length ? msgs[msgs.length - 1].content : '';
      var text = fig ? scripted.answer(fig, last) : '등록되지 않은 면담 인물이에요.';
      return delay(500, json({text: text}));
    }

    if(u === '/api/room'){
      return Promise.resolve(json({ok:true, room:{teacherName: body.teacherName || ''}}));
    }

    if(u === '/api/submissions'){
      var a = body.action;
      if(a === 'sync' || a === 'unsubmit'){ return Promise.resolve(json({ok:true})); }
      if(a === 'submit'){
        var rec = readLS(ARCHIVE_KEY, []).filter(function(x){ return x.id === body.id; })[0];
        var room = readLS(ROOM_KEY, {}) || {};
        if(!rec){ return Promise.resolve(json({ok:false, error:'면담 기록을 찾지 못했어요.'})); }
        var out = {
          type:'interview-submission', version:1,
          id: rec.id, grade: room.grade || body.grade, classNum: room.classNum || body.classNum,
          groupName: rec.groupName || room.groupName || '', figureId: rec.figureId,
          figureName: rec.figureName, figureJob: rec.figureJob,
          messages: rec.messages, submittedAt: new Date().toISOString()
        };
        var gnum = (String(out.groupName).match(/\d+/) || ['0'])[0];
        var d = new Date(); function z(n){ return ('0'+n).slice(-2); }
        var fname = 'interview_g' + gnum + '_' + String(out.figureId || 'figure').replace(/[^a-z0-9-]/gi, '') + '_' + z(d.getMonth()+1) + z(d.getDate()) + '-' + z(d.getHours()) + z(d.getMinutes()) + '.json';
        download(fname, out);
        setTimeout(function(){ alert('제출 파일이 저장됐어요.\n"' + fname + '" 파일을 선생님께 보내 주세요.'); }, 300);
        return Promise.resolve(json({ok:true}));
      }
      if(a === 'shared-list'){
        return Promise.resolve(json({ok:true, items: shared().map(function(x){
          return {id:x.id, groupName:x.groupName, figureName:x.figureName, figureJob:x.figureJob, messages:x.messages, updatedAt:x.updatedAt};
        })}));
      }
      if(a === 'live'){
        var it = shared().filter(function(x){ return x.id === body.id; })[0];
        if(!it){ return Promise.resolve(json({ok:true, gone:true})); }
        return Promise.resolve(json({ok:true, messages: it.messages, comments: it.comments || []}));
      }
      // student-ids, student-get 등: 서버가 없으므로 기기 기록을 건드리지 않는다.
      return Promise.resolve(json({ok:false}));
    }

    if(u === '/api/comments'){
      if(body.action === 'list'){
        var it2 = shared().filter(function(x){ return x.id === body.submissionId; })[0];
        return Promise.resolve(json({ok:true, items: it2 ? (it2.comments || []) : []}));
      }
      return Promise.resolve(json({ok:false, error:'서버가 없는 버전에서는 피드백을 남길 수 없어요.'}));
    }

    return Promise.resolve(json({ok:false}));
  };

  // 학급 공유 파일 불러오기
  document.addEventListener('change', function(e){
    var t = e.target;
    if(!t || t.id !== 'import-shared' || !t.files || !t.files[0]) return;
    var reader = new FileReader();
    reader.onload = function(){
      try{
        var data = JSON.parse(reader.result);
        if(!data || data.type !== 'class-share' || !Array.isArray(data.items)){ throw new Error('bad'); }
        localStorage.setItem(SHARED_KEY, JSON.stringify(data));
        var btn = document.getElementById('btn-shared-open');
        if(btn) btn.click();
        alert('학급 공유 파일을 불러왔어요. (면담 ' + data.items.length + '개)');
      }catch(err){ alert('학급 공유 파일이 아니에요. 선생님이 준 "학급공유" 파일을 골라 주세요.'); }
      t.value = '';
    };
    reader.readAsText(t.files[0]);
  });
  document.addEventListener('click', function(e){
    if(e.target && e.target.id === 'btn-import-shared'){ document.getElementById('import-shared').click(); }
  });
})();
