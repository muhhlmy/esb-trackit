import io, os

tmp = os.environ.get('LOCALAPPDATA') + '/Temp'
lines = io.open('MyAssetsView.vue', encoding='utf-8').read().split('\n')

def find(needle):
    return next(i for i, l in enumerate(lines) if needle in l)

l1 = find('LEVEL 1')
l2 = find('LEVEL 2')
l3 = find('LEVEL 3')
st = next(i for i, l in enumerate(lines) if l.strip() == '<style scoped>')

for nm, a, b in [('lvl1_final', l1, l2), ('lvl2_final', l2, l3)]:
    io.open(tmp + '/' + nm + '.txt', 'w', encoding='utf-8').write('\n'.join(lines[a:b]))
    print(nm, a + 1, '->', b + 1, '(', b - a, 'lines )')

io.open(tmp + '/lvl3_final.txt', 'w', encoding='utf-8').write('\n'.join(lines[l3:st]))
print('lvl3_final', l3 + 1, '->', st + 1, '(', st - l3, 'lines )')
