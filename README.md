# Autonomous Quant Trader — RL Environment Architecture

**Target:** HUD × YC Frontier/RSI Hackathon · Autonomous Business + Agentic Collaboration
**One-liner:** An autonomous trading *firm* (a small org of agents) that researches, implements, validates, and executes strategies in a **synthetic market calibrated to real data**, trained with RL on a **verifiable, non-reward-hackable** signal.

---

## 0. Design principle (read first)

Everything below exists to satisfy one constraint: **the reward must measure skill, not market luck, and must not be hackable.** The founders' own number is that ~90% of RL data fails — usually because it hill-climbs while learning the wrong thing. We avoid that by:

1. **Trading a market we generate** → there's a *known optimal*, so PnL becomes a skill measurement.
2. **Calibrating that market to real data** → realistic dynamics, not a contrived toy.
3. **Penalizing self-deception** (lookahead/overfitting) and **ruin** → the agent can't game its way to a high score.
4. **Proving transfer on held-out generators** → a climbing curve that's learning the *right* thing.

If a change breaks any of these four, reject it.

---

## 1. System overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        HUD RL ENVIRONMENT                              │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                   THE FIRM (agent org)                          │  │
│  │                                                                 │  │
│  │   ┌───────────────┐                                             │  │
│  │   │ ORCHESTRATOR  │  (PM / capital allocator — the policy)      │  │
│  │   │  under test   │                                             │  │
│  │   └──────┬────────┘                                             │  │
│  │          │ calls specialists as MCP tools (subagent pattern)    │  │
│  │   ┌──────┼──────────────┬──────────────────┐                    │  │
│  │   ▼      ▼              ▼                  ▼                    │  │
│  │ Research  Risk-Mgr     Executor        (Auditor)               │  │
│  │ subagent  subagent     subagent        subagent                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│          │ tool calls (@env.tool + connectors)                         │
│  ┌───────┴────────────────────────────────────────────────────────┐  │
│  │  TOOLS LAYER                                                    │  │
│  │  get_market_state · run_backtest · implement_strategy ·         │  │
│  │  size_position · place_orders · read_features                   │  │
│  │  connect_openapi → Exa (news) · SixtyFour (fundamentals)        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│          │                                                             │
│  ┌───────┴──────────────┐   ┌──────────────────┐   ┌───────────────┐  │
│  │ SYNTHETIC MARKET     │   │ EXECUTION SIM     │   │ GRADER        │  │
│  │ generators (DGP)     │──▶│ (costs, slippage, │──▶│ (env-side,    │  │
│  │ calibrated to real   │   │  fills, no-look)  │   │ tool-filtered)│  │
│  └──────────────────────┘   └──────────────────┘   └───────────────┘  │
│          ▲                                                  │          │
│   real-data calibration slice                        scalar reward     │
└──────────────────────────────────────────────────────────────────────┘
            │                                                  │
   ┌────────┴─────────┐                            ┌───────────┴────────┐
   │ EXTERNAL MEMORY  │                            │  RL TRAINING LOOP  │
   │ (playbook store; │                            │  GRPO via Fireworks│
   │  read pre-run,   │                            │  / HUD on-policy   │
   │  write post-grade)│                           │  + held-out eval   │
   └──────────────────┘                            └────────────────────┘
```

---

## 2. The agent loop (one episode)

```
 ┌─────────────┐
 │ 1. OBSERVE  │  get_market_state() → prices, features, regime
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │ 2.HYPOTHESIZE│ Research subagent proposes a signal/strategy
 └──────┬──────┘  (optionally enriched via Exa / SixtyFour)
        ▼
 ┌─────────────┐
 │ 3.IMPLEMENT │  implement_strategy() → params / code
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │ 4. VALIDATE │  run_backtest() in-sample; Auditor checks for
 └──────┬──────┘  lookahead / overfit  (feeds self-deception term)
        ▼
 ┌─────────────┐
 │ 5. EXECUTE  │  Risk-Mgr sizes positions; Executor places orders
 └──────┬──────┘  in the execution sim (costs + slippage applied)
        ▼
 ┌─────────────┐
 │ 6. SCORE    │  grader runs on HELD-OUT episode from same DGP
 └──────┬──────┘  → scalar reward
        ▼
 ┌─────────────┐
 │ 7. IMPROVE  │  (a) weights via GRPO on high-reward trajectories
 └─────────────┘  (b) playbook append to external memory
```

Single-turn per task for trainability; the "org" is realized via subagent tool calls inside the turn, not multi-turn chat.

---

## 3. The reward function (the heart)

```
reward =  w1 * edge_capture          # fraction of recoverable edge captured
        - w2 * self_deception        # lookahead / overfit / failed-ablation penalty
        - w3 * ruin                  # max-drawdown / blow-up penalty (business survival)
        - w4 * cost_violation        # ignoring transaction costs / over-leverage
```

**edge_capture** = realized risk-adjusted return (Sharpe/Sortino, cost-adjusted) ÷ the *theoretical max* return achievable in that generated market (known, because we own the DGP). Range-normalized to [0,1].

**self_deception** = penalty if the agent's own backtest used future data, if the strategy fails an out-of-sample ablation the env runs, or if reported in-sample Sharpe diverges from held-out Sharpe beyond a threshold. *This is the differentiator — the agent is scored on not fooling itself.*

**ruin** = penalty scaling with max drawdown; a blow-up (equity < ruin threshold) → reward floored at 0 regardless of peak PnL. Encodes "a business that goes bankrupt scores zero."

**Tuning to the 20–50% band:** dial signal-to-noise of the generator (signal strength vs. injected noise) and transaction costs until baseline models capture 20–50% of recoverable edge with real variance. Run each task ≥10× to confirm the band before committing.

**Anti-reward-hacking checklist (must all hold):**
- transaction costs + slippage applied on every fill
- hard position-size / leverage caps
- execution sim never reveals future bars (no-lookahead harness)
- grader is env-side and tool-filtered (agent cannot call it)
- ablation run proves the strategy isn't exploiting a sim artifact

---

## 4. Data layer

### Primary: synthetic generators (DGP), calibrated to real
| Generator | Models | Recoverable edge |
|---|---|---|
| Ornstein–Uhlenbeck | mean reversion | revert to known mean |
| GBM + regime switch (HMM) | trend / regime change | follow regime |
| Cointegrated pairs | stat-arb | trade the spread |
| Hawkes process | order-flow clustering | microstructure timing |

**Calibration:** fit generator parameters (drift, vol, mean-reversion speed, regime transition probs) to a **frozen real-market slice** so dynamics look real while ground truth stays known. This is what keeps it out of the "contrived/toy" bucket the founders distrust.

### Real-data sources (for calibration + optional realism layer)
- **Free history:** yfinance, Stooq, Alpha Vantage (free key); LOBSTER samples for intraday/LOB.
- **Sponsors:** Protege (real-world training datasets — *ask them*), Exa (news/context tool), SixtyFour (fundamentals tool).
- Real data is for **calibration and flavor only** — never the core reward (it reintroduces luck/leakage).

---

## 5. HUD integration (env.py skeleton)

```python
from hud import Environment
from hud.capabilities import Capability

env = Environment("autonomous-quant-firm")

# --- agent-callable tools ---
@env.tool()
def get_market_state(episode_id: str) -> dict: ...
@env.tool()
def run_backtest(strategy: dict, split: str = "in_sample") -> dict: ...
@env.tool()
def implement_strategy(spec: dict) -> dict: ...
@env.tool()
def size_position(signal: dict, risk_budget: float) -> dict: ...
@env.tool()
def place_orders(orders: list) -> dict: ...

# --- sponsor tools via connectors ---
env.connect_openapi("https://api.exa.ai/openapi.json")        # news/context
env.connect_openapi("https://api.sixtyfour.ai/openapi.json")  # fundamentals

# --- specialist subagents exposed as MCP tools ---
env = env  # research_subagent / risk_subagent / auditor_subagent
            # registered via FastMCP + Capability.mcp(...)

# --- env-side GRADER (hidden from agent) ---
@env.tool()                       # excluded via scenario filtering
def _grade_held_out(strategy: dict) -> float: ...

@env.scenario("trade_episode", exclude_tools=["_grade_*"])
async def trade_episode(generator: str, difficulty: int):
    answer = yield build_prompt(generator, difficulty)   # PROMPT
    reward = await score(answer,                          # REWARD
                         edge_capture=..., self_deception=...,
                         ruin=..., cost_violation=...)
    yield reward

# difficulty spread → trainable band
tasks = [trade_episode(generator="ou", difficulty=d) for d in range(1, 6)]
```

Plug the trained checkpoint back in for the baseline→trained comparison:
```python
from hud.agents import OpenAIChatAgent
trained = OpenAIChatAgent(base_url="<fireworks-or-hud-checkpoint>", model="...")
```

---

## 6. Training & evaluation loop

```
1. BASELINE     run taskset across Claude / GPT / Gemini / MiniMax (HUD gateway)
                → leaderboard, confirm 20–50% band + headroom
2. ROLL OUT     taskset.run(agent, group=8, max_concurrent=10)   # GRPO groups
3. TRAIN        GRPO on high-reward trajectories (Fireworks cookbook / HUD on-policy)
4. TRANSFER     re-eval trained checkpoint on HELD-OUT generators (never trained on)
5. SHOW         the edge-capture curve climbing on held-out  ← the money demo
```

**Deadline gate:** first training run live by **8 AM Sunday**. If the curve climbs but an ablation shows it's gaming the sim, that's a *fail* (the 90% trap) — fix the reward, don't ship the curve.

---

## 7. What to reuse vs. build

| Reuse (don't rebuild) | Source |
|---|---|
| Backtest engine, strategy registry | AgentQuant `src/backtest`, `src/strategies` (check license first) |
| Market simulator | ABIDES / FinRL / gym-anytrading |
| Env + eval + training + gateway | HUD SDK |
| GRPO training | Fireworks cookbook / HUD on-policy |
| News / fundamentals tools | Exa / SixtyFour via `connect_openapi` |

**Build yourself:** the synthetic generators + calibration, the reward function (esp. self-deception + ruin terms), the no-lookahead execution harness, the held-out transfer eval.

---

## 8. v1 scope (perfect ONE task first)

> Founders' guidance: build one excellent task, then extrapolate.

**v1 task:** OU mean-reversion, single synthetic asset, calibrated to a real pair's mean-reversion stats.
- Tools: `get_market_state`, `implement_strategy`, `run_backtest`, `size_position`, `place_orders`
- Reward: edge_capture − self_deception − ruin, with costs + position cap
- Held-out: fresh OU draws with the same parameters
- Prove: baseline ~20–50%, trained climbs on held-out, ablation shows real skill

Only after v1 is immaculate: add regime-switch + cointegrated-pairs generators, then the full research/risk/executor org.

---

## 9. Module structure

```
quant-firm/
├── env.py                  # HUD Environment, tools, scenario, grader
├── generators/             # synthetic DGPs + real-data calibration
│   ├── ou.py  regime.py  pairs.py  hawkes.py  calibrate.py
├── sim/                    # execution sim: fills, costs, slippage, no-lookahead
├── strategies/             # reference implementations (from AgentQuant)
├── backtest/               # vectorized engine (from AgentQuant)
├── reward/                 # edge_capture, self_deception, ruin, cost terms
├── subagents/              # research / risk / executor / auditor (FastMCP)
├── memory/                 # external playbook store (read pre-run, write post-grade)
├── tasks.py                # difficulty-parameterized taskset
└── train/                  # GRPO rollout + held-out transfer eval
```

---

*Reward measures skill, not luck. The market is one we own. The business has a number for a soul.*
