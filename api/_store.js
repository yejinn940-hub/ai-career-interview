// 공용 저장소 유틸리티 (Upstash Redis REST API 사용)
const { Redis } = require('@upstash/redis');

function getClient() {
  var url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  var token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url: url, token: token });
}

var client = getClient();

// kv.get / kv.set 와 동일한 인터페이스로 감싸서, 나머지 코드는 그대로 쓸 수 있게 함
var kv = {
  get: async function (key) {
    if (!client) return null;
    return client.get(key);
  },
  // exSeconds를 주면 그 시간이 지난 뒤 자동으로 삭제됨 (개인정보 보유기간 관리)
  set: async function (key, value, exSeconds) {
    if (!client) return null;
    if (exSeconds) return client.set(key, value, { ex: exSeconds });
    return client.set(key, value);
  },
  scan: async function (pattern) {
    if (!client) return [];
    var cursor = 0, out = [];
    do {
      var res = await client.scan(cursor, { match: pattern, count: 200 });
      cursor = res[0];
      out = out.concat(res[1]);
    } while (String(cursor) !== '0');
    return out;
  },
  del: async function (key) {
    if (!client) return null;
    return client.del(key);
  },
  // 여러 키를 한 번의 요청으로 읽음 (Redis 사용량 절약)
  mget: async function (keys) {
    if (!client) return keys.map(function () { return null; });
    return client.mget.apply(client, keys);
  }
};

function normalize(s) {
  return String(s || '').trim().replace(/\s+/g, ' ');
}

// 학교 이름은 서버에 저장하지 않는다. 반은 '학년|반'으로만 구분한다.
function roomKey(school, grade, classNum) {
  return normalize(grade) + '|' + normalize(classNum);
}

// ---- 일회성 정리: 예전에 '학교|학년|반' 이름으로 저장된 자료를 '학년|반'으로 옮기고, 학교 이름을 지운다 ----
var MIGRATION_FLAG = 'meta:school-removed-v1';
var DAY = 24 * 60 * 60;

async function migrateSchoolKeys() {
  if (!client) return null;
  if (await kv.get(MIGRATION_FLAG)) return null;

  var summary = { rooms: 0, records: 0, comments: 0 };
  var roomKeys = await kv.scan('room:*|*|*');
  var groups = {};
  roomKeys.forEach(function (k) {
    var parts = k.slice('room:'.length).split('|');
    if (parts.length !== 3) return;
    var nk = normalize(parts[1]) + '|' + normalize(parts[2]);
    (groups[nk] = groups[nk] || []).push(parts.join('|'));
  });

  var newKeys = Object.keys(groups);
  for (var g = 0; g < newKeys.length; g++) {
    var nk = newKeys[g];
    var olds = groups[nk];

    var legacy = [];
    for (var i = 0; i < olds.length; i++) {
      var room = await kv.get('room:' + olds[i]);
      var list = await kv.get('submissions:' + olds[i]);
      legacy.push({ old: olds[i], room: room, list: Array.isArray(list) ? list : [] });
    }

    // 가장 최근에 쓴 반 정보를 대표로 삼는다
    var primary = legacy.slice().sort(function (a, b) { return latest(b.list) - latest(a.list); })[0];
    var existingRoom = await kv.get('room:' + nk);
    var roomObj = existingRoom || (primary.room ? Object.assign({}, primary.room) : null);
    if (roomObj) {
      delete roomObj.school;
      await kv.set('room:' + nk, roomObj, 400 * DAY);
      summary.rooms++;
    }

    // 면담 기록은 모두 합친다 (id 중복 제거)
    var merged = await kv.get('submissions:' + nk);
    merged = Array.isArray(merged) ? merged.slice() : [];
    var seen = {};
    merged.forEach(function (r) { seen[r.id] = true; });
    legacy.forEach(function (it) {
      it.list.forEach(function (r) { if (!seen[r.id]) { seen[r.id] = true; merged.push(r); summary.records++; } });
    });
    if (merged.length) await kv.set('submissions:' + nk, merged, 30 * DAY);

    // 피드백(댓글)도 새 이름으로 옮긴다
    for (var j = 0; j < legacy.length; j++) {
      var prefix = 'comments:' + legacy[j].old + ':';
      var ckeys = await kv.scan(prefix + '*');
      for (var c = 0; c < ckeys.length; c++) {
        var sid = ckeys[c].slice(prefix.length);
        var val = await kv.get(ckeys[c]);
        var target = 'comments:' + nk + ':' + sid;
        if (Array.isArray(val) && val.length && !(await kv.get(target))) {
          await kv.set(target, val, 30 * DAY);
          summary.comments++;
        }
        await kv.del(ckeys[c]);
      }
      await kv.del('room:' + legacy[j].old);
      await kv.del('submissions:' + legacy[j].old);
    }
  }

  await kv.set(MIGRATION_FLAG, { at: new Date().toISOString(), summary: summary });
  return summary;
}

function latest(list) {
  return list.reduce(function (m, r) { return Math.max(m, new Date(r.updatedAt || r.startedAt || 0).getTime() || 0); }, 0);
}

// 반 정보를 읽는다. 없으면 한 번만 예전 자료 정리를 하고 다시 읽는다.
async function getRoomRecord(key) {
  var room = await kv.get('room:' + key);
  var migrated = null;
  if (!room) {
    migrated = await migrateSchoolKeys();
    if (migrated) room = await kv.get('room:' + key);
  }
  return { room: room, migrated: migrated };
}

function isConfigured() {
  return !!client;
}

module.exports = { kv: kv, normalize: normalize, roomKey: roomKey, isConfigured: isConfigured, migrateSchoolKeys: migrateSchoolKeys, getRoomRecord: getRoomRecord };
