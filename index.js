//created by frmnzz.json
// created by frmnzz.json
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ==== CONFIG ====
const botToken = '7964658774:AAFz0UhJ88cGoz0nXi-SsgEmfgNngj8GvYE';
const adminId = '695284666';
const github = {
  token: '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',
  repoOwner: 'ekikmbut',
  repoName: 'maklodb',
  akunPath: 'akun.json',
  tokenPath: 'token.json'
};

// ==== INIT BOT ====
const bot = new Telegraf(botToken);

// ==== ROLE FILE ====
const roleFile = path.join(__dirname, 'Akses.json');
if (!fs.existsSync(roleFile)) fs.writeFileSync(roleFile, JSON.stringify({ owners: [], moderators: [], resellers: [] }, null, 2));
function loadRoles() { return JSON.parse(fs.readFileSync(roleFile)); }
function saveRoles(data) { fs.writeFileSync(roleFile, JSON.stringify(data, null, 2)); }
function isAdmin(id) { return id.toString() === adminId.toString(); }
function isModerator(id) { const { moderators } = loadRoles(); return moderators.includes(id.toString()) || isAdmin(id); }
function isOwner(id) { const { owners } = loadRoles(); return owners.includes(id.toString()) || isModerator(id); }
function isReseller(id) { const { resellers } = loadRoles(); return resellers.includes(id.toString()) || isOwner(id); }
function addRole(type, id) { const roles = loadRoles(); if (!roles[type].includes(id)) { roles[type].push(id); saveRoles(roles); } }
function removeRole(type, id) { const roles = loadRoles(); roles[type] = roles[type].filter(i => i !== id); saveRoles(roles); }

// ==== GITHUB HANDLER ====
const headers = {
  Authorization: `Bearer ${github.token}`, // ✅ FIXED: pakai Bearer, bukan token
  Accept: 'application/vnd.github.v3+json'
};

async function getGitHubContent(filePath) {
  try {
    const { data } = await axios.get(
      `https://api.github.com/repos/${github.repoOwner}/${github.repoName}/contents/${filePath}`,
      { headers }
    );
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    return { content: JSON.parse(content), sha: data.sha };
  } catch (err) {
    console.error("❌ GITHUB ERROR:", err.response?.data || err.message);
    if (err.response?.status === 404) return { content: [], sha: null };
    throw new Error("Gagal mengambil data dari GitHub.");
  }
}

async function updateGitHubContent(filePath, newContent, sha) {
  const payload = {
    message: `Update file ${filePath}`,
    content: Buffer.from(JSON.stringify(newContent, null, 2)).toString('base64'),
    sha: sha || undefined
  };
  await axios.put(
    `https://api.github.com/repos/${github.repoOwner}/${github.repoName}/contents/${filePath}`,
    payload,
    { headers }
  );
}

// ==== Akun Handler ====
async function addAkun(username, password) {
  const { content, sha } = await getGitHubContent(github.akunPath);
  const exist = content.find(u => u.username === username);
  if (exist) throw new Error("Username sudah terdaftar.");
  content.push({ username, password });
  await updateGitHubContent(github.akunPath, content, sha);
}

async function deleteAkun(username) {
  const { content, sha } = await getGitHubContent(github.akunPath);
  const filtered = content.filter(u => u.username !== username);
  if (filtered.length === content.length) throw new Error("Username tidak ditemukan.");
  await updateGitHubContent(github.akunPath, filtered, sha);
}

// ==== Token Handler ====
async function addToken(token) {
  const { content, sha } = await getGitHubContent(github.tokenPath);

  // Validasi bentuk objek
  if (!content.tokens || !Array.isArray(content.tokens)) {
    throw new Error("Format token.json tidak valid (harus ada 'tokens' array)");
  }

  if (content.tokens.includes(token)) throw new Error("Token sudah ada.");
  content.tokens.push(token);
  await updateGitHubContent(github.tokenPath, content, sha);
}

async function deleteToken(token) {
  const { content, sha } = await getGitHubContent(github.tokenPath);

  if (!content.tokens || !Array.isArray(content.tokens)) {
    throw new Error("Format token.json tidak valid.");
  }

  const filtered = content.tokens.filter(t => t !== token);
  if (filtered.length === content.tokens.length) throw new Error("Token tidak ditemukan.");
  content.tokens = filtered;

  await updateGitHubContent(github.tokenPath, content, sha);
}


bot.start(async (ctx) => {
  try {
    await ctx.replyWithPhoto(
      { url: 'https://files.catbox.moe/fbtkyd.jpg' },
      {
        caption: `\`\`\`MENU-ADD-DATABASE-(🍁)
╭━━━━⭓RESELLER MENU
┃▢ /listakun → Lihat daftar akun
┃▢ /addakun → Tambah akun baru
┃▢ /delakun → Hapus akun
┃▢ /addtoken → Tambah token baru
┃▢ /deltoken → Hapus token
┃▢ /listtoken → Lihat token
╰━━━━━━━━━━━━━━━━━━⭓
╭━━━━⭓PARTNER MENU
┃▢ /addreseller <id>
┃▢ /delreseller <id>
╰━━━━━━━━━━━━━━━━━━⭓
╭━━━━⭓MODERATOR MENU
┃▢ /addpt <id>
┃▢ /delpt <id>
╰━━━━━━━━━━━━━━━━━━⭓
╭━━━━⭓OWNER MENU
┃▢ /addmoderator <id>
┃▢ /delmoderator <id>
╰━━━━━━━━━━━━━━━━━━⭓
\`\`\``,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.url('DEVELOPER🕊️', 'https://t.me/ekikjembot2'),
        ]),
      }
    );
  } catch (err) {
    console.error(err);
  }
});

// ==== Token Commands ====
bot.command('addtoken', async (ctx) => {
  if (!isReseller(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /addtoken [token]");
  try {
    await addToken(args[1]);
    ctx.reply(`✅ Token ditambahkan: ${args[1]}`);
  } catch (err) {
    ctx.reply("⚠️ " + err.message);
  }
});

bot.command('deltoken', async (ctx) => {
  if (!isReseller(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /deltoken [token]");
  try {
    await deleteToken(args[1]);
    ctx.reply(`🗑️ Token dihapus: ${args[1]}`);
  } catch (err) {
    ctx.reply("⚠️ " + err.message);
  }
});

bot.command('listtoken', async (ctx) => {
  if (!isModerator(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  try {
    const { content } = await getGitHubContent(github.tokenPath);
    if (!content.tokens || !content.tokens.length) return ctx.reply("📭 Tidak ada token.");
    const msg = content.tokens.map((t, i) => `${i + 1}. ${t}`).join('\n');
    ctx.reply("📋 Daftar Token:\n" + msg);
  } catch (err) {
    console.error("❌ listtoken error:", err.message);
    ctx.reply("⚠️ Gagal mengambil token.");
  }
});


// ==== Akun Commands ====
bot.command('addakun', async (ctx) => {
  if (!isReseller(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 3) return ctx.reply("Format: /addakun [username] [password]");
  try {
    await addAkun(args[1], args[2]);
    ctx.reply("✅ Akun ditambahkan.");
  } catch (err) {
    ctx.reply("⚠️ " + err.message);
  }
});

bot.command('delakun', async (ctx) => {
  if (!isReseller(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /delakun [username]");
  try {
    await deleteAkun(args[1]);
    ctx.reply("✅ Akun dihapus.");
  } catch (err) {
    ctx.reply("⚠️ " + err.message);
  }
});

bot.command('listakun', async (ctx) => {
  if (!isModerator(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  try {
    const { content } = await getGitHubContent(github.akunPath);
    if (!content.length) return ctx.reply("📭 Tidak ada akun.");
    const msg = content.map((u, i) => `${i + 1}. Username: ${u.username}`).join('\n');
    ctx.reply("📋 Daftar Akun:\n" + msg);
  } catch {
    ctx.reply("⚠️ Gagal mengambil data akun.");
  }
});

// ==== Role Commands ====
bot.command('addreseller', (ctx) => {
  if (!isOwner(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /addreseller [id]");
  addRole('resellers', args[1]);
  ctx.reply("✅ Reseller ditambahkan.");
});

bot.command('delreseller', (ctx) => {
  if (!isOwner(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /delreseller [id]");
  removeRole('resellers', args[1]);
  ctx.reply("✅ Reseller dihapus.");
});

bot.command('addpt', (ctx) => {
  if (!isModerator(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /addpt [id]");
  addRole('owners', args[1]);
  ctx.reply("✅ Owner ditambahkan.");
});

bot.command('delpt', (ctx) => {
  if (!isModerator(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /delpt [id]");
  removeRole('owners', args[1]);
  ctx.reply("✅ Owner dihapus.");
});

bot.command('addmoderator', (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("❌ Akses hanya untuk admin.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /addmoderator [id]");
  addRole('moderators', args[1]);
  ctx.reply("✅ Moderator ditambahkan.");
});

bot.command('delmoderator', (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("❌ Akses hanya untuk admin.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /delmoderator [id]");
  removeRole('moderators', args[1]);
  ctx.reply("✅ Moderator dihapus.");
});

// ==== Launch Bot ====
bot.launch();
console.log("🤖 Bot Telegram Gabungan Berjalan...");

/*const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ==== CONFIG ====
const botToken = '7802438514:AAH2UUwZhRSiYlIjQAXhNm4Zu3Ky3_UXLWY';
const adminId = '7429916669';
const github = {
  token: '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',
  repoOwner: 'dbfrmn',
  repoName: 'Databasev21',
  akunPath: 'akun.json',
  tokenPath: 'token.json'
};

// ==== INIT BOT ====
const bot = new Telegraf(botToken);

// ==== ROLE FILE ====
const roleFile = path.join(__dirname, 'Akses.json');
if (!fs.existsSync(roleFile)) fs.writeFileSync(roleFile, JSON.stringify({ owners: [], moderators: [], resellers: [] }, null, 2));
function loadRoles() { return JSON.parse(fs.readFileSync(roleFile)); }
function saveRoles(data) { fs.writeFileSync(roleFile, JSON.stringify(data, null, 2)); }
function isAdmin(id) { return id.toString() === adminId.toString(); }
function isModerator(id) { const { moderators } = loadRoles(); return moderators.includes(id.toString()) || isAdmin(id); }
function isOwner(id) { const { owners } = loadRoles(); return owners.includes(id.toString()) || isModerator(id); }
function isReseller(id) { const { resellers } = loadRoles(); return resellers.includes(id.toString()) || isOwner(id); }
function addRole(type, id) { const roles = loadRoles(); if (!roles[type].includes(id)) { roles[type].push(id); saveRoles(roles); } }
function removeRole(type, id) { const roles = loadRoles(); roles[type] = roles[type].filter(i => i !== id); saveRoles(roles); }

// ==== GITHUB HANDLER ====
const baseUrl = `https://api.github.com/repos/${github.repoOwner}/${github.repoName}/contents/${github.tokenpath}`;

const baseUrl2 = `https://api.github.com/repos/${github.repoOwner}/${github.repoName}/contents/${github.akunath}`;

const headers = {
  Authorization: `token ${github.token}`,
  Accept: 'application/vnd.github.v3+json'
};

async function getGitHubContent(path) {
  const res = await axios.get(path, {
    headers: {
      Authorization: `Bearer ${github.apiToken}`,
      Accept: 'application/vnd.github.v3+json',
    }
  });
  const content = Buffer.from(res.data.content, 'base64').toString('utf-8');
  return { content: JSON.parse(content) };
}

async function getFileContent() {
  try {
    const { data } = await axios.get(baseUrl, { headers });
    let content = Buffer.from(data.content, 'base64').toString('utf8');
    let parsed = JSON.parse(content);
    return { content: parsed.tokens || [], sha: data.sha };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { content: [], sha: null };
    }
    throw new Error("Gagal mengambil data dari GitHub.");
  }
}

async function getFileContent2() {
  try {
    const { data } = await axios.get(baseUrl2 , { headers });
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    const parsed = JSON.parse(content);

    // Validasi isi file akun
    if (!Array.isArray(parsed)) throw new Error("Format akun.json tidak valid");

    return { content: parsed, sha: data.sha };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // File tidak ditemukan → anggap kosong
      return { content: [], sha: null };
    }
    throw new Error("Gagal mengambil data akun dari GitHub.");
  }
}


/*async function getFileContent2() {
  try {
    const { data } = await axios.get(baseUrl2, { headers });
    let content = Buffer.from(data.content, 'base64').toString('utf8');
    let parsed = JSON.parse(content);
    return { content: parsed.tokens || [], sha: data.sha };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { content: [], sha: null };
    }
    throw new Error("Gagal mengambil data dari GitHub.");
  }
}*/



/*async function getGitHubContent3(filePath) {
  try {
    const { data } = await axios.get(
      `https://api.github.com/repos/${github.repoOwner}/${github.repoName}/contents/${filePath}`,
      { headers }
    );
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    return { content: JSON.parse(content), sha: data.sha };
  } catch (err) {
    if (err.response?.status === 404) return { content: [], sha: null };
    throw new Error("Gagal mengambil data dari GitHub.");
  }
}

async function updateFileContent(newContent, sha) {
  const payload = {
    message: "Update tokens",
    content: Buffer.from(JSON.stringify({ tokens: newContent }, null, 2)).toString('base64'),
    sha: sha || undefined,
  };
  await axios.put(baseUrl, payload, { headers });
}

async function updateGitHubContent(path, newContent, sha) {
  await axios.put(path, {
    message: 'Update akun list',
    content: Buffer.from(newContent).toString('base64'),
    sha
  }, {
    headers: {
      Authorization: `Bearer ${github.apiToken}`,
      Accept: 'application/vnd.github.v3+json',
    }
  });
}



async function updateGitHubContent2(filePath, newContent, sha) {
  const payload = {
    message: `Update file ${filePath}`,
    content: Buffer.from(JSON.stringify(newContent, null, 2)).toString('base64'),
    sha: sha || undefined
  };
  await axios.put(
    `https://api.github.com/repos/${github.repoOwner}/${github.repoName}/contents/${github.akunpath}`,
    payload,
    { headers }
  );
}

// ==== Akun Handler ====
async function addAkun(username, password) {
  const { content, sha } = await getFileContent2(github.akunPath);
  if (!Array.isArray(content)) throw new Error("Data akun tidak valid");

  if (content.find(u => u.username === username)) {
    throw new Error("Username sudah terdaftar");
  }

  content.push({ username, password });

  await updateGitHubContent(github.akunPath, JSON.stringify(content, null, 2), sha);
}


async function deleteAkun(username) {
  const { content, sha } = await getFileContent2(github.akunPath);
  if (!Array.isArray(content)) throw new Error("Data akun tidak valid");

  const filtered = content.filter(u => u.username !== username);

  if (filtered.length === content.length) {
    throw new Error("Username tidak ditemukan");
  }

  await updateGitHubContent(github.akunPath, JSON.stringify(filtered, null, 2), sha);
}


// ==== Token Handler ====
async function addToken(token) {
  const { content, sha } = await getFileContent();
  if (content.includes(token)) throw new Error("Token sudah ada.");
  content.push(token);
  await updateFileContent(content, sha);
}
/*
async function addToken(token) {
  const { content } = await getGitHubContent(github.tokenPath);
  if (content.includes(token)) throw new Error("Token sudah ada");
  content.push(token);
  await updateGitHubContent(github.tokenPath, content);
}*/


/*async function deleteToken(token) {
  const { content, sha } = await getGitHubContent(github.tokenPath);
  const filtered = content.filter(t => t !== token);
  if (filtered.length === content.length) throw new Error("Token tidak ditemukan.");
  await updateGitHubContent(github.tokenPath, filtered, sha);
}

// ==== COMMANDS ====
bot.start(async (ctx) => {
  try {
    await ctx.replyWithPhoto(
      { url: 'https://files.catbox.moe/hn6mg0.jpg' },
      {
        caption: `\`\`\`MENU-ADD-DATABASE-(🍁)
╭━━━━⭓RESELLER MENU
┃▢ /listakun → Lihat daftar akun
┃▢ /addakun → Tambah akun baru
┃▢ /delakun → Hapus akun
┃▢ /addtoken → Tambah token baru
┃▢ /deltoken → Hapus token
┃▢ /listtoken → Lihat token
╰━━━━━━━━━━━━━━━━━━⭓
╭━━━━⭓PARTNER MENU
┃▢ /addreseller <id>
┃▢ /delreseller <id>
╰━━━━━━━━━━━━━━━━━━⭓
╭━━━━⭓MODERATOR MENU
┃▢ /addpt <id>
┃▢ /delpt <id>
╰━━━━━━━━━━━━━━━━━━⭓
╭━━━━⭓OWNER MENU
┃▢ /addmoderator <id>
┃▢ /delmoderator <id>
╰━━━━━━━━━━━━━━━━━━⭓
\`\`\``,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.url('DEVELOPER🕊️', 'https://t.me/frmnzz25'),
        ]),
      }
    );
  } catch (err) {
    console.error(err);
  }
});*/

// ==== Token Commands ====
/*bot.command('addtoken', async (ctx) => {
  if (!isReseller(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /addtoken [token]");
  try {
    await addToken(args[1]);
    ctx.reply(`✅ Token ditambahkan: ${args[1]}`);
  } catch (err) {
    ctx.reply("⚠️ " + err.message);
  }
});

bot.command('deltoken', async (ctx) => {
  if (!isReseller(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /deltoken [token]");
  try {
    await deleteToken(args[1]);
    ctx.reply(`🗑️ Token dihapus: ${args[1]}`);
  } catch (err) {
    ctx.reply("⚠️ " + err.message);
  }
});*/

/*bot.command('addtoken', async (ctx) => {
  if (!isReseller(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /addtoken [token]");
  try {
    await addToken(args[1]);
    ctx.reply("✅ Token ditambahkan.");
  } catch (err) {
    ctx.reply("⚠️ " + err.message);
  }
});
bot.command('deltoken', async (ctx) => {
  if (!isReseller(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /deltoken [token]");
  try {
    await deleteToken(args[1]);
    ctx.reply("✅ Token dihapus.");
  } catch (err) {
    ctx.reply("⚠️ Gagal menghapus token.");
  }
});

bot.command('listtoken', async (ctx) => {
  if (!isModerator(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  try {
    const { content } = await getFileContent(github.tokenPath);
    if (!content.length) return ctx.reply("📭 Tidak ada token.");
    const msg = content.map((t, i) => `${i + 1}. ${t}`).join('\n');
    ctx.reply("📋 Daftar Token:\n" + msg);
  } catch {
    ctx.reply("⚠️ Gagal mengambil token.");
  }
});

// ==== Akun Commands ====
bot.command('addakun', async (ctx) => {
  if (!isReseller(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 3) return ctx.reply("Format: /addakun [username] [password]");
  try {
    await addAkun(args[1], args[2]);
    ctx.reply("✅ Akun ditambahkan.");
  } catch (err) {
    ctx.reply("⚠️ " + err.message);
  }
});

bot.command('delakun', async (ctx) => {
  if (!isReseller(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /delakun [username]");
  try {
    await deleteAkun(args[1]);
    ctx.reply("✅ Akun dihapus.");
  } catch (err) {
    ctx.reply("⚠️ " + err.message);
  }
});

bot.command('listakun', async (ctx) => {
  if (!isModerator(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  try {
    const { content } = await getFileContent2(github.akunPath);
    if (!content.length) return ctx.reply("📭 Tidak ada akun.");
    const msg = content.map((u, i) => `${i + 1}. Username: ${u.username}`).join('\n');
    ctx.reply("📋 Daftar Akun:\n" + msg);
  } catch {
    ctx.reply("⚠️ Gagal mengambil data akun.");
  }
});

// ==== Role Commands ====
bot.command('addreseller', (ctx) => {
  if (!isOwner(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /addreseller [id]");
  addRole('resellers', args[1]);
  ctx.reply("✅ Reseller ditambahkan.");
});

bot.command('delreseller', (ctx) => {
  if (!isOwner(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /delreseller [id]");
  removeRole('resellers', args[1]);
  ctx.reply("✅ Reseller dihapus.");
});

bot.command('addpt', (ctx) => {
  if (!isModerator(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /addpt [id]");
  addRole('owners', args[1]);
  ctx.reply("✅ Owner ditambahkan.");
});

bot.command('delpt', (ctx) => {
  if (!isModerator(ctx.from.id)) return ctx.reply("❌ Akses ditolak.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /delpt [id]");
  removeRole('owners', args[1]);
  ctx.reply("✅ Owner dihapus.");
});

bot.command('addmoderator', (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("❌ Akses hanya untuk admin.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /addmoderator [id]");
  addRole('moderators', args[1]);
  ctx.reply("✅ Moderator ditambahkan.");
});

bot.command('delmoderator', (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("❌ Akses hanya untuk admin.");
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("Format: /delmoderator [id]");
  removeRole('moderators', args[1]);
  ctx.reply("✅ Moderator dihapus.");
});

bot.launch();
console.log("🤖 Bot Telegram Gabungan Berjalan...");*/
