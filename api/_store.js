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

function roomKey(school, grade, classNum) {
  return normalize(school) + '|' + normalize(grade) + '|' + normalize(classNum);
}

function isConfigured() {
  return !!client;
}

module.exports = { kv: kv, normalize: normalize, roomKey: roomKey, isConfigured: isConfigured };
