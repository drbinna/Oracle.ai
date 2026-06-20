# Autonomous Quant Analyst-Trader — RL Environment

**HUD × YC Frontier/RSI Hackathon** · Autonomous Business + Agentic Collaboration

**One-liner:** An autonomous quant *firm* (a small org of agents) that analyzes real SEC filings, proposes and validates strategies, and is trained with RL on a **verifiable, filing-grounded rubric reward** — then provably improves itself, measured on held-out tasks.

---

## 0. Design principles (read first)

The founders say ~90% of RL data fails — it hill-climbs while learning the wrong thing (reward hacking, contrived tasks). Every choice here defends against that:

1. **Rubric reward, not a single scalar** — decomposed, weighted, verifiable sub-criteria. You can't game a reward that demands the right number *and* the right cited source *and* the right driver.
2. **Ground truth from the primary source** — numbers computed from the filing, drivers taken from its MD&A, citations matched to accession numbers. The LLM may *draft* a rubric; the filing is the truth.
3. **Real data, made verifiable** — real SEC filings (EDGAR/XBRL) + Exa, graded against filing-derived answers. (HUD's own finance example does exactly this.)
4. **Prove transfer on held-out tasks** — a climbing curve that's learning the *right* thing, not memorizing the taskset.

If a change breaks any of these four, reject it.

---

## 1. System overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        HUD RL ENVIRONMENT                              │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                   THE FIRM (agent org)                          │  │
│  │   ┌───────────────┐                                             │  │
│  │   │ ORCHESTRATOR  │  (PM / capital allocator — the policy)      │  │
│  │   └──────┬────────┘                                             │  │
│  │          │ calls specialists as MCP tools (subagent pattern)    │  │
│  │   ┌──────┼──────────────┬──────────────────┐                    │  │
│  │   ▼      ▼              ▼                  ▼                    │  │
│  │ Research  Risk-Mgr     Executor        Auditor                 │  │
│  └────────────────────────────────────────────────────────────────┘  │
│          │ tool calls (@env.tool + connectors)                         │
│  ┌───────┴────────────────────────────────────────────────────────┐  │
│  │  TOOLS: sec_search · read_filing · compute_metric ·             │  │
│  │  run_backtest · size_position · place_orders                    │  │
│  │  connect_openapi → Exa (search) · SixtyFour (fundamentals)      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│          │                                                             │
│  ┌───────┴────────────┐   ┌──────────────────────────────────────┐    │
│  │ RUBRIC GENERATOR   │   │ RUBRIC GRADER (env-side, filtered)    │    │
│  │ filing → answer key│──▶│ weighted: calc · attribution ·        │    │
│  │ + weighted criteria│   │ citations · strategy → scalar reward  │    │
│  └────────────────────┘   └──────────────────────────────────────┘    │
│          ▲                                          │                  │
│   SEC EDGAR / XBRL + MD&A                     dense reward             │
└──────────────────────────────────────────────────────────────────────┘
            │                                          │
   ┌────────┴─────────┐                    ┌───────────┴────────┐
   │ EXTERNAL MEMORY  │                    │  RL TRAINING       │
   │ (self-authored   │                    │  GRPO / RFT-lite   │
   │  playbook)       │                    │  + held-out eval   │
   └──────────────────┘                    └────────────────────┘
```

---

## 2. The agent loop (one episode)

```
1. OBSERVE     sec_search / read_filing → pull the relevant 10-K / 10-Q
2. ANALYZE     compute_metric → margins, YoY deltas, ratios
3. ATTRIBUTE   Research subagent names the drivers (cross-checks MD&A)
4. STRATEGIZE  propose optimization levers / positioning
5. VALIDATE    Auditor checks for unsupported claims / bad citations
6. ANSWER      structured output (numbers + citations + drivers + levers)
7. SCORE       rubric grader runs on a HELD-OUT filing → scalar reward
8. IMPROVE     (a) GRPO/RFT on high-reward trajectories
               (b) playbook append to external memory
```

Single-turn for trainability; the "org" lives in subagent tool calls inside the turn.

---

## 3. The reward: a HUD-style weighted rubric

Modeled on HUD's own finance example. The reward is a sum of weighted, verifiable criteria:

```
reward = Σ wᵢ · criterionᵢ        (normalized to [0,1])
```

| Section | Example criterion | How it's checked |
|---|---|---|
| **Calculation Accuracy** | "FY2022 gross margin = $X.XX (±$0.02)" | numeric tolerance vs. filing-computed value |
| **Attribution Analysis** | "Names higher input costs as the primary margin driver" | required entities present, cross-checked vs. MD&A |
| **Source Citations** | "Cites the FY2022 10-K (accession #…)" | accession-number / string match |
| **Strategy** | "Lists ≥5 specific optimization levers" | count + match vs. expert lever list (or synthetic optimum) |

**Why a rubric also trains better:** partial credit across criteria gives a **dense, shaped reward** (not sparse 0/1) — smoother gradient, easier to land in the 20–50% band.

**Anti-reward-hacking (must hold):**
- every numeric criterion grounded in a filing-derived value
- attribution grounded in the MD&A, not the grader's opinion
- grader is env-side and tool-filtered (agent can't call it)
- run HUD **QA Agents** to scan for false positives / reward hacking before training

---

## 4. The rubric generator (highest-leverage component)

Build this once; it manufactures your whole taskset.

```
filing (10-K/10-Q)                     →  parse (XBRL + text)
   ├─ compute numbers (rev, COGS, margins, YoY)  → Calculation criteria (auto)
   ├─ scrape MD&A drivers                         → Attribution criteria
   ├─ capture accession #                         → Citation criteria
   └─ LLM drafts strategy levers → human verify    → Strategy criteria
                          │
                          ▼
            weighted rubric  →  HUD native grader
```

**Discipline:** LLM drafts, primary source is truth. Verify every criterion against the filing (recompute numbers, confirm drivers in MD&A) before it counts.

---

## 5. Data layer

| Source | Role |
|---|---|
| **SEC EDGAR** (10-K/10-Q, full-text search) | base filings — agent tool + rubric ground truth |
| **SEC XBRL financial-statement datasets** | machine-readable values → auto-generate numeric rubrics at scale |
| **MD&A sections** | management's stated drivers → attribution ground truth |
| **Exa** (sponsor) | live search/news as an agent tool |
| **SixtyFour** (sponsor) | fundamentals enrichment as an agent tool |
| **Protege** (sponsor) | richer real-world datasets — ask the team |
| *Synthetic market (optional)* | known-optimal ground truth for the strategy layer only |

Real filings are both the agent's search target *and* (parsed) the answer key — same document, two roles.

---

## 6. HUD integration (env.py skeleton)

```python
from hud import Environment

env = Environment("autonomous-quant-firm")

@env.tool()
def sec_search(query: str) -> list: ...
@env.tool()
def read_filing(accession: str, section: str = "all") -> str: ...
@env.tool()
def compute_metric(filing: str, metric: str) -> float: ...
@env.tool()
def run_backtest(strategy: dict) -> dict: ...

env.connect_openapi("https://api.exa.ai/openapi.json")
env.connect_openapi("https://api.sixtyfour.ai/openapi.json")

# env-side rubric grader (hidden from the agent)
@env.tool()
def _grade_rubric(answer: dict, rubric: dict) -> float: ...

@env.scenario("analyze_filing", exclude_tools=["_grade_*"])
async def analyze_filing(ticker: str, difficulty: int):
    rubric = load_rubric(ticker, difficulty)        # from generator
    answer = yield build_prompt(ticker, rubric)     # PROMPT
    yield await _grade_rubric(answer, rubric)        # REWARD (weighted)

tasks = [analyze_filing(ticker=t, difficulty=d)
         for t in TICKERS for d in range(1, 4)]
```

Swap the trained checkpoint in for the baseline→trained comparison:
```python
from hud.agents import OpenAIChatAgent
trained = OpenAIChatAgent(base_url="<fireworks-or-hud-checkpoint>", model="...")
```

---

## 7. Model training routes

The rubric is a **verifiable reward**, so this is RLVR — no separate reward model to train.

| Route | What it is | 24h risk | Use when |
|---|---|---|---|
| **Rejection-sampling SFT** (expert iteration) | sample N rollouts, keep high-rubric traces, SFT on them | low ✅ | **do this first — guaranteed climb** |
| **GRPO on-policy** (HUD `hud rl` / Fireworks) | roll out taskset in GRPO groups, train on trajectories | medium | the strongest RSI claim, if time allows |
| **DPO from rubric pairs** | rank rollouts by rubric → preference pairs → DPO | medium | no reward model; smoother than GRPO |
| **In-context / playbook** | self-authored memory, no weight change | low | complement / lighter RSI story |

Notes:
- **Trained model = an open model** (Fireworks-finetunable, e.g. small Qwen/Llama). The **baseline leaderboard** uses closed frontier models (Claude/GPT/Gemini) via the HUD gateway — you can't fine-tune those.
- HUD guidance: ~10 runs/task, tune to the **20–50% band**, training run live by **8 AM Sunday**; GRPO group repeats share a group.
- **Recommended plan:** rejection-sampling SFT as the safe win, then attempt GRPO as the stretch. Both end in the same money shot — a **held-out transfer curve climbing**.

---

## 8. Training & evaluation loop

```
1. BASELINE   run taskset across Claude/GPT/Gemini/MiniMax → leaderboard, confirm band
2. ROLL OUT   group rollouts on the open model (group≥8)
3. TRAIN      rejection-sampling SFT (then GRPO if time)
4. TRANSFER   re-eval trained model on HELD-OUT filings (never trained on)
5. SHOW       the rubric-score curve climbing on held-out  ← the demo
```

If the curve climbs but QA shows reward hacking → that's a fail (the 90% trap). Fix the rubric, don't ship the curve.

---

## 9. v1 scope (perfect ONE task first)

> Founders' guidance: build one excellent task, then extrapolate.

**v1:** one company, one 10-K, a margin-analysis task.
- Tools: `sec_search`, `read_filing`, `compute_metric`
- Rubric: calc accuracy (±tol) + attribution (MD&A) + citation (accession)
- Held-out: a different company's filing, same rubric shape
- Prove: baseline ~20–50%, rejection-sampling SFT climbs on held-out, QA shows no hacking

Then extrapolate: more tickers, the strategy section, the firm-as-org, GRPO.

---

## 10. Module structure

```
quant-firm/
├── env.py                 # HUD Environment, tools, scenario, grader
├── rubric/                # generator + native graders
│   ├── generate.py  graders.py  verify.py
├── data/                  # EDGAR/XBRL fetch + MD&A parse
├── strategies/ backtest/  # reusable (from AgentQuant; check license)
├── subagents/             # research / risk / executor / auditor (FastMCP)
├── memory/                # external playbook store
├── tasks.py               # difficulty-parameterized taskset
└── train/                 # rejection-sampling SFT / GRPO + held-out eval
```

---

*Reward measures verifiable skill against the primary source. The rubric is the environment.*
