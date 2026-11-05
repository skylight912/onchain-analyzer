# onchain-analyzer

链上地址画像小工具。**零配置、零 API Key**，直接跑。

## 用法

```bash
cd ~/.openclaw/workspace/onchain-analyzer

node wallet.mjs --demo                       # 看效果
node wallet.mjs 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045        # 以太坊
node wallet.mjs 0x4200...0042 -c optimism    # Optimism
node wallet.mjs 0xADDR -c gnosis             # Gnosis
```

## 真实输出

```
地址      0xd8da6bf26964af9d7eed9e03e53415d37aa96045  (vitalik.eth)
类型      合约
余额      5.7804 ETH  ≈ $13,973
交易总数  78,427 笔
代币转账  403,810 笔  (ERC20)
Gas 消耗  1,210,909,887

样本交易  50 笔（最近一页）
活跃区间  2026-10-08 → 2026-11-04  (跨度 27 天)
样本频率  1.85 笔/天

主要对手方:
  0x852e…1Fda   22 笔
  0x8195…8364   6 笔
  ...
```

## 指标含义

| 指标 | 说明 |
|---|---|
| 类型 | 合约 or 普通钱包(EOA) |
| 余额 | 原生币余额 + 实时美元估值 |
| 交易总数 | 历史累计普通交易 |
| 代币转账 | ERC-20 累计笔数（判断是否是老手/撸毛号的关键） |
| Gas 消耗 | 累计 gas 单位，越大说明链上活动越猛 |
| 样本频率 | 最近一页交易的日均笔数（判断机器人 vs 活人） |
| 主要对手方 | 交互最频繁的 5 个地址 |

## 数据来源

Blockscout 开源实例，免 key、免注册：
- `eth` → eth.blockscout.com ✅
- `optimism` → explorer.optimism.io ✅
- `gnosis` → gnosisscan.io ✅

**当前不可用**：base / arbitrum / polygon 实例被 Cloudflare 挡了（403），脚本会明确报错而不是静默失败。

## 已知限制

- 交易频率是「最近一页 50 笔」估算，不是全历史
- 只看普通交易，代币明细要用 `/token-transfers` 接口
- 极繁忙地址（如 OP 治理代币合约）一页 50 笔全在同一天，跨度会显示 1 天

## 下一步能加（都是小改动）

- `--json` 输出喂给别的脚本
- `/token-transfers` 拉持仓变化
- 地址标签库（交易所 / 混币器 / 已知项目合约）
- 批量模式：读 CSV 一次跑几百个地址

## 文件

- `wallet.mjs` — 全部逻辑，约 130 行
