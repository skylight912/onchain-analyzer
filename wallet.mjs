#!/usr/bin/env node
/**
 * onchain-analyzer / wallet.mjs
 * 链上地址画像 —— 零配置、零 API Key，直接用 Blockscout 免费公共接口。
 *
 * 用法:
 *   node wallet.mjs 0xADDRESS          # 以太坊
 *   node wallet.mjs 0xADDRESS -c base  # base / arbitrum / optimism / polygon / gnosis
 *   node wallet.mjs --demo             # 跑个样本
 */

const CHAINS = {
  eth: 'https://eth.blockscout.com',
  optimism: 'https://explorer.optimism.io',
  gnosis: 'https://gnosisscan.io',
};

const argv = process.argv.slice(2);
const ci = argv.indexOf('-c');
const chainKey = ci > -1 ? argv[ci + 1] : 'eth';
const isDemo = argv.includes('--demo');
const target = argv[0]?.startsWith('0x') ? argv[0] : null;

const HOST = CHAINS[chainKey];
if (!HOST) {
  console.error(`未知链: ${chainKey}\n可选: ${Object.keys(CHAINS).join(', ')}`);
  process.exit(1);
}

async function get(path, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${HOST}/api/v2${path}`, {
        headers: { accept: 'application/json', 'user-agent': 'onchain-analyzer/1.0' },
        redirect: 'follow',
      });
      if (res.ok) return res.json();
      if (res.status === 403) throw new Error(`HTTP 403（该实例开了 Cloudflare 防护）: ${path}`);
      lastErr = new Error(`HTTP ${res.status} ${path}`);
    } catch (e) {
      if (String(e.message).includes('403')) throw e;
      lastErr = e;
    }
    await new Promise(r => setTimeout(r, 600 * (i + 1)));
  }
  throw lastErr;
}

const short = a => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—');
const day = ts => (ts ? new Date(ts).toISOString().slice(0, 10) : '—');
const num = v => (v == null ? 0 : Number(v));

async function analyze(addr) {
  const base = await get(`/addresses/${addr}`);
  const [counters, txs] = await Promise.all([
    get(`/addresses/${addr}/counters`).catch(() => ({})),
    get(`/addresses/${addr}/transactions`).catch(() => ({ items: [] })),
  ]);

  const items = txs.items || [];
  const eth = num(base.coin_balance) / 1e18;

  // 主要对手方（从最近一页交易里统计）
  const c = new Map();
  for (const t of items) {
    const other = t.from?.hash?.toLowerCase() === addr ? t.to?.hash : t.from?.hash;
    if (other) c.set(other, (c.get(other) || 0) + 1);
  }
  const top = [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // 最近活跃 + 频率估算
  const stamps = items.map(t => new Date(t.timestamp).getTime()).filter(Boolean).sort();
  const firstSeen = stamps[0];
  const lastSeen = stamps[stamps.length - 1];
  const spanDays = firstSeen && lastSeen ? Math.max(1, (lastSeen - firstSeen) / 86400000) : 1;

  return {
    addr,
    ens: base.ens_domain_name,
    eth,
    usd: base.exchange_rate ? eth * num(base.exchange_rate) : null,
    isContract: base.is_contract,
    balanceUpdated: base.block_number_balance_updated_at,
    txTotal: num(counters?.transactions_count),
    transfersTotal: num(counters?.token_transfers_count),
    gasUsed: num(counters?.gas_usage_count),
    items,
    top,
    firstSeen,
    lastSeen,
    spanDays,
  };
}

function render(r) {
  const L = [];
  L.push(`地址      ${r.addr}${r.ens ? `  (${r.ens})` : ''}`);
  L.push(`类型      ${r.isContract ? '合约' : '普通钱包(EOA)'}`);
  L.push(`余额      ${r.eth.toFixed(4)} ETH${r.usd != null ? `  ≈ $${r.usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : ''}`);
  L.push(`交易总数  ${r.txTotal.toLocaleString()} 笔`);
  L.push(`代币转账  ${r.transfersTotal.toLocaleString()} 笔  (ERC20)`);
  L.push(`Gas 消耗  ${r.gasUsed.toLocaleString()}`);
  L.push('');
  L.push(`样本交易  ${r.items.length} 笔（最近一页）`);
  L.push(`活跃区间  ${day(r.firstSeen)} → ${day(r.lastSeen)}  (跨度 ${Math.round(r.spanDays)} 天)`);
  L.push(`样本频率  ${(r.items.length / r.spanDays).toFixed(2)} 笔/天`);
  L.push('');
  if (r.top.length) {
    L.push('主要对手方:');
    for (const [a, n] of r.top) L.push(`  ${short(a)}   ${n} 笔`);
  }
  return L.join('\n');
}

const addr = isDemo ? '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' : target;

if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
  console.error(`用法: node wallet.mjs 0xADDRESS [-c ${Object.keys(CHAINS).join('|')}]`);
  console.error('   或: node wallet.mjs --demo');
  process.exit(1);
}

try {
  const r = await analyze(addr.toLowerCase());
  console.log(render(r));
} catch (e) {
  console.error(`分析失败: ${e.message}`);
  process.exit(1);
}
