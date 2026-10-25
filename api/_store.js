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

// 학교 이름은 서버에 저장하지 않는다. 반은 '선생님 성함|학년|반'으로 구분한다.
function teacherKey(name) {
  return normalize(name).replace(/\s/g, '');
}

function roomKey(teacherName, grade, classNum) {
  return teacherKey(teacherName) + '|' + normalize(grade) + '|' + normalize(classNum);
}

// ---- 일회성 정리: 예전 키('학교|학년|반' 또는 '학년|반')로 저장된 자료를 '선생님 성함|학년|반'으로 옮기고 학교 이름을 지운다 ----
var MIGRATION_FLAG = 'meta:teacher-key-v1';
var DAY = 24 * 60 * 60;

async function migrateSchoolKeys() {
  if (!client) return null;
  if (await kv.get(MIGRATION_FLAG)) return null;

  var summary = { rooms: 0, records: 0, comments: 0 };
  var roomKeys = await kv.scan('room:*');
  var groups = {};
  for (var n = 0; n < roomKeys.length; n++) {
    var oldKey = roomKeys[n].slice('room:'.length);
    var parts = oldKey.split('|');
    if (parts.length < 2) continue;
    var r = await kv.get(roomKeys[n]);
    if (!r || !r.teacherName) continue;
    var nk = teacherKey(r.teacherName) + '|' + normalize(parts[parts.length - 2]) + '|' + normalize(parts[parts.length - 1]);
    if (nk === oldKey) continue; // 이미 새 형식
    (groups[nk] = groups[nk] || []).push(oldKey);
  }

  var newKeys = Object.keys(groups);
  for (var g = 0; g < newKeys.length; g++) {
    var key = newKeys[g];
    var olds = groups[key];

    var legacy = [];
    for (var i = 0; i < olds.length; i++) {
      var room = await kv.get('room:' + olds[i]);
      var list = await kv.get('submissions:' + olds[i]);
      legacy.push({ old: olds[i], room: room, list: Array.isArray(list) ? list : [] });
    }

    var primary = legacy.slice().sort(function (a, b) { return latest(b.list) - latest(a.list); })[0];
    var existingRoom = await kv.get('room:' + key);
    var roomObj = existingRoom || (primary.room ? Object.assign({}, primary.room) : null);
    if (roomObj) {
      delete roomObj.school;
      await kv.set('room:' + key, roomObj, 400 * DAY);
      summary.rooms++;
    }

    var merged = await kv.get('submissions:' + key);
    merged = Array.isArray(merged) ? merged.slice() : [];
    var seen = {};
    merged.forEach(function (x) { seen[x.id] = true; });
    legacy.forEach(function (it) {
      it.list.forEach(function (x) { if (!seen[x.id]) { seen[x.id] = true; merged.push(x); summary.records++; } });
    });
    if (merged.length) await kv.set('submissions:' + key, merged, 30 * DAY);

    for (var j = 0; j < legacy.length; j++) {
      var prefix = 'comments:' + legacy[j].old + ':';
      var ckeys = await kv.scan(prefix + '*');
      for (var c = 0; c < ckeys.length; c++) {
        var sid = ckeys[c].slice(prefix.length);
        var val = await kv.get(ckeys[c]);
        var target = 'comments:' + key + ':' + sid;
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

// 반 사용 승인 상태: status가 없으면(예전에 만든 반) 승인된 것으로 본다.
function roomBlock(room) {
  if (!room || !room.status || room.status === 'approved') return '';
  return room.status === 'pending'
    ? '선생님의 반이 아직 승인되지 않았어요. 승인될 때까지 기다려 주세요.'
    : '이 반은 사용이 중지되었어요.';
}


// ---- PIN은 해시로 저장 (예전에 평문으로 저장된 반은 다음 로그인 때 자동으로 해시로 바뀜) ----
var crypto = require('crypto');
function hashPin(pin) {
  var salt = crypto.randomBytes(12).toString('hex');
  var h = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  return 'h1$' + salt + '$' + h;
}
function verifyPin(room, pin) {
  if (!room || !room.pin) return false;
  var stored = String(room.pin);
  var given = String(pin || '');
  if (stored.indexOf('h1$') === 0) {
    var parts = stored.split('$');
    var h = crypto.scryptSync(given, parts[1], 32);
    var expected = Buffer.from(parts[2], 'hex');
    return h.length === expected.length && crypto.timingSafeEqual(h, expected);
  }
  var a = Buffer.from(stored), b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---- 로그인 시도 제한 / 선생님 로그인 토큰 ----
var PIN_LIMIT = 5, MISS_LIMIT = 100, LOCK_SECONDS = 600, SESSION_SECONDS = 12 * 60 * 60;
function clientIp(req) {
  var h = req && req.headers ? String(req.headers['x-forwarded-for'] || '') : '';
  return (h.split(',')[0].trim()) || (req && req.socket && req.socket.remoteAddress) || 'unknown';
}
async function failCount(id) { return Number((await kv.get('fail:' + id)) || 0); }
async function addFail(id) { await kv.set('fail:' + id, (await failCount(id)) + 1, LOCK_SECONDS); }
async function issueToken(key) {
  var t = crypto.randomBytes(24).toString('hex');
  await kv.set('session:' + t, key, SESSION_SECONDS);
  return t;
}
async function revokeToken(t) { if (t) await kv.del('session:' + String(t)); }
// 선생님 확인: 로그인 토큰 또는 PIN. PIN은 5번 틀리면 10분 동안 잠김.
async function verifyTeacher(key, room, body) {
  if (!room) return false;
  if (body.token) {
    var k = await kv.get('session:' + String(body.token));
    if (k === key) return true;
    body._expired = true;
    return false;
  }
  if (!body.pin) return false;
  var id = 'pin:' + key;
  if ((await failCount(id)) >= PIN_LIMIT) { body._locked = true; return false; }
  if (verifyPin(room, body.pin)) { await kv.del('fail:' + id); return true; }
  await addFail(id);
  return false;
}
function sendAuthError(res, body) {
  if (body._locked) { res.status(429).json({ error: '비밀번호를 너무 많이 틀렸어요. 10분 뒤에 다시 시도해 주세요.', locked: true }); return; }
  if (body._expired) { res.status(401).json({ error: '로그인이 만료되었어요. 다시 로그인해 주세요.', expired: true }); return; }
  res.status(403).json({ error: 'PIN이 일치하지 않아요.' });
}
// 없는 반을 계속 시도하는 접속(암호 알아내기)은 같은 IP에서 10분에 100번까지만 허용(학교는 한 IP를 같이 쓰는 경우가 많아 넉넉하게)
async function roomMissLocked(req) { return (await failCount('miss:' + clientIp(req))) >= MISS_LIMIT; }
async function roomMiss(req) { await addFail('miss:' + clientIp(req)); }
async function adminLocked(req) { return (await failCount('admin:' + clientIp(req))) >= PIN_LIMIT; }
async function adminFail(req) { await addFail('admin:' + clientIp(req)); }

module.exports = { verifyTeacher: verifyTeacher, sendAuthError: sendAuthError, issueToken: issueToken, revokeToken: revokeToken, roomMissLocked: roomMissLocked, roomMiss: roomMiss, adminLocked: adminLocked, adminFail: adminFail, hashPin: hashPin, verifyPin: verifyPin, roomBlock: roomBlock, kv: kv, normalize: normalize, roomKey: roomKey, isConfigured: isConfigured, migrateSchoolKeys: migrateSchoolKeys, getRoomRecord: getRoomRecord };
