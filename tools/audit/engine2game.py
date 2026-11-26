# SPDX-License-Identifier: AGPL-3.0-only
"""The second engine, the game's half: the numbers SLAM the Game shows, worked out again in Python.

The cases come from tools/audit/game.cjs (the game's own scripts, run on made-up players). Every rule here is written
from what the game says on screen and from the sources, not copied from the game's code:

- money grows 7% a year after inflation; a month of growth is 1.07 to the power 1/12 (the same pace as a year);
- the FI number is a year of spending over the 4% draw, less what pays you anyway, plus the years you must bridge,
  each bridge year brought back to today one year at a time at 4%;
- Social Security: the SSA bend points, rates, 35 computation years, the career start age and the wage base are read
  from data/reference-2026.json (the game keeps its own copies in code);
- the IRA limit a year of saving (grow()) is read from the same file;
- a debt's rate is one rule everywhere: the rate typed in, else the middle of the band tapped, else a guess by kind;
- a level payment is the amount whose discounted sum is the balance (a sum, where the game uses the closed form);
- years to FI are found from the closed formula with logarithms, where the game steps year by year.
"""
import math

GROW, DRAW = 0.07, 0.04
MONTH = (1 + GROW) ** (1 / 12) - 1
BAND_MID = {'Under 8%': 5, '8% to 15%': 11.5, '15% to 25%': 20, 'Over 25%': 28, 'No interest': 0}
WORK = {'A main job', 'A second job', 'Side gigs', 'My own business'}
PERIODS = {'Weekly': 52, 'Every 2 weeks': 26, 'Twice a month': 24, 'Monthly': 12, 'It varies': 12, 'Daily': 260}
FREQ_DAYS = {'Weekly': [1, 8, 15, 22, 29], 'Every 2 weeks': [1, 15], 'Twice a month': [1, 15], 'Monthly': [1]}


def jsround(x):
    """Half up, the way the screen rounds (Python's round() goes to the even number)."""
    return math.floor(x + 0.5)


class Law:
    def __init__(self, ref):
        ss = ref['socialSecurity']
        self.b1, self.b2 = ss['bendPoint1'], ss['bendPoint2']
        self.rates = (ss['piaRate1'], ss['piaRate2'], ss['piaRate3'])
        self.years, self.start = ss['computationYears'], ss['careerStartAge']
        self.cap = ref['tax']['socialSecurityWageBase'] / 12
        self.ira = ref['limits']['ira']['base']

    def ss_estimate(self, take, stop):
        """A rough monthly benefit: take-home pay grossed up by 0.8, capped at the wage base, spread over 35 years."""
        if not (take > 0):
            return 0
        worked = max(0, min(self.years, (stop or 67) - self.start))
        aime = min(self.cap, take / 0.8) * worked / self.years
        pia, lo = 0.0, 0.0
        for hi, rate in ((self.b1, self.rates[0]), (self.b2, self.rates[1]), (math.inf, self.rates[2])):
            if aime > lo:
                pia += (min(aime, hi) - lo) * rate
            lo = hi
        return jsround(pia)


def annuity(n):
    """Today's value of 1 a year for n years at the 4% draw: each year brought back by itself."""
    if n <= 0:
        return 0.0
    whole = int(math.floor(n + 1e-12))
    total = sum((1 + DRAW) ** -k for k in range(1, whole + 1))
    if n - whole > 1e-12:  # a part year (an age with months): the textbook formula for the rest
        total += ((1 + DRAW) ** -whole - (1 + DRAW) ** -n) / DRAW
    return total


class Player:
    def __init__(self, x, law):
        self.x, self.law, X = x, law, x.get('x') or {}
        self.X = X
        self.age, self.ret_age, self.work = x['age'], x['ret'], x['work']
        self.take = sum(r['amt'] for r in x['incs'])
        self.spend = max(1, sum(r['amt'] for r in x['spends']))
        self.cash = sum(r['amt'] for r in x['cashes'] if not r['hold'])
        self.inv = sum(x['invs'])
        self.debt = sum(d['amt'] for d in x['debts'])
        self.own = max(0, self.take - sum(r['amt'] for r in x['incs'] if r['partner']))
        self.family = x['home'] == 'With family'
        self.move_out = (x.get('moveOut') or 0) if self.family else 0
        self.retired = self.work == 'Retired'
        share = 0.75 if X.get('ss') is None else X['ss']
        self.now = self.take if self.retired else sum(r['amt'] for r in x['incs'] if r['k'] == 'Retirement income')
        partner = sum(r['amt'] for r in x['incs'] if r['partner'])
        full = 0 if self.retired or self.age >= 67 else law.ss_estimate(max(0, self.own - self.now), max(self.ret_age, self.age)) + law.ss_estimate(partner, 67)
        self.ss = share * full
        pen = X.get('pen')
        self.pen = (pen['amt'], pen.get('age') or 65) if pen and pen.get('amt', 0) > 0 and not self.retired else None
        self.ends = [(e['amt'], e['yrs']) for e in (X.get('ends') or []) if e.get('amt', 0) > 0 and e.get('yrs', 0) > 0]
        h = X.get('home')
        if h and h.get('pmt', 0) > 0 and h.get('yrs', 0) > 0:
            self.ends.append((h['pmt'], h['yrs']))
        self.high_debts = [d for d in x['debts'] if d['high'] and d['amt'] > 0]

    def fi_need(self, at, monthly=0, passive=0):
        """Invested money that makes work optional at age `at`."""
        later = max(0, self.spend + monthly + self.move_out - sum(a for a, _ in self.ends))
        pays = self.now + self.ss + (self.pen[0] if self.pen else 0) + passive
        need = max(0, later - pays) * 12 / DRAW
        if self.ss > 0:
            need += annuity(67 - at) * min(self.ss, later) * 12
        if self.pen:
            need += annuity(self.pen[1] - at) * min(self.pen[0], later) * 12
        gone = max(0, at - self.age)
        for amt, yrs in self.ends:
            need += annuity(yrs - gone) * amt * 12
        return need


def fv(inv, yearly, n):
    g = (1 + GROW) ** n
    return inv * g + yearly * (g - 1) / GROW


def years_to(inv, yearly, goal, cap=80):
    """The first whole year the money reaches the goal, saving at each year's end. From the closed formula."""
    if inv >= goal:
        return 0
    lo = inv * GROW + yearly
    if lo <= 0:
        return None
    n = max(1, math.ceil(math.log((goal * GROW + yearly) / lo) / math.log(1 + GROW)))
    while n > 1 and fv(inv, yearly, n - 1) >= goal:
        n -= 1
    while fv(inv, yearly, n) < goal and n <= cap:
        n += 1
    return n if n <= cap else None


def clamp_stat(v):
    return max(8, min(20, jsround(v)))


def debt_rate(d):
    """One rule for a debt's yearly rate, in %: typed, else the middle of the band, else a guess by kind."""
    if d.get('rate') is not None:
        return d['rate']
    if d.get('apr') in BAND_MID:
        return BAND_MID[d['apr']]
    k = d['k'].lower()
    if 'payday' in k or 'cash advance' in k:
        return 300
    if 'famil' in k or 'friend' in k or 'medical' in k:
        return 0
    return 20 if d['high'] else 5


def level_payment(b, r, n):
    """The level amount whose n payments, each discounted at r a month, add up to the balance b."""
    return b / sum((1 + r) ** -k for k in range(1, n + 1))


def debt_payment(d):
    if d.get('pay') is not None:
        return d['pay']
    b, r, k = d['amt'] or 0, debt_rate(d) / 1200, d['k'].lower()
    if b <= 0:
        return 0
    if 'card' in k:
        return jsround(min(b, max(25, b * 0.01 + b * r)))
    n = 120 if 'student' in k else 60 if 'car' in k else 24 if ('famil' in k or 'friend' in k) else 4 if 'later' in k else 36
    return max(1, jsround(level_payment(b, r, n) if r > 0 else b / n))


def debt_plan(debts, order, extra):
    rows = [{'i': i, 'bal': d['amt'], 'apr': debt_rate(d) / 100, 'pay': debt_payment(d), 'owed': d['amt'], 'int': 0.0, 'off': None} for i, d in enumerate(debts) if d['amt'] > 0]
    if order == 'snowball':
        rows.sort(key=lambda r: (r['bal'], -r['apr']))
    else:
        rows.sort(key=lambda r: (-r['apr'], r['bal']))
    month, total = 0, 0.0
    live = lambda r: r['owed'] > 0.005
    while any(live(r) for r in rows) and month < 1200:
        month += 1
        free = (extra or 0) + sum(r['pay'] for r in rows if not live(r))
        for r in rows:
            if not live(r):
                continue
            interest = r['owed'] * r['apr'] / 12
            r['int'] += interest
            total += interest
            r['owed'] += interest
            paid = min(r['owed'], r['pay'])
            r['owed'] -= paid
            free += r['pay'] - paid
        for r in rows:
            if live(r) and free > 0:
                paid = min(r['owed'], free)
                r['owed'] -= paid
                free -= paid
        for r in rows:
            if not live(r) and r['off'] is None:
                r['off'] = month
    done = all(not live(r) for r in rows)
    return {'months': month if done else None, 'interest': total, 'rows': rows, 'paying': sum(r['pay'] for r in rows) + (extra or 0)}


def hi_rate(p):
    t = sum(d['amt'] for d in p.high_debts)
    if not t:
        return 22
    return max(8, min(400, sum(d['amt'] * debt_rate(d) for d in p.high_debts) / t))


def goal_sim(p, x, opt):
    """Month by month: goals take their share, then the cushion, the heavy debt, the full cushion, then investing."""
    X = p.X
    keep = 1 if opt.get('keep') is None else opt['keep']
    spend0 = p.spend + (opt.get('monthly') or 0)
    M = (p.take - spend0) * keep
    share = opt['share'] if opt.get('share') is not None else (0.5 if x.get('goalShare') is None else x['goalShare'])
    cash, inv, hi, owe, era, runway = x['cash'], p.inv, sum(d['amt'] for d in p.high_debts), opt.get('once') or 0, x['era'], None
    hr = hi_rate(p) / 1200
    lim = X['limit'] * 0.9 if (X.get('limit') or 0) > 0 else math.inf
    goals = [g for g in (x.get('goals') or []) if not g.get('done') and (g.get('era') is not None or opt.get('all'))]
    gs = sorted([{'id': g['id'], 'era': x['era'] if g.get('era') is None else g['era'], 'need': max(0, g['cost'] - (g.get('fund') or 0)), 'i': i} for i, g in enumerate(goals)], key=lambda g: (g['era'], g['i']))
    era_at, goal_at = {}, {}
    target = min(max(1, p.age / 5) * spend0, lim)
    first = min(1000, lim)
    to_ret = max(0, p.ret_age - p.age)
    need_ret = p.fi_need(max(p.age, p.ret_age), opt.get('monthly') or 0, opt.get('passive') or 0)
    for g in gs:
        if g['need'] <= 0:
            goal_at[g['id']] = 0

    def chain(m):
        left = max(0, to_ret - m / 12)
        gates = [cash >= first, True, hi <= 0.5, cash >= target - 0.5, True,
                 fv(inv, p.law.ira, jsround(left)) >= need_ret,
                 inv >= need_ret / (1 + GROW) ** left,
                 inv >= p.fi_need(p.age + m / 12, opt.get('monthly') or 0, opt.get('passive') or 0)]
        e = 0
        for k, ok in enumerate(gates, start=1):
            if not ok:
                break
            e = k
        return e

    e0 = chain(0)
    for k in range(era + 1, e0 + 1):
        era_at[k] = 0
    era = max(era, e0)
    last_end = max([yrs * 12 for _, yrs in p.ends], default=0)
    for m in range(1, 601):
        s = M + sum(a for a, yrs in p.ends if m > yrs * 12) * keep
        if hi > 0:
            hi *= 1 + hr
        if s < 0:
            if p.retired:
                inv += s
                if inv < 0:
                    cash += inv
                    inv = 0
            else:
                cash += s
            if cash < 0:
                hi -= cash
                cash = 0
            if runway is None and cash <= 0:
                runway = m
            inv *= 1 + MONTH
            if m > last_end and (runway is not None or m > 240):
                break
            continue
        if owe > 0:
            u = min(owe, s)
            owe -= u
            s -= u
        act = [g for g in gs if g['need'] > 0 and g['era'] <= era]
        pot = s * share if act else 0
        rest, used, pot0 = s - pot, 0, pot
        for g in act:
            if pot <= 0:
                continue
            u = min(g['need'], pot)
            if u >= g['need'] - 1e-9:
                goal_at[g['id']] = m - 1 + (used + u) / pot0
            g['need'] -= u
            pot -= u
            used += u
        rest += pot
        for want in ('first', 'debt', 'target'):
            if want == 'debt':
                u = min(hi, rest)
                hi -= u
            else:
                u = min(max(0, (first if want == 'first' else target) - cash), rest)
                cash += u
            rest -= u
        inv = inv * (1 + MONTH) + rest
        e = chain(m)
        if e > era:
            for k in range(era + 1, e + 1):
                era_at[k] = m
            era = e
        if era >= 8 and all(g['need'] <= 0 for g in gs):
            break
        if s == 0 and inv <= 0 and owe <= 0 and m > last_end:
            break
    return {'M': M, 'eraAt': era_at, 'goalAt': goal_at, 'share': share, 'runway': runway}


def cash_calendar(p, x):
    cal, F, rows = x['cal'], x.get('incFreq') or {}, x['incs']
    row = lambda k: next((r['amt'] for r in x['spends'] if r['k'] == k), 0)
    home, bills = row('Home'), row('Bills and subscriptions')
    mins = sum(max(25, d['amt'] * 0.025) for d in x['debts'] if d['amt'] > 0)
    S, V = cal.get('src') or {}, cal.get('vary') or {}
    src = []
    for r in rows:
        f = F.get(r['k']) or x['payFreq']
        vary = bool(V[r['k']]) if r['k'] in V else (r['k'] not in S and f == 'It varies')
        daily = r['k'] not in S and not vary and f == 'Daily'
        days = S[r['k']] if r['k'] in S else [] if vary or daily else FREQ_DAYS.get(f) or FREQ_DAYS.get(x['payFreq']) or [1, 15]
        src.append((r['amt'], days, daily, vary))
    counted = [s for s in src if not s[3] and (s[2] or s[1])]
    rent, bill_days, debt_days = cal.get('rent') or [], cal.get('bills') or [], cal.get('debt') or []
    lump = (home if rent else 0) + (bills if bill_days else 0)
    drip = max(0, p.spend - lump) / 31
    bal = start = max(0, p.cash)
    low, out_bal = (0, bal), []
    for day in range(1, 32):
        came = sum(a / 31 if daily else (a / len(days) if day in days else 0) for a, days, daily, _ in counted)
        went = drip + (home / len(rent) if day in rent else 0) + (bills / len(bill_days) if day in bill_days else 0) + (mins / len(debt_days) if day in debt_days else 0)
        bal += came - went
        out_bal.append(bal)
        if bal < low[1]:
            low = (day, bal)
    return {'start': start, 'end': bal, 'mins': mins, 'low': low, 'tight': low[1] < 0, 'inc': sum(s[0] for s in counted), 'bal': out_bal}


def game_check(fn, x, o, ck, law):
    """One case of the game's math. Returns False when fn is not a game function."""
    if not fn.startswith('g') or fn[1:2].islower():
        return False
    p = Player(x, law)
    if fn == 'gDerive':
        ck('take-home', o['take'], p.take); ck('spending', o['spend'], p.spend); ck('cash', o['cash'], p.cash)
        nw = p.cash + p.inv - p.debt
        ck('net worth', o['nw'], nw)
        fi_spend = (p.spend + p.move_out) * 12
        ck('a year of spending', o['fiSpend'], fi_spend); ck('FI number before what pays you anyway', o['fiBase'], fi_spend / DRAW)
        fi = p.fi_need(p.age)
        ck('FI number', o['fi'], fi)
        ck('FI number at the stop age', o['fiRet'], p.fi_need(max(p.age, p.ret_age)))
        if o.get('fi50') is not None:
            ck('FI number at 50', o['fi50'], p.fi_need(50))
        save = max(0, (p.take - p.spend) * 12)
        ck('saved a year', o['save'], save)
        rate = max(0, (p.take - p.spend) / p.take) if p.take > 0 else 0
        ck('savings rate', o['rate'], rate, 1e-9)
        ck('% of the way', o['pct'], max(0, min(100, nw / fi * 100)) if fi > 0 else 0, 1e-6)
        yrs = years_to(p.inv, save, fi)
        ck('years to FI', o['yrs'], yrs, 0)
        ck('age at FI', o['etaAge'], None if yrs is None else p.age + yrs, 0)
        to_ret = max(0, p.ret_age - p.age)
        ck('Coast FI number', o['coastNum'], p.fi_need(max(p.age, p.ret_age)) / (1 + GROW) ** to_ret)
        ck('months of cushion to aim for', o['target'], max(1, p.age / 5), 1e-9)
        varies = x['steady'] != 'Steady'
        low_gap = max(0, p.spend - (x['low'] or 0)) if varies else 0
        ck('short in a low month', o['lowGap'], low_gap)
        ck('low months the cash covers', o['lowCover'], p.cash / low_gap if low_gap > 0 else None, 1e-6)
        per = PERIODS.get(x['payFreq'], 12)
        ck('pay a period', o['perPay'], p.take * 12 / per); ck('spending a period', o['perSpend'], p.spend * 12 / per)
        ck('left a period', o['left'], (p.take - p.spend) * 12 / per)
        heavy = any(d['high'] and d['amt'] > 0 for d in x['debts'])
        mine = {'STR': clamp_stat(8 + p.take / 800), 'CON': clamp_stat(8 + rate * 40),
                'DEX': clamp_stat(18 - p.debt / max(1, p.take * 12) * 20 - (2 if heavy else 0)),
                'CHA': clamp_stat(10 + (2 if x['samePage'] == 'Yes' else 0) + (3 if x['adv'] == 'A strong network' else 0))}
        for k, v in o['stats']:
            ck('stat ' + k, v, mine[k], 0)
        if p.age < 35 and yrs is not None:
            late = years_to(0, save, fi)
            ck('years gained by starting before 35', o['sparksGain'], None if late is None else 35 + late - (p.age + yrs), 0)
        else:
            ck('years gained by starting before 35', o['sparksGain'], None)
        ck('Social Security estimate at 67', o['ss'][0], law.ss_estimate(p.take, 67), 0)
        ck('Social Security estimate, half the pay, stop at 40', o['ss'][1], law.ss_estimate(p.take / 2, 40), 0)
    elif fn == 'gDebtPlan':
        P = debt_plan(x['debts'], x['order'], x['extra'])
        ck('months to debt free', o['months'], P['months'], 0); ck('interest', o['interest'], P['interest'])
        ck('paid each month', o['paying'], P['paying'])
        ck('first in line', o['first'], P['rows'][0]['i'] if P['rows'] else None, 0)
        by = {r['i']: r for r in P['rows']}
        for i, off, interest in o['each']:
            ck(f'debt {i} gone in month', off, by[i]['off'], 0); ck(f'debt {i} interest', interest, by[i]['int'])
    elif fn == 'gDebtExtra':
        cap = max(10, sum(d['amt'] for d in x['debts'] if d['amt'] > 0))
        ends = lambda e: (lambda q: q['months'] is not None and q['months'] <= x['target'])(debt_plan(x['debts'], x['order'], e))
        if o is None:
            ck('no extra up to the cap is enough', False, ends(cap))
        else:
            ck('the extra ends the debts in time', True, ends(o['extra']))
            ck('a dollar less does not', True, o['extra'] == 0 or not ends(o['extra'] - 1))
            ck('months with that extra', o['months'], debt_plan(x['debts'], x['order'], o['extra'])['months'], 0)
    elif fn == 'gTimeLedger':
        h = x.get('hrs') or {}
        w, cm = (40 if h.get('w') is None else h['w']), (4 if h.get('cm') is None else h['cm'])
        pay = sum(r['amt'] for r in x['incs'] if not r['partner'] and r['k'] in WORK)
        wage = pay * 12 / 52 / (w + cm) if p.work != 'Retired' and w > 0 and pay > 0 and w + cm > 0 else 0
        mw = p.inv * GROW / (365 * 24)
        dy = sum(d['amt'] * debt_rate(d) / 100 for d in x['debts'] if d['amt'] > 0)
        ck('an hour of work', o['wage'], wage, 0.01); ck('what investments earn an hour', o['mw'], mw, 1e-6)
        ck('what debt costs a year', o['dy'], dy); ck('what debt costs an hour', o['dc'], dy / 8760, 1e-6)
        ck('the hour, net', o['net'], mw - dy / 8760, 1e-6)
        ck('minutes of work a day the money earns', o['minsDay'], mw * 24 / wage * 60 if wage > 0 else 0, 0.01)
        ck('invested money that earns the wage', o['crossInv'], wage * 8760 / GROW if wage > 0 else None)
        ck('the money out-earns the work', o['cross'], wage > 0 and mw >= wage)
        ck('share of take-home the money covers', o['covers'], p.inv * GROW / 12 / p.take if p.take > 0 else 0, 1e-9)
    elif fn == 'gDebtOutlook':
        bal = sum(d['amt'] for d in p.high_debts)
        if bal <= 0:
            ck('no heavy debt card', o, None)
            return True
        hr = hi_rate(p)
        r, M = hr / 1200, p.take - p.spend
        five = jsround(level_payment(bal, r, 60) - (bal * r + bal * 0.01)) if r > 0 else jsround(bal / 60 - bal * 0.01)
        ck('heavy debt', o['bal'], bal); ck('its rate', o['rate'], hr, 1e-9); ck('interest a month', o['int'], jsround(bal * r), 0)
        if M < 0:
            ck('it grows', o['grow'], True); ck('more a month to clear it in 5 years', o['five'], max(0, five), 0)
        else:
            b, m = bal, 0
            while b > 50 and m < 720:
                b -= max(25, b * 0.01) + M  # the minimum and the money left, after the month's interest is paid
                m += 1
            ck('months to clear it', o['mo'], m, 0); ck('more a month to clear it in 5 years', o['five'], max(0, five - M), 0)
    elif fn == 'gCashCal':
        K = cash_calendar(p, x)
        for k in ('start', 'end', 'mins', 'inc'):
            ck(k, o[k], K[k])
        ck('lowest day', o['low'][0], K['low'][0], 0); ck('lowest balance', o['low'][1], K['low'][1]); ck('tight', o['tight'], K['tight'])
        for day, (a, b) in enumerate(zip(o['bal'], K['bal']), start=1):
            if not ck(f'balance on day {day}', a, b):
                break
    elif fn == 'gGoalSim':
        S = goal_sim(p, x, x['opt'])
        ck('left a month', o['M'], S['M']); ck('share to goals', o['share'], S['share'], 1e-9)
        ck('runway month', o['runway'], S['runway'], 0)
        for k in set(o['eraAt']) | {str(k) for k in S['eraAt']}:
            ck(f'era {k} month', o['eraAt'].get(k), S['eraAt'].get(int(k)), 0)
        for k in set(o['goalAt']) | set(S['goalAt']):
            ck(f'goal {k} month', o['goalAt'].get(k), S['goalAt'].get(k), 0.01)
        ck('work optional, month', o['freeAt'], 0 if x['era'] >= 8 else S['eraAt'].get(8), 0)
    else:
        return False
    return True
