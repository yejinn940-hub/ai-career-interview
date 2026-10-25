import re,os
root=os.path.join(os.path.dirname(__file__),'..')
idx=open(os.path.join(root,'public/index.html'),encoding='utf-8').read()
css=re.search(r'<style>\n(.*?)</style>',idx,re.S).group(1)
t=open(os.path.join(os.path.dirname(__file__),'teacher_template.html'),encoding='utf-8').read().replace('__CSS__',css)
out=os.path.join(os.path.dirname(__file__),'dist'); os.makedirs(out,exist_ok=True)
open(os.path.join(out,'면담연습_교사용.html'),'w',encoding='utf-8').write(t); print(len(t))
