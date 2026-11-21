const { createClient } = require('redis');
const crypto = require('crypto');

let redisClient;
let redisPromise;
async function redis() {
  if (!redisPromise) {
    redisPromise = (async () => {
      const host = process.env.REDIS_HOST;
      const port = Number(process.env.REDIS_PORT);
      const username = process.env.REDIS_USERNAME || 'default';
      const password = process.env.REDIS_PASSWORD;
      if (!host || !port || !password) throw new Error('Redis environment variables are incomplete.');
      redisClient = createClient({
        username, password,
        socket: { host, port, connectTimeout: 8000, reconnectStrategy: retries => Math.min(retries * 250, 3000) }
      });
      redisClient.on('error', error => console.error('Redis error:', error.message));
      await redisClient.connect();
      return redisClient;
    })().catch(error => {
      redisPromise = null;
      redisClient = null;
      throw error;
    });
  }
  return redisPromise;
}

const roomKey = id => 'arcade:room:' + id;
const inboxKey = playerToken => 'arcade:signals:' + playerToken;
const makeCode = () => crypto.randomInt(0, 36 ** 6).toString(36).toUpperCase().padStart(6, '0');
const makeToken = () => crypto.randomBytes(24).toString('hex');
const cleanName = value => String(value || 'Player').trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, 20) || 'Player';
const reply = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(body);
};
const publicRoom = room => ({
  id: room.id, game: room.game, maxPlayers: room.maxPlayers,
  players: room.players.map(({ token: _token, ...player }) => player),
  state: room.state, version: room.version
});
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function cleanGameState(game, state, room) {
  if (!isObject(state)) return null;
  let serialized;
  try { serialized = JSON.stringify(state); } catch (_) { return null; }
  if (!serialized || serialized.length > 24000) return null;

  if (game === 'ludo') {
    if (!Array.isArray(state.players) || state.players.length < 2 || state.players.length > room.maxPlayers) return null;
    if (!Number.isInteger(state.turn) || state.turn < 0 || state.turn >= state.players.length) return null;
    if (!(state.dice === null || (Number.isInteger(state.dice) && state.dice >= 1 && state.dice <= 6))) return null;
    if (typeof state.rolled !== 'boolean') return null;
    if (!(state.winner === null || (Number.isInteger(state.winner) && state.winner >= 0 && state.winner < state.players.length))) return null;
    const players = [];
    for (let i = 0; i < state.players.length; i++) {
      const player = state.players[i];
      if (!isObject(player) || !Array.isArray(player.tokens) || player.tokens.length !== 4) return null;
      if (!player.tokens.every(value => Number.isInteger(value) && value >= -1 && value <= (state.players.length > 4 ? 66 : 58))) return null;
      players.push({
        id: i,
        name: cleanName(player.name),
        color: String(player.color || '').slice(0, 32),
        tokens: player.tokens.slice()
      });
    }
    return { players, turn: state.turn, dice: state.dice, rolled: state.rolled, winner: state.winner };
  }

  if (game === 'chess') {
    if (typeof state.fen !== 'string' || state.fen.length > 128 || state.fen.trim().split(/\s+/).length !== 6) return null;
    if (!Array.isArray(state.history) || state.history.length > 512 || !state.history.every(move => typeof move === 'string' && move.length <= 20)) return null;
    if (state.turn !== 'w' && state.turn !== 'b') return null;
    return { fen: state.fen, history: state.history.slice(), turn: state.turn };
  }
  return null;
}

const JOIN_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return cjson.encode({status='missing'}) end
local room = cjson.decode(raw)
if ARGV[1] ~= '' and ARGV[1] ~= room.game then return cjson.encode({status='game'}) end
for _, player in ipairs(room.players) do
  if player.token == ARGV[2] and ARGV[2] ~= '' then
    redis.call('EXPIRE', KEYS[1], 14400)
    return cjson.encode({status='ok', seat=player.seat, room=room})
  end
end
if room.game == 'ludo' and room.state ~= cjson.null then return cjson.encode({status='started'}) end
if #room.players >= room.maxPlayers then return cjson.encode({status='full'}) end
local seat = #room.players
table.insert(room.players, {token=ARGV[3], name=ARGV[4], seat=seat, joinedAt=tonumber(ARGV[5])})
redis.call('SET', KEYS[1], cjson.encode(room), 'EX', 14400)
return cjson.encode({status='ok', seat=seat, room=room})
`;

const UPDATE_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return {'missing', '0'} end
local room = cjson.decode(raw)
local player = nil
for _, candidate in ipairs(room.players) do
  if candidate.token == ARGV[1] then player = candidate break end
end
if not player then return {'member', '0'} end
if tonumber(ARGV[2]) ~= tonumber(room.version) then return {'conflict', tostring(room.version)} end
if room.state ~= cjson.null then
  if room.game == 'ludo' and tonumber(room.state.turn) ~= tonumber(player.seat) then return {'turn', tostring(room.version)} end
  if room.game == 'chess' and room.state.turn then
    local expected = (tonumber(player.seat) == 0) and 'w' or 'b'
    if room.state.turn ~= expected then return {'turn', tostring(room.version)} end
  end
end
room.state = cjson.decode(ARGV[3])
room.version = tonumber(room.version) + 1
room.updatedAt = tonumber(ARGV[4])
redis.call('SET', KEYS[1], cjson.encode(room), 'EX', 14400)
return {'ok', tostring(room.version)}
`;

const READ_SIGNALS_SCRIPT = `
local result = {}
for i = 1, 20 do
  local item = redis.call('LPOP', KEYS[1])
  if not item then break end
  table.insert(result, item)
end
return result
`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { error: 'Use POST.' });
  }
  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.toLowerCase().includes('application/json')) return reply(res, 415, { error: 'Send JSON data.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (!isObject(body)) return reply(res, 400, { error: 'Invalid request body.' });
    if (JSON.stringify(body).length > 32000) return reply(res, 413, { error: 'Request is too large.' });

    const db = await redis();
    const action = String(body.action || '');

    if (action === 'create') {
      const game = body.game === 'chess' ? 'chess' : body.game === 'ludo' ? 'ludo' : '';
      if (!game) return reply(res, 400, { error: 'Choose a supported game.' });
      const requestedPlayers = Number(body.maxPlayers);
      const maxPlayers = game === 'chess' ? 2 : Math.max(2, Math.min(6, Number.isInteger(requestedPlayers) ? requestedPlayers : 2));
      const playerToken = makeToken();
      const now = Date.now();
      let id = '';
      for (let i = 0; i < 12; i++) {
        const candidate = makeCode();
        const room = {
          id: candidate, game, maxPlayers, createdAt: now,
          players: [{ token: playerToken, name: cleanName(body.name), seat: 0, joinedAt: now }],
          state: null, version: 0
        };
        const created = await db.set(roomKey(candidate), JSON.stringify(room), { NX: true, EX: 14400 });
        if (created === 'OK') { id = candidate; return reply(res, 200, { roomId: id, playerToken, room: publicRoom(room) }); }
      }
      return reply(res, 503, { error: 'Could not create a room. Try again.' });
    }

    const id = String(body.roomId || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (!/^[A-Z0-9]{6}$/.test(id)) return reply(res, 400, { error: 'Enter a valid 6-character room ID.' });
    const key = roomKey(id);

    if (action === 'join') {
      const suppliedToken = typeof body.playerToken === 'string' && /^[a-f0-9]{48}$/.test(body.playerToken) ? body.playerToken : '';
      const playerToken = makeToken();
      const result = JSON.parse(await db.eval(JOIN_SCRIPT, {
        keys: [key],
        arguments: [String(body.game || ''), suppliedToken, playerToken, cleanName(body.name), String(Date.now())]
      }));
      if (result.status === 'missing') return reply(res, 404, { error: 'Room not found or expired.' });
      if (result.status === 'game') return reply(res, 409, { error: 'This room belongs to a different game.' });
      if (result.status === 'started') return reply(res, 409, { error: 'This Ludo game has already started.' });
      if (result.status === 'full') return reply(res, 409, { error: 'This room is full.' });
      const returnedToken = result.room.players[result.seat].token;
      return reply(res, 200, {
        roomId: id, playerToken: returnedToken, seat: result.seat, room: publicRoom(result.room)
      });
    }

    const suppliedToken = typeof body.playerToken === 'string' && /^[a-f0-9]{48}$/.test(body.playerToken) ? body.playerToken : '';
    if (!suppliedToken) return reply(res, 403, { error: 'This device is not a member of the room. Join again.' });
    const raw = await db.get(key);
    if (!raw) return reply(res, 404, { error: 'Room not found or expired.' });
    const room = JSON.parse(raw);
    const player = room.players.find(candidate => candidate.token === suppliedToken);
    if (!player) return reply(res, 403, { error: 'This device is not a member of the room. Join again.' });

    if (action === 'state') return reply(res, 200, { room: publicRoom(room) });

    if (action === 'update') {
      const state = cleanGameState(room.game, body.state, room);
      if (!state) return reply(res, 400, { error: 'Invalid or oversized game state.' });
      const result = await db.eval(UPDATE_SCRIPT, {
        keys: [key],
        arguments: [suppliedToken, String(body.version), JSON.stringify(state), String(Date.now())]
      });
      const status = result[0];
      if (status === 'missing') return reply(res, 404, { error: 'Room not found or expired.' });
      if (status === 'member') return reply(res, 403, { error: 'This device is not a member of the room. Join again.' });
      if (status === 'turn') return reply(res, 403, { error: 'It is not your turn.' });
      if (status === 'conflict') return reply(res, 409, { error: 'Game changed on another device. Sync and try again.', version: Number(result[1]) });
      return reply(res, 200, { version: Number(result[1]) });
    }

    if (action === 'signal') {
      const targetSeat = Number(body.targetSeat);
      const target = room.players.find(candidate => candidate.seat === targetSeat);
      const type = String(body.type || '');
      if (!target || targetSeat === player.seat) return reply(res, 404, { error: 'Voice peer not found.' });
      if (!['offer', 'answer', 'ice'].includes(type) || !isObject(body.payload)) return reply(res, 400, { error: 'Invalid voice signal.' });
      const payload = JSON.stringify(body.payload);
      if (payload.length > 4096) return reply(res, 413, { error: 'Voice signal is too large.' });
      const inbox = inboxKey(target.token);
      await db.rPush(inbox, JSON.stringify({ fromSeat: player.seat, type, payload: body.payload, at: Date.now() }));
      await db.lTrim(inbox, -40, -1);
      await db.expire(inbox, 300);
      return reply(res, 200, { ok: true });
    }

    if (action === 'signals') {
      const messages = await db.eval(READ_SIGNALS_SCRIPT, { keys: [inboxKey(suppliedToken)], arguments: [] });
      return reply(res, 200, {
        signals: messages.map(value => { try { return JSON.parse(value); } catch (_) { return null; } }).filter(Boolean)
      });
    }

    return reply(res, 400, { error: 'Unknown action.' });
  } catch (error) {
    console.error('Arcade API error:', error);
    return reply(res, 500, { error: 'Game service is temporarily unavailable. Check Redis configuration.' });
  }
};
