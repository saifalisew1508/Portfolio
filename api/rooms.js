const { createClient } = require('redis');

let redisClient;
async function redis() {
  if (!redisClient) {
    const host = process.env.REDIS_HOST;
    const port = Number(process.env.REDIS_PORT);
    const username = process.env.REDIS_USERNAME || 'default';
    const password = process.env.REDIS_PASSWORD;
    if (!host || !port || !password) throw new Error('Redis environment variables are incomplete.');
    redisClient = createClient({ username, password, socket: { host, port, connectTimeout: 8000, reconnectStrategy: retries => Math.min(retries * 250, 3000) } });
    redisClient.on('error', error => console.error('Redis error:', error.message));
    await redisClient.connect();
  }
  return redisClient;
}
const roomKey = id => 'arcade:room:' + id;
const inboxKey = token => 'arcade:signals:' + token;
const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const token = () => require('crypto').randomBytes(24).toString('hex');
const cleanName = value => String(value || 'Player').trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, 20) || 'Player';
const reply = (res, status, body) => { res.setHeader('Cache-Control', 'no-store'); return res.status(status).json(body); };
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Use POST.' });
  try {
    const db = await redis();
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = String(body.action || '');
    if (action === 'create') {
      const game = body.game === 'chess' ? 'chess' : 'ludo';
      const maxPlayers = game === 'chess' ? 2 : Math.max(2, Math.min(6, Number(body.maxPlayers) || 2));
      let id, key;
      for (let i = 0; i < 8; i++) { id = code(); key = roomKey(id); if (!await db.exists(key)) break; id = null; }
      if (!id) return reply(res, 503, { error: 'Could not create a room. Try again.' });
      const playerToken = token();
      const room = { id, game, maxPlayers, createdAt: Date.now(), players: [{ token: playerToken, name: cleanName(body.name), seat: 0, joinedAt: Date.now() }], state: null, version: 0 };
      await db.set(key, JSON.stringify(room), { EX: 14400 });
      return reply(res, 200, { roomId: id, playerToken, room: { id, game, maxPlayers, players: room.players.map(({token, ...p}) => p), state: room.state, version: 0 } });
    }
    const id = String(body.roomId || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (!/^[A-Z0-9]{6}$/.test(id)) return reply(res, 400, { error: 'Enter a valid 6-character room ID.' });
    const key = roomKey(id), raw = await db.get(key);
    if (!raw) return reply(res, 404, { error: 'Room not found or expired.' });
    const room = JSON.parse(raw);
    if (action === 'join' && body.game && body.game !== room.game) return reply(res, 409, { error: 'This room belongs to a different game.' });
    if (action === 'join') {
      const existing = room.players.find(p => p.token === body.playerToken);
      if (!existing && room.game === 'ludo' && room.state) return reply(res, 409, { error: 'This Ludo game has already started.' });
      if (existing) return reply(res, 200, { roomId: id, playerToken: existing.token, seat: existing.seat, room: { id, game: room.game, maxPlayers: room.maxPlayers, players: room.players.map(({token, ...p}) => p), state: room.state, version: room.version } });
      if (room.players.length >= room.maxPlayers) return reply(res, 409, { error: 'This room is full.' });
      const playerToken = token(), seat = room.players.length;
      room.players.push({ token: playerToken, name: cleanName(body.name), seat, joinedAt: Date.now() });
      await db.set(key, JSON.stringify(room), { EX: 14400 });
      return reply(res, 200, { roomId: id, playerToken, seat, room: { id, game: room.game, maxPlayers: room.maxPlayers, players: room.players.map(({token, ...p}) => p), state: room.state, version: room.version } });
    }
    const player = room.players.find(p => p.token === body.playerToken);
    if (!player) return reply(res, 403, { error: 'This device is not a member of the room. Join again.' });
    if (action === 'state') return reply(res, 200, { room: { id, game: room.game, maxPlayers: room.maxPlayers, players: room.players.map(({token, ...p}) => p), state: room.state, version: room.version } });
    if (action === 'update') {
      if (!body.state || typeof body.state !== 'object') return reply(res, 400, { error: 'Missing game state.' });
      if (Number(body.version) !== room.version) return reply(res, 409, { error: 'Game changed on another device. Sync and try again.', version: room.version });
      room.state = body.state;
      room.version += 1;
      room.updatedAt = Date.now();
      await db.set(key, JSON.stringify(room), { EX: 14400 });
      return reply(res, 200, { version: room.version });
    }
    if (action === 'signal') {
      const target = room.players.find(p => p.seat === Number(body.targetSeat));
      if (!target) return reply(res, 404, { error: 'Voice peer not found.' });
      const signal = { fromSeat: player.seat, type: String(body.type || '').slice(0, 20), payload: body.payload, at: Date.now() };
      await db.rPush(inboxKey(target.token), JSON.stringify(signal));
      await db.expire(inboxKey(target.token), 300);
      return reply(res, 200, { ok: true });
    }
    if (action === 'signals') {
      const messages = await db.lRange(inboxKey(player.token), 0, 19);
      await db.del(inboxKey(player.token));
      return reply(res, 200, { signals: messages.map(value => { try { return JSON.parse(value); } catch (_) { return null; } }).filter(Boolean) });
    }
    return reply(res, 400, { error: 'Unknown action.' });
  } catch (error) {
    console.error('Arcade API error:', error);
    return reply(res, 500, { error: 'Game service is temporarily unavailable. Check Redis configuration.' });
  }
};
