// 공용 저장소 유틸리티 (Vercel KV / Upstash Redis REST API 사용)
const { kv } = require('@vercel/kv');

function normalize(s) {
  return String(s || '').trim().replace(/\s+/g, ' ');
}

function roomKey(school, grade, classNum) {
  return normalize(school) + '|' + normalize(grade) + '|' + normalize(classNum);
}

function isConfigured() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

module.exports = { kv: kv, normalize: normalize, roomKey: roomKey, isConfigured: isConfigured };
