import json,re,base64,os
root=os.path.join(os.path.dirname(__file__),'..')
s=open(os.path.join(root,'public/index.html'),encoding='utf-8').read()
figs=json.load(open(os.path.join(root,'data/figures.json'),encoding='utf-8'))
for f in figs:
    p=f.get('photo','')
    if p.startswith('/images/'):
        b=open(os.path.join(root,'public',p.lstrip('/')),'rb').read()
        f['photo']='data:image/jpeg;base64,'+base64.b64encode(b).decode()
shim=open(os.path.join(os.path.dirname(__file__),'shim.js'),encoding='utf-8').read()
scr=open(os.path.join(root,'api/_scripted.js'),encoding='utf-8').read()
shim=shim.replace('__FIGURES__',json.dumps(figs,ensure_ascii=False)).replace('__SCRIPTED__',scr)
# 외부 글꼴 요청 제거 (서버·외부 통신 없음)
s=re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>\n','',s)
# 피드백 쓰기 버튼은 숨김 (서버가 없어 다른 모둠에게 전달할 수 없음)
s=s.replace('</style>','.btn-feedback{display:none}\n</style>',1)
# 교사 페이지 링크 숨김
s=re.sub(r"    '    <p class=\"disclaimer small\"><a href=\"/teacher.html\">.*?</p>',\n","",s)
# 학급 공유 파일 불러오기 버튼 추가
old="    '    <div id=\"shared-list\" class=\"archive-list\"></div>',\n"
assert old in s
s=s.replace(old,"    '    <input type=\"file\" id=\"import-shared\" accept=\".json,application/json\" hidden>',\n    '    <div class=\"chat-actions\"><button type=\"button\" id=\"btn-import-shared\" class=\"primary\">📂 선생님이 준 학급 공유 파일 불러오기</button></div>',\n"+old,1)
s=s.replace('<script>\n(function(){','<script>\n'+shim.replace('</script>','<\\/script>')+'\n</script>\n<script>\n(function(){',1)
assert 'btn-import-shared' in s and '__FIGURES__' not in s
out=os.path.join(os.path.dirname(__file__),'dist'); os.makedirs(out,exist_ok=True)
open(os.path.join(out,'면담연습_학생용.html'),'w',encoding='utf-8').write(s)
print(len(s))
